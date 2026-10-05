const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'no-referrer'
};

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
const SESSION_COOKIE = 'yen_member_session';
const SESSION_DAYS = 7;
const PASSWORD_ITERATIONS = 100000;
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 15;
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

function bytesToHex(bytes) {
  return Array.from(bytes).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function randomHex(length = 32) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
}

async function sha256(value) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return bytesToHex(new Uint8Array(digest));
}

async function passwordHash(password, salt, iterations = PASSWORD_ITERATIONS) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({
    name: 'PBKDF2',
    hash: 'SHA-256',
    salt: new TextEncoder().encode(salt),
    iterations
  }, key, 256);
  return bytesToHex(new Uint8Array(bits));
}

function constantTimeEqual(a, b) {
  const left = String(a || '');
  const right = String(b || '');
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return difference === 0;
}

function cookieValue(request, name) {
  const cookie = request.headers.get('cookie') || '';
  const item = cookie.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
  return item ? decodeURIComponent(item.slice(name.length + 1)) : '';
}

function sessionCookie(token, maxAge) {
  return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Strict`;
}

function requestOriginAllowed(request) {
  const origin = request.headers.get('origin');
  return !origin || origin === new URL(request.url).origin;
}

async function sessionMember(request, env) {
  const token = cookieValue(request, SESSION_COOKIE);
  if (!token || token.length !== 64) return null;
  const tokenHash = await sha256(token);
  const member = await env.DB.prepare(
    `SELECT m.id, m.email, m.username, m.display_name, m.role, m.active, s.token_hash
     FROM member_sessions s JOIN members m ON m.id = s.member_id
     WHERE s.token_hash = ? AND s.expires_at > CURRENT_TIMESTAMP`
  ).bind(tokenHash).first();
  if (!member || member.active !== 1) return null;
  await env.DB.prepare('UPDATE member_sessions SET last_seen_at = CURRENT_TIMESTAMP WHERE token_hash = ?').bind(tokenHash).run();
  return member;
}

async function memberForEmail(env, email) {
  return env.DB.prepare('SELECT id, email, display_name, role, active FROM members WHERE email = ? COLLATE NOCASE')
    .bind(email)
    .first();
}

async function requireMember(request, env) {
  const member = await sessionMember(request, env);
  if (!member) return { error: json({ ok: false, code: 'login_required', message: 'Cần đăng nhập tài khoản thành viên.' }, 401) };
  return { member };
}

function isAdmin(member) {
  return member.role === 'owner' || member.role === 'admin';
}

async function requireAdmin(request, env) {
  const access = await requireMember(request, env);
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

async function routeLogin(request, env) {
  if (!requestOriginAllowed(request)) return json({ ok: false, message: 'Nguồn yêu cầu không hợp lệ.' }, 403);
  let body;
  try { body = await parseJson(request); } catch { return json({ ok: false, message: 'Dữ liệu đăng nhập không hợp lệ.' }, 400); }
  const identifier = String(body.identifier || '').trim().toLowerCase().slice(0, 160);
  const password = String(body.password || '');
  if (!identifier || password.length < 8 || password.length > 200) return json({ ok: false, message: 'Tên đăng nhập hoặc mật khẩu không đúng.' }, 401);

  const member = await env.DB.prepare(
    `SELECT id, email, username, display_name, role, active, password_hash, password_salt,
            password_iterations, failed_attempts, locked_until
     FROM members WHERE email = ? COLLATE NOCASE OR username = ? COLLATE NOCASE LIMIT 1`
  ).bind(identifier, identifier).first();
  const locked = member?.locked_until && new Date(member.locked_until).getTime() > Date.now();
  if (!member || member.active !== 1 || !member.password_hash || !member.password_salt || locked) {
    return json({ ok: false, message: locked ? 'Tài khoản tạm khóa 15 phút vì nhập sai nhiều lần.' : 'Tên đăng nhập hoặc mật khẩu không đúng.' }, locked ? 429 : 401);
  }
  const computed = await passwordHash(password, member.password_salt, Number(member.password_iterations || PASSWORD_ITERATIONS));
  if (!constantTimeEqual(computed, member.password_hash)) {
    const failures = Number(member.failed_attempts || 0) + 1;
    await env.DB.prepare(
      `UPDATE members SET failed_attempts = ?, locked_until = CASE WHEN ? >= ? THEN datetime('now', '+' || ? || ' minutes') ELSE NULL END,
       updated_at = CURRENT_TIMESTAMP WHERE id = ?`
    ).bind(failures, failures, MAX_FAILED_ATTEMPTS, LOCK_MINUTES, member.id).run();
    return json({ ok: false, message: failures >= MAX_FAILED_ATTEMPTS ? 'Tài khoản tạm khóa 15 phút vì nhập sai nhiều lần.' : 'Tên đăng nhập hoặc mật khẩu không đúng.' }, failures >= MAX_FAILED_ATTEMPTS ? 429 : 401);
  }

  await env.DB.prepare('UPDATE members SET failed_attempts = 0, locked_until = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?').bind(member.id).run();
  await env.DB.prepare('DELETE FROM member_sessions WHERE expires_at <= CURRENT_TIMESTAMP OR member_id = ?').bind(member.id).run();
  const token = randomHex(32);
  const tokenHash = await sha256(token);
  await env.DB.prepare(
    `INSERT INTO member_sessions (token_hash, member_id, expires_at, user_agent)
     VALUES (?, ?, datetime('now', '+' || ? || ' days'), ?)`
  ).bind(tokenHash, member.id, SESSION_DAYS, String(request.headers.get('user-agent') || '').slice(0, 300)).run();
  const response = json({ ok: true, member: { displayName: member.display_name, role: member.role, isAdmin: isAdmin(member) } });
  response.headers.set('set-cookie', sessionCookie(token, SESSION_DAYS * 86400));
  return response;
}

async function routeLogout(request, env) {
  if (!requestOriginAllowed(request)) return json({ ok: false, message: 'Nguồn yêu cầu không hợp lệ.' }, 403);
  const token = cookieValue(request, SESSION_COOKIE);
  if (token) await env.DB.prepare('DELETE FROM member_sessions WHERE token_hash = ?').bind(await sha256(token)).run();
  const response = json({ ok: true });
  response.headers.set('set-cookie', sessionCookie('', 0));
  return response;
}

async function routeSession(request, env) {
  const access = await requireMember(request, env);
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

async function routeDocuments(request, env) {
  const access = await requireMember(request, env);
  if (access.error) return access.error;
  return json({ ok: true, documents: await listDocuments(env, access.member) });
}

async function routeDocumentContent(request, env, id) {
  const access = await requireMember(request, env);
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

async function routeAdminMembers(request, env) {
  const access = await requireAdmin(request, env);
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

async function routeAdminMemberUpdate(request, env, id) {
  const access = await requireAdmin(request, env);
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

async function routeAdminDocuments(request, env) {
  const access = await requireAdmin(request, env);
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

async function routeAdminDocumentFile(request, env, id) {
  const access = await requireAdmin(request, env);
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
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';
    if (path === '/about.html' || path === '/hanh-trinh-song-khoe-chu-dong.html') {
      return Response.redirect('https://yenhaitran.com/yen_journey.html', 301);
    }
    if (!path.startsWith('/member-api')) return json({ ok: false, message: 'Không tìm thấy.' }, 404);

    try {
      if (path === '/member-api/login' && request.method === 'POST') return routeLogin(request, env);
      if (path === '/member-api/logout' && request.method === 'POST') return routeLogout(request, env);
      if (path === '/member-api/session' && request.method === 'GET') return routeSession(request, env);
      if (path === '/member-api/documents' && request.method === 'GET') return routeDocuments(request, env);

      let match = path.match(/^\/member-api\/documents\/(\d+)\/content$/);
      if (match && request.method === 'GET') return routeDocumentContent(request, env, Number(match[1]));

      if (path === '/member-api/admin/members') return routeAdminMembers(request, env);
      match = path.match(/^\/member-api\/admin\/members\/(\d+)$/);
      if (match) return routeAdminMemberUpdate(request, env, Number(match[1]));

      if (path === '/member-api/admin/documents') return routeAdminDocuments(request, env);
      match = path.match(/^\/member-api\/admin\/documents\/(\d+)\/file$/);
      if (match) return routeAdminDocumentFile(request, env, Number(match[1]));

      return json({ ok: false, message: 'Không tìm thấy endpoint.' }, 404);
    } catch (error) {
      console.error('member-library-error', error);
      return json({ ok: false, message: 'Hệ thống tạm thời không xử lý được yêu cầu.' }, 500);
    }
  }
};
