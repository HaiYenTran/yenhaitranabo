(function () {
  'use strict';

  var path = location.pathname.replace(/\/+$/, '') || '/';
  if (path.endsWith('/gioi-thieu-yen-tran.html')) return;

  var root = '/';
  var links = [
    ['Trang chủ', '/'],
    ['Về Yến', '/about.html'],
    ['Sống khỏe', '/healthylifestyle.html'],
    ['Góc chủ động', '/passiveincome.html'],
    ['Khám phá', '/digital_index.html'],
    ['Liên hệ', '/contact.html']
  ];

  function isCurrent(href) {
    if (href === '/') return path === '/' || path.endsWith('/index.html');
    if (href === '/healthylifestyle.html') return /health|breakfast|healthymeal|kiem-soat-can-nang|ffit/i.test(path);
    if (href === '/passiveincome.html') return /passive|stories|nhung-cau-chuyen|khao-sat|ondinh|dam-bao/i.test(path);
    if (href === '/digital_index.html') return /digital|books|showcase|events/i.test(path);
    return path === href;
  }

  function hideLegacyShell() {
    document.querySelectorAll('#mainNav, nav.navbar, body > nav, body > header.topbar, body > .topbar').forEach(function (el) {
      el.classList.add('yt-legacy-hidden');
      el.setAttribute('aria-hidden', 'true');
    });
  }

  function buildHeader() {
    var header = document.createElement('header');
    header.className = 'yt-site-header';
    header.innerHTML = '<nav class="yt-nav" aria-label="Điều hướng chính">' +
      '<a class="yt-brand" href="' + root + '">YẾN TRẦN</a>' +
      '<button class="yt-nav-toggle" type="button" aria-expanded="false" aria-controls="yt-nav-links" aria-label="Mở menu">☰</button>' +
      '<div class="yt-nav-links" id="yt-nav-links">' +
      links.map(function (item, index) {
        var current = isCurrent(item[1]) ? ' aria-current="page"' : '';
        var cls = index === links.length - 1 ? ' class="yt-contact-link"' : '';
        return '<a' + cls + current + ' href="' + item[1] + '">' + item[0] + '</a>';
      }).join('') + '</div></nav>';
    document.body.insertBefore(header, document.body.firstChild);
    var toggle = header.querySelector('.yt-nav-toggle');
    toggle.addEventListener('click', function () {
      var open = header.getAttribute('data-open') !== 'true';
      header.setAttribute('data-open', String(open));
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Đóng menu' : 'Mở menu');
    });
    header.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', function () { header.setAttribute('data-open', 'false'); }); });
  }

  function openZalo() {
    var modal = document.querySelector('.yt-zalo-modal');
    if (!modal) return;
    modal._returnFocus = document.activeElement;
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    modal.querySelector('.yt-zalo-close').focus();
  }
  function closeZalo() {
    var modal = document.querySelector('.yt-zalo-modal');
    if (!modal) return;
    modal.hidden = true;
    document.body.style.overflow = '';
    if (modal._returnFocus && typeof modal._returnFocus.focus === 'function') modal._returnFocus.focus();
  }

  function buildContact() {
    if (/\/(contact|kiem-soat-can-nang)\.html$/.test(path)) {
      var simpleFooter = document.createElement('footer');
      simpleFooter.className = 'yt-site-footer';
      simpleFooter.innerHTML = '<div class="yt-footer-inner"><span>© Yến Trần · Sống khỏe, sống chủ động</span>' +
        '<span><a href="/about.html">Về Yến</a> · <a href="/contact.html">Liên hệ</a> · <a href="/pages/books/tu-sach.html">Tủ sách</a></span></div>';
      document.body.appendChild(simpleFooter);
      return;
    }
    var strip = document.createElement('section');
    strip.className = 'yt-contact-strip';
    strip.setAttribute('aria-labelledby', 'yt-contact-title');
    strip.innerHTML = '<div><h2 id="yt-contact-title">Bạn muốn cùng Yến nhìn rõ bước tiếp theo?</h2>' +
      '<p>Nhắn Yến qua Zalo, chia sẻ ngắn điều bạn đang quan tâm. Yến sẽ lắng nghe trước và gợi ý một bước nhỏ, phù hợp với tình trạng hiện tại của bạn.</p></div>' +
      '<button class="yt-zalo-button" type="button" data-yt-zalo>Quét mã Zalo để liên hệ</button>';
    document.body.appendChild(strip);

    var footer = document.createElement('footer');
    footer.className = 'yt-site-footer';
    footer.innerHTML = '<div class="yt-footer-inner"><span>© Yến Trần · Sống khỏe, sống chủ động</span>' +
      '<span><a href="/about.html">Về Yến</a> · <a href="/contact.html">Liên hệ</a> · <a href="/pages/books/tu-sach.html">Tủ sách</a></span></div>';
    document.body.appendChild(footer);

    var floatButton = document.createElement('button');
    floatButton.className = 'yt-zalo-float';
    floatButton.type = 'button';
    floatButton.setAttribute('data-yt-zalo', '');
    floatButton.setAttribute('aria-label', 'Mở mã QR Zalo để liên hệ Yến');
    floatButton.textContent = 'Liên hệ Zalo';
    document.body.appendChild(floatButton);

    var modal = document.createElement('div');
    modal.className = 'yt-zalo-modal';
    modal.hidden = true;
    modal.innerHTML = '<button class="yt-zalo-backdrop" type="button" aria-label="Đóng cửa sổ"></button>' +
      '<section class="yt-zalo-dialog" role="dialog" aria-modal="true" aria-labelledby="yt-zalo-title">' +
      '<button class="yt-zalo-close" type="button" aria-label="Đóng">×</button>' +
      '<h2 id="yt-zalo-title">Kết nối với Yến qua Zalo</h2>' +
      '<p>Mở Zalo, chọn quét mã QR và hướng camera vào mã bên dưới.</p>' +
      '<img src="/assets/img/zalo-qr-yen-tran.png" alt="Mã QR Zalo cá nhân của Yến Trần" width="1260" height="1920">' +
      '<span class="yt-zalo-note">Yến thường phản hồi trong vòng 24 giờ.</span></section>';
    document.body.appendChild(modal);
    document.querySelectorAll('[data-yt-zalo]').forEach(function (el) { el.addEventListener('click', openZalo); });
    modal.querySelector('.yt-zalo-backdrop').addEventListener('click', closeZalo);
    modal.querySelector('.yt-zalo-close').addEventListener('click', closeZalo);
    document.addEventListener('keydown', function (event) {
      if (modal.hidden) return;
      if (event.key === 'Escape') closeZalo();
      if (event.key === 'Tab') {
        var focusable = Array.from(modal.querySelectorAll('button, a[href]')).filter(function (el) { return !el.disabled; });
        var first = focusable[0];
        var last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    });
  }

  function improveContent() {
    document.querySelectorAll('a[target="_blank"]').forEach(function (a) {
      var rel = new Set((a.getAttribute('rel') || '').split(/\s+/).filter(Boolean));
      rel.add('noopener'); rel.add('noreferrer'); a.setAttribute('rel', Array.from(rel).join(' '));
    });
  }

  document.body.classList.add('yt-unified');
  hideLegacyShell();
  buildHeader();
  improveContent();
  buildContact();
})();
