import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = process.cwd();
const skip = new Set(['.git', 'node_modules']);
const files = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (skip.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.endsWith('.html')) files.push(path.relative(root, full).replaceAll(path.sep, '/'));
  }
}

walk(root);
files.sort((a, b) => a.localeCompare(b, 'vi'));

const topLevelOfficial = new Set([
  'index.html', 'about.html', 'contact.html', 'events.html', 'gioi-thieu-yen-tran.html',
  'khao-sat-co-hoi.html', 'kiem-soat-can-nang.html', '404.html'
]);

const byBase = new Map();
for (const file of files) {
  const base = path.basename(file).toLowerCase();
  if (!byBase.has(base)) byBase.set(base, []);
  byBase.get(base).push(file);
}

function preferred(group) {
  const explicit = group.find((file) => topLevelOfficial.has(file));
  if (explicit) return explicit;
  return [...group].sort((a, b) => {
    const aNested = a.startsWith('pages/') ? 0 : 1;
    const bNested = b.startsWith('pages/') ? 0 : 1;
    return aNested - bNested || a.length - b.length || a.localeCompare(b);
  })[0];
}

const rows = files.map((file) => {
  const html = fs.readFileSync(path.join(root, file), 'utf8');
  const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '').replace(/\s+/g, ' ').trim();
  const canonical = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)/i)?.[1] || '';
  const description = (html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)/i)?.[1] || '').trim();
  const hash = crypto.createHash('sha256').update(html.replace(/\s+/g, ' ').trim()).digest('hex').slice(0, 12);
  const group = byBase.get(path.basename(file).toLowerCase()) || [];
  const target = group.length > 1 ? preferred(group) : '';
  const isDuplicate = group.length > 1 && file !== target;
  return {
    url: '/' + file,
    title,
    canonical,
    description: description ? 'Có' : 'Thiếu',
    bytes: Buffer.byteLength(html),
    hash,
    duplicateGroup: group.length > 1 ? path.basename(file) : '',
    proposedStatus: isDuplicate ? 'Chuyển hướng sau khi duyệt' : 'Giữ / cần duyệt nội dung',
    proposedTarget: isDuplicate ? '/' + target : '',
    reason: isDuplicate ? `Trùng tên file với ${group.length - 1} URL khác` : 'Chưa phát hiện trùng tên file'
  };
});

const exactGroups = new Map();
for (const row of rows) {
  if (!exactGroups.has(row.hash)) exactGroups.set(row.hash, []);
  exactGroups.get(row.hash).push(row.url);
}
for (const row of rows) {
  const exact = exactGroups.get(row.hash);
  if (exact.length > 1) row.reason += `; nội dung giống hệt ${exact.length - 1} URL khác`;
}

const csvEscape = (value) => `"${String(value).replaceAll('"', '""')}"`;
const headers = ['URL', 'Tiêu đề', 'Canonical', 'Meta description', 'Dung lượng byte', 'Hash', 'Nhóm trùng', 'Đề xuất', 'Đích chuyển hướng', 'Lý do'];
const csv = [headers, ...rows.map((r) => [r.url, r.title, r.canonical, r.description, r.bytes, r.hash, r.duplicateGroup, r.proposedStatus, r.proposedTarget, r.reason])]
  .map((line) => line.map(csvEscape).join(',')).join('\n') + '\n';

const redirectRows = rows.filter((row) => row.proposedTarget);
const exactDuplicateSets = [...exactGroups.values()].filter((group) => group.length > 1);
const markdown = `# Danh mục nội dung website\n\n` +
  `Cập nhật tự động: ${new Date().toISOString().slice(0, 10)}\n\n` +
  `- Tổng số trang HTML: **${rows.length}**\n` +
  `- URL có khả năng là bản cũ do trùng tên file: **${redirectRows.length}**\n` +
  `- Nhóm có nội dung giống hệt nhau: **${exactDuplicateSets.length}**\n` +
  `- Trạng thái hiện tại: **chỉ kiểm kê và đề xuất; chưa xóa trang, chưa kích hoạt chuyển hướng**.\n\n` +
  `## Bảng URL cũ → URL đề xuất\n\n` +
  `| URL cũ | URL đề xuất giữ lại | Lý do |\n|---|---|---|\n` +
  (redirectRows.length ? redirectRows.map((r) => `| \`${r.url}\` | \`${r.proposedTarget}\` | ${r.reason} |`).join('\n') : '| — | — | Chưa có |') +
  `\n\n## Nguyên tắc duyệt trước khi chuyển hướng\n\n` +
  `1. Mở cả URL cũ và URL đề xuất, kiểm tra nội dung, ảnh, liên kết và ngày cập nhật.\n` +
  `2. Nếu bản cũ có nội dung riêng, gộp phần còn thiếu vào trang chính thức trước.\n` +
  `3. Chỉ tạo chuyển hướng 301 sau khi chủ website xác nhận từng nhóm.\n` +
  `4. Không xóa file cũ trong giai đoạn kiểm kê.\n` +
  `5. Vì website hiện được phục vụ từ GitHub Pages qua Cloudflare, chuyển hướng 301 nên cấu hình tại Cloudflare Redirect Rules/Bulk Redirects, không dùng JavaScript.\n\n` +
  `Bảng đầy đủ cho toàn bộ URL nằm trong \`docs/content-inventory.csv\`.\n`;

fs.mkdirSync(path.join(root, 'docs'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/content-inventory.csv'), csv);
fs.writeFileSync(path.join(root, 'docs/content-inventory.md'), markdown);
console.log(`Đã kiểm kê ${rows.length} trang; đề xuất xem xét chuyển hướng ${redirectRows.length} URL.`);
