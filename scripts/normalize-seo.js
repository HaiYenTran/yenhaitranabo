const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const site = 'https://yenhaitran.com';
const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);

const clean = (value) => String(value || '')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ')
  .replace(/&amp;/g, '&')
  .replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'")
  .replace(/\s+/g, ' ')
  .trim();

const attr = (value) => String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
const absoluteImage = (src) => {
  if (!src || /^(?:data:|https?:)/i.test(src)) return src || `${site}/assets/img/avatar_yen.jpg`;
  return `${site}/${src.replace(/^\.\//, '').replace(/^\//, '')}`;
};

function schemaFor(url, title, description, image) {
  const pathname = new URL(url).pathname;
  const base = { '@context': 'https://schema.org', name: title, description, url, image };
  if (pathname === '/events.html') return { ...base, '@type': 'Event', startDate: '2026-10-03', endDate: '2026-10-04', eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode', eventStatus: 'https://schema.org/EventScheduled', location: { '@type': 'Place', name: 'Khách sạn Bình Minh', address: '211 Lê Lợi, Phường Phan Thiết, Tỉnh Lâm Đồng' }, organizer: { '@type': 'Person', name: 'Yến Trần', url: site } };
  const bookAuthors = {
    '/pages/books/bi-mat-kinh-doanh-theo-mang.html': 'Russell Brunson',
    '/pages/books/cau-hoi-la-cau-tra-loi.html': 'Allan Pease',
    '/pages/books/hanh-trinh-ve-phuong-dong.html': 'Blair T. Spalding · Nguyên Phong',
    '/pages/books/procode.html': 'Eric Worre'
  };
  if (bookAuthors[pathname]) return { ...base, '@type': 'Book', inLanguage: 'vi', author: { '@type': 'Person', name: bookAuthors[pathname] } };
  if (/\/pages\/(?:stories|health|breakfast|passive-income)\//.test(pathname) && !/(?:healthylifestyle|healthymeal|nhung-cau-chuyen|passiveincome)\.html$/.test(pathname)) return { ...base, '@type': 'Article', inLanguage: 'vi', author: { '@type': 'Person', name: 'Yến Trần' }, publisher: { '@type': 'Person', name: 'Yến Trần' } };
  if (/\/(?:kham-pha|pages\/(?:books\/tu-sach|digital\/digital_index|stories\/nhung-cau-chuyen|health\/healthylifestyle|breakfast\/healthymeal|passive-income\/passiveincome))\.html$/.test(pathname)) return { ...base, '@type': 'CollectionPage', inLanguage: 'vi' };
  return { ...base, '@type': 'WebPage', inLanguage: 'vi' };
}

for (const url of urls) {
  const pathname = new URL(url).pathname;
  const relative = pathname === '/' ? 'index.html' : decodeURIComponent(pathname.slice(1));
  const filename = path.join(root, relative);
  if (!fs.existsSync(filename) || !filename.endsWith('.html')) continue;
  let html = fs.readFileSync(filename, 'utf8');
  if (/http-equiv=["']refresh/i.test(html)) continue;

  const h1 = clean((html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1]);
  let title = clean((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1]);
  if (!title || /^(?:Personal Blog - Yen Tran|Redirecting\.\.\.)$/i.test(title)) title = `${h1 || 'Yến Trần'} | Yến Trần`;
  let description = (html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)/i) || [])[1];
  if (!description) {
    const paragraph = clean((html.match(/<p[^>]*>([\s\S]*?)<\/p>/i) || [])[1]);
    description = (paragraph || `Nội dung được Yến Trần chọn lọc và chia sẻ tại ${title}.`).slice(0, 158);
  }
  const firstImage = (html.match(/<img[^>]+src=["']([^"']+)/i) || [])[1];
  const existingOgImage = (html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']*)/i) || [])[1];
  const image = pathname === '/events.html'
    ? `${site}/assets/img/lrc16-chuyen-minh-cham-dinh-cao.jpg`
    : /\/pages\/books\/(?!tu-sach|review-sach)/.test(pathname)
      ? absoluteImage(firstImage || existingOgImage)
      : absoluteImage(existingOgImage || firstImage);
  const ogType = /\/pages\/(?:stories|health|breakfast|passive-income)\//.test(pathname) ? 'article' : 'website';

  html = html.replace(/<title[^>]*>[\s\S]*?<\/title>/gi, '');
  html = html.replace(/<meta[^>]+name=["']description["'][^>]*>\s*/gi, '');
  html = html.replace(/<link[^>]+rel=["']canonical["'][^>]*>\s*/gi, '');
  html = html.replace(/<meta[^>]+property=["']og:(?:title|description|url|type|image)["'][^>]*>\s*/gi, '');
  html = html.replace(/<meta[^>]+name=["']twitter:card["'][^>]*>\s*/gi, '');
  html = html.replace(/<script[^>]+data-yen-schema=["']true["'][^>]*>[\s\S]*?<\/script>\s*/gi, '');

  const seo = `\n  <title>${attr(title)}</title>\n  <meta name="description" content="${attr(description)}">\n  <link rel="canonical" href="${url}">\n  <meta property="og:locale" content="vi_VN">\n  <meta property="og:type" content="${ogType}">\n  <meta property="og:title" content="${attr(title)}">\n  <meta property="og:description" content="${attr(description)}">\n  <meta property="og:url" content="${url}">\n  <meta property="og:image" content="${attr(image)}">\n  <meta name="twitter:card" content="summary_large_image">\n  <script type="application/ld+json" data-yen-schema="true">${JSON.stringify(schemaFor(url, title, description, image)).replace(/</g, '\\u003c')}</script>\n`;
  html = html.replace(/<\/head>/i, `${seo}</head>`);

  const mainIndex = html.search(/<main\b/i);
  if (mainIndex >= 0) {
    const before = html.slice(0, mainIndex);
    const after = html.slice(mainIndex).replace(/<img\b(?![^>]*\bloading=)(?![^>]*\bfetchpriority=)/gi, '<img loading="lazy"');
    html = before + after;
  }
  fs.writeFileSync(filename, html);
}

console.log(`Normalized SEO for ${urls.length} sitemap URLs.`);
