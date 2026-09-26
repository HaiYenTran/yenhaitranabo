const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'no-referrer'
};

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
const VALID_ROLES = new Set(['owner', 'admin', 'member']);
const VALID_CATEGORIES = new Set(['amway-present-value', 'wellness-sources', 'self-improve']);
const VALID_ACCESS_LEVELS = new Set(['member', 'admin']);

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function safeFileName(value) {
  return String(value || 'document.pdf').replace(/[\r\n"\\/]/g, '_').slice(0, 180);
}

async function identityFromAccess(ctx) {
  if (!ctx.access) return null;
  const identity = await ctx.access.getIdentity();
  const email = normalizeEmail(identity?.email);
  return email ? { email, id: identity?.user_uuid || identity?.id || '' } : null;
}

async function memberForEmail(env, email) {
  return env.DB.prepare('SELECT id, email, display_name, role, active FROM members WHERE email = ? COLLATE NOCASE')
    .bind(email)
    .first();
}

async function requireMember(env, ctx) {
  const identity = await identityFromAccess(ctx);
  if (!identity) return { error: json({ ok: false, code: 'access_required', message: 'Cần đăng nhập qua Cloudflare Access.' }, 401) };
  const member = await memberForEmail(env, identity.email);
  if (!member || member.active !== 1) {
    return { error: json({ ok: false, code: 'member_not_active', message: 'Email này chưa được cấp quyền thành viên.' }, 403) };
  }
  return { identity, member };
}

function isAdmin(member) {
  return member.role === 'owner' || member.role === 'admin';
}

async function requireAdmin(env, ctx) {
  const access = await requireMember(env, ctx);
  if (access.error) return access;
  if (!isAdmin(access.member)) return { error: json({ ok: false, code: 'admin_required', message: 'Bạn không có quyền quản trị.' }, 403) };
  return access;
}

async function parseJson(request) {
  const contentType = request.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) throw new Error('invalid_content_type');
  return request.json();
}

async function listDocuments(env, member) {
  const roleFilter = isAdmin(member) ? "access_level IN ('member', 'admin')" : "access_level = 'member'";
  const result = await env.DB.prepare(
    `SELECT id, title, description, category, source_label, file_name, mime_type, size_bytes, access_level, object_key IS NOT NULL AS file_ready, updated_at
     FROM documents WHERE active = 1 AND ${roleFilter} ORDER BY category, updated_at DESC, id DESC`
  ).all();
  return result.results || [];
}

async function logAccess(env, email, action, documentId = null, detail = '') {
  await env.DB.prepare('INSERT INTO access_logs (member_email, action, document_id, detail) VALUES (?, ?, ?, ?)')
    .bind(email, action, documentId, String(detail || '').slice(0, 500))
    .run();
}

async function routeSession(env, ctx) {
  const access = await requireMember(env, ctx);
  if (access.error) return access.error;
  return json({
    ok: true,
    member: {
      email: access.member.email,
      displayName: access.member.display_name,
      role: access.member.role,
      isAdmin: isAdmin(access.member)
    }
  });
}

async function routeDocuments(env, ctx) {
  const access = await requireMember(env, ctx);
  if (access.error) return access.error;
  return json({ ok: true, documents: await listDocuments(env, access.member) });
}

async function routeDocumentContent(env, ctx, id) {
  const access = await requireMember(env, ctx);
  if (access.error) return access.error;
  const document = await env.DB.prepare(
    'SELECT id, title, object_key, file_name, mime_type, access_level, active FROM documents WHERE id = ?'
  ).bind(id).first();
  if (!document || document.active !== 1 || !document.object_key) return json({ ok: false, message: 'Không tìm thấy tài liệu.' }, 404);
  if (document.access_level === 'admin' && !isAdmin(access.member)) return json({ ok: false, message: 'Bạn không có quyền xem tài liệu này.' }, 403);

  const object = await env.MEMBER_FILES.get(document.object_key);
  if (!object) return json({ ok: false, message: 'Tệp chưa có trong kho lưu trữ.' }, 404);
  await logAccess(env, access.member.email, 'document_open', document.id);

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('content-type', document.mime_type || headers.get('content-type') || 'application/octet-stream');
  headers.set('content-disposition', `inline; filename="${safeFileName(document.file_name)}"`);
  headers.set('cache-control', 'private, no-store, max-age=0');
  headers.set('x-content-type-options', 'nosniff');
  headers.set('content-security-policy', "default-src 'none'; frame-ancestors 'self'");
  return new Response(object.body, { headers });
}

async function routeAdminMembers(request, env, ctx) {
  const access = await requireAdmin(env, ctx);
  if (access.error) return access.error;
  if (request.method === 'GET') {
    const result = await env.DB.prepare(
      'SELECT id, email, display_name, role, active, created_at, updated_at FROM members ORDER BY role, display_name, email'
    ).all();
    return json({ ok: true, members: result.results || [] });
  }
  if (request.method !== 'POST') return json({ ok: false, message: 'Phương thức không được hỗ trợ.' }, 405);

  let body;
  try { body = await parseJson(request); } catch { return json({ ok: false, message: 'Dữ liệu gửi lên không hợp lệ.' }, 400); }
  const email = normalizeEmail(body.email);
  const name = String(body.displayName || '').trim().slice(0, 120);
  const role = String(body.role || 'member');
  if (!validEmail(email) || !VALID_ROLES.has(role)) return json({ ok: false, message: 'Email hoặc vai trò không hợp lệ.' }, 400);
  if (role === 'owner') return json({ ok: false, message: 'Không thể tạo thêm chủ sở hữu từ giao diện này.' }, 400);
  if (role === 'admin' && access.member.role !== 'owner') return json({ ok: false, message: 'Chỉ chủ sở hữu mới được tạo quản trị viên.' }, 403);

  await env.DB.prepare(
    `INSERT INTO members (email, display_name, role, active) VALUES (?, ?, ?, 1)
     ON CONFLICT(email) DO UPDATE SET display_name = excluded.display_name, role = excluded.role, active = 1, updated_at = CURRENT_TIMESTAMP`
  ).bind(email, name, role).run();
  await logAccess(env, access.member.email, 'member_upsert', null, `${email}:${role}`);
  return json({ ok: true }, 201);
}

async function routeAdminMemberUpdate(request, env, ctx, id) {
  const access = await requireAdmin(env, ctx);
  if (access.error) return access.error;
  if (request.method !== 'PATCH') return json({ ok: false, message: 'Phương thức không được hỗ trợ.' }, 405);
  let body;
  try { body = await parseJson(request); } catch { return json({ ok: false, message: 'Dữ liệu gửi lên không hợp lệ.' }, 400); }
  const current = await env.DB.prepare('SELECT id, email, role FROM members WHERE id = ?').bind(id).first();
  if (!current) return json({ ok: false, message: 'Không tìm thấy thành viên.' }, 404);
  if (current.role === 'owner') return json({ ok: false, message: 'Không thể sửa tài khoản chủ sở hữu tại đây.' }, 400);

  const role = body.role === undefined ? current.role : String(body.role);
  const active = body.active === undefined ? 1 : (body.active ? 1 : 0);
  if (!VALID_ROLES.has(role) || role === 'owner') return json({ ok: false, message: 'Vai trò không hợp lệ.' }, 400);
  if (role === 'admin' && access.member.role !== 'owner') return json({ ok: false, message: 'Chỉ chủ sở hữu mới được cấp quyền quản trị.' }, 403);
  await env.DB.prepare('UPDATE members SET role = ?, active = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .bind(role, active, id).run();
  await logAccess(env, access.member.email, 'member_update', null, `${current.email}:${role}:${active}`);
  return json({ ok: true });
}

async function routeAdminDocuments(request, env, ctx) {
  const access = await requireAdmin(env, ctx);
  if (access.error) return access.error;
  if (request.method === 'GET') return json({ ok: true, documents: await listDocuments(env, access.member) });
  if (request.method !== 'POST') return json({ ok: false, message: 'Phương thức không được hỗ trợ.' }, 405);

  let body;
  try { body = await parseJson(request); } catch { return json({ ok: false, message: 'Dữ liệu gửi lên không hợp lệ.' }, 400); }
  const title = String(body.title || '').trim().slice(0, 240);
  const description = String(body.description || '').trim().slice(0, 1000);
  const category = String(body.category || '');
  const sourceLabel = String(body.sourceLabel || '').trim().slice(0, 240);
  const accessLevel = String(body.accessLevel || 'member');
  if (!title || !VALID_CATEGORIES.has(category) || !VALID_ACCESS_LEVELS.has(accessLevel)) {
    return json({ ok: false, message: 'Tên, nhóm hoặc quyền tài liệu không hợp lệ.' }, 400);
  }
  const result = await env.DB.prepare(
    'INSERT INTO documents (title, description, category, source_label, access_level, created_by) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(title, description, category, sourceLabel, accessLevel, access.member.email).run();
  await logAccess(env, access.member.email, 'document_create', result.meta.last_row_id, title);
  return json({ ok: true, id: result.meta.last_row_id }, 201);
}

async function routeAdminDocumentFile(request, env, ctx, id) {
  const access = await requireAdmin(env, ctx);
  if (access.error) return access.error;
  if (request.method !== 'PUT') return json({ ok: false, message: 'Phương thức không được hỗ trợ.' }, 405);
  const declaredLength = Number(request.headers.get('content-length') || 0);
  if (declaredLength > MAX_UPLOAD_BYTES) return json({ ok: false, message: 'Tệp phải có dung lượng từ 1 byte đến 25 MB.' }, 413);
  const document = await env.DB.prepare('SELECT id, category FROM documents WHERE id = ? AND active = 1').bind(id).first();
  if (!document) return json({ ok: false, message: 'Không tìm thấy tài liệu.' }, 404);

  const file = await request.arrayBuffer();
  const length = file.byteLength;
  if (!length || length > MAX_UPLOAD_BYTES) return json({ ok: false, message: 'Tệp phải có dung lượng từ 1 byte đến 25 MB.' }, 413);
  const fileName = safeFileName(request.headers.get('x-file-name') || 'document.pdf');
  const mimeType = request.headers.get('content-type') || 'application/octet-stream';
  const objectKey = `${document.category}/${id}/${crypto.randomUUID()}-${fileName}`;
  await env.MEMBER_FILES.put(objectKey, file, { httpMetadata: { contentType: mimeType } });
  await env.DB.prepare(
    'UPDATE documents SET object_key = ?, file_name = ?, mime_type = ?, size_bytes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
  ).bind(objectKey, fileName, mimeType, length, id).run();
  await logAccess(env, access.member.email, 'document_upload', id, fileName);
  return json({ ok: true });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';
    if (!path.startsWith('/member-api')) return json({ ok: false, message: 'Không tìm thấy.' }, 404);

    try {
      if (path === '/member-api/session' && request.method === 'GET') return routeSession(env, ctx);
      if (path === '/member-api/documents' && request.method === 'GET') return routeDocuments(env, ctx);

      let match = path.match(/^\/member-api\/documents\/(\d+)\/content$/);
      if (match && request.method === 'GET') return routeDocumentContent(env, ctx, Number(match[1]));

      if (path === '/member-api/admin/members') return routeAdminMembers(request, env, ctx);
      match = path.match(/^\/member-api\/admin\/members\/(\d+)$/);
      if (match) return routeAdminMemberUpdate(request, env, ctx, Number(match[1]));

      if (path === '/member-api/admin/documents') return routeAdminDocuments(request, env, ctx);
      match = path.match(/^\/member-api\/admin\/documents\/(\d+)\/file$/);
      if (match) return routeAdminDocumentFile(request, env, ctx, Number(match[1]));

      return json({ ok: false, message: 'Không tìm thấy endpoint.' }, 404);
    } catch (error) {
      console.error('member-library-error', error);
      return json({ ok: false, message: 'Hệ thống tạm thời không xử lý được yêu cầu.' }, 500);
    }
  }
};
