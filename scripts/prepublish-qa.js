const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
const officialUrls = [...sitemap.matchAll(/<loc>https:\/\/yenhaitran\.com([^<]*)<\/loc>/g)].map((m) => m[1] || '/');
const errors = [];
const warnings = [];

function report(kind, file, message) {
  (kind === 'error' ? errors : warnings).push(`${file}: ${message}`);
}

function localFile(urlPath) {
  const clean = decodeURIComponent(urlPath.split(/[?#]/)[0]);
  if (clean === '/' || clean === '') return 'index.html';
  return clean.replace(/^\//, '');
}

function resolveLocal(file, html, reference) {
  if (!reference || /^(?:https?:|mailto:|tel:|javascript:|data:|blob:|#|\/\/)/i.test(reference)) return null;
  if (/\$\{|\{\{/.test(reference)) return null;
  const ref = reference.split(/[?#]/)[0];
  const base = html.match(/<base\s+[^>]*href=["']([^"']+)/i)?.[1] || '';
  const resolved = ref.startsWith('/')
    ? ref.slice(1)
    : path.normalize(path.join(path.dirname(file), base, ref));
  return resolved || 'index.html';
}

for (const url of officialUrls) {
  const file = localFile(url);
  const absolute = path.join(root, file);
  if (!fs.existsSync(absolute)) {
    report('error', file, 'URL trong sitemap không có file tương ứng');
    continue;
  }
  const html = fs.readFileSync(absolute, 'utf8');
  if (!/<meta\s+name=["']viewport["']/i.test(html)) report('error', file, 'thiếu meta viewport cho mobile');

  for (const match of html.matchAll(/<(?:img|source)\b[^>]*(src|srcset)=["']([^"']+)["'][^>]*>/gi)) {
    const refs = match[1].toLowerCase() === 'srcset'
      ? match[2].split(',').map((value) => value.trim().replace(/\s+\d+(?:\.\d+)?[wx]$/, ''))
      : [match[2]];
    for (const ref of refs) {
      const target = resolveLocal(file, html, ref);
      if (target && !fs.existsSync(path.join(root, target))) report('error', file, `ảnh không tồn tại: ${ref}`);
    }
  }
  for (const match of html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>/gi)) {
    const target = resolveLocal(file, html, match[1]);
    if (target && !fs.existsSync(path.join(root, target))) report('error', file, `liên kết nội bộ không tồn tại: ${match[1]}`);
    if (/target=["']_blank["']/i.test(match[0]) && !/rel=["'][^"']*(?:noopener|noreferrer)/i.test(match[0])) {
      report('error', file, `target="_blank" thiếu rel="noopener" tại ${match[1]}`);
    }
  }
  for (const match of html.matchAll(/<img\b([^>]*)>/gi)) {
    if (!/\balt=["'][^"']*["']/i.test(match[1])) report('error', file, 'ảnh thiếu thuộc tính alt');
  }
  const ids = [...html.matchAll(/\bid=["']([^"']+)["']/gi)].map((m) => m[1]);
  const duplicateIds = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
  if (duplicateIds.length) report('error', file, `ID bị trùng: ${duplicateIds.join(', ')}`);
  if (/(?:role=["']dialog["']|class=["'][^"']*modal)/i.test(html) && !/(?:aria-label=["'][^"']*(?:Đóng|Close)|class=["'][^"']*(?:close|modal-close))/i.test(html)) {
    report('error', file, 'popup/dialog chưa có nút đóng dễ nhận biết');
  }
}

const textExtensions = new Set(['.html', '.js', '.css', '.json', '.yml', '.yaml', '.md', '.xml']);
const excluded = new Set(['.git', 'assets', 'node_modules']);
const secretPatterns = [
  ['khóa bí mật', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ['Telegram bot token', /\b\d{7,12}:[A-Za-z0-9_-]{30,}\b/],
  ['API token phổ biến', /\b(?:sk_live_|sk_test_|ghp_|github_pat_|AIza)[A-Za-z0-9_-]{16,}\b/],
  ['mật khẩu viết rõ trong mã', /\b(?:PASSWORD|PASSCODE|SECRET)\s*=\s*["'][^"']{3,}["']/i],
  ['so sánh mật khẩu với chuỗi rõ', /(?:password|passcode)[^\n]{0,80}===?\s*["'][^"']+["']/i]
];

function scan(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (excluded.has(entry.name)) continue;
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) scan(absolute);
    else if (textExtensions.has(path.extname(entry.name))) {
      const relative = path.relative(root, absolute);
      const content = fs.readFileSync(absolute, 'utf8');
      for (const [label, pattern] of secretPatterns) {
        if (pattern.test(content)) report('error', relative, `phát hiện ${label}`);
      }
    }
  }
}
scan(root);

function luminance(hex) {
  const channels = hex.replace('#', '').match(/.{2}/g).map((value) => parseInt(value, 16) / 255).map((value) => value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}
function contrast(a, b) {
  const values = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (values[0] + 0.05) / (values[1] + 0.05);
}
const contrastPairs = [['#173f35', '#ffffff'], ['#26332e', '#fffdf8'], ['#66736d', '#fffdf8'], ['#a75d3b', '#fffdf8']];
for (const pair of contrastPairs) {
  const ratio = contrast(pair[0], pair[1]);
  if (ratio < 4.5) report('error', 'css/yen-site-system.css', `contrast ${pair.join(' / ')} chỉ đạt ${ratio.toFixed(2)}:1`);
}

console.log(`QA website: ${officialUrls.length} URL chính thức`);
console.log(`- Lỗi: ${errors.length}`);
console.log(`- Cảnh báo: ${warnings.length}`);
if (errors.length) console.error('\n' + errors.map((item) => `ERROR ${item}`).join('\n'));
if (warnings.length) console.warn('\n' + warnings.map((item) => `WARN  ${item}`).join('\n'));
if (errors.length) process.exitCode = 1;
