(function () {
  'use strict';

  var path = location.pathname.replace(/\/+$/, '') || '/';

  function analyticsProperties(extra) {
    return Object.assign({
      path: location.pathname,
      page_title: document.title
    }, extra || {});
  }

  function trackAnalyticsEvent(name, properties) {
    var attempts = 0;
    var send = function () {
      if (window.zaraz && typeof window.zaraz.track === 'function') {
        window.zaraz.track(name, analyticsProperties(properties));
        return;
      }
      attempts += 1;
      if (attempts < 20) window.setTimeout(send, 250);
    };
    send();
  }

  window.YenAnalytics = window.YenAnalytics || { track: trackAnalyticsEvent };

  document.addEventListener('click', function (event) {
    var target = event.target.closest('a, button');
    if (!target) return;
    var href = target.getAttribute('href') || '';
    if (target.matches('[data-yt-zalo], [data-zalo-trigger], .zalo-trigger') || /zalo\.me|zalo-qr/i.test(href)) {
      trackAnalyticsEvent('zalo_contact_click', { label: (target.textContent || '').trim().slice(0, 80) });
    }
    if (target.matches('[data-consult-type]')) {
      trackAnalyticsEvent('consultation_form_open', { consultation_type: target.getAttribute('data-consult-type') || 'unknown' });
    }
    if (/(?:^|\/)pages\/books\/doc-sach\.html/i.test(href)) {
      trackAnalyticsEvent('book_read_open', { destination: href });
    }
    if (/(?:^|\/)pages\/stories\/(?!nhung-cau-chuyen\.html)[^?#]+\.html/i.test(href) || /^nhung-cau-chuyen-bai-[^?#]+\.html/i.test(href)) {
      trackAnalyticsEvent('article_open', { destination: href });
    }
  });

  if (window.yenBookOpened) trackAnalyticsEvent('book_reader_view', { book: window.yenBookOpened });
  if (/\/pages\/stories\/(?!nhung-cau-chuyen\.html$)[^/]+\.html$/i.test(path)) {
    trackAnalyticsEvent('article_view');
  }

  if (path.endsWith('/gioi-thieu-yen-tran.html') || path.endsWith('/pages/books/doc-sach.html')) return;

  var root = '/';
  var links = [
    ['Trang chủ', '/'],
    ['Sống khỏe', '/healthylifestyle.html'],
    ['Góc chủ động & câu chuyện', '/passiveincome.html'],
    ['Khám phá', '/kham-pha.html'],
    ['Liên hệ', '/contact.html']
  ];

  function isCurrent(href) {
    if (href === '/') return path === '/' || path.endsWith('/index.html');
    if (href === '/healthylifestyle.html') return /health|breakfast|healthymeal|kiem-soat-can-nang|ffit/i.test(path);
    if (href === '/passiveincome.html') return /passive|stories|nhung-cau-chuyen|khao-sat|ondinh|dam-bao/i.test(path);
    if (href === '/kham-pha.html') return /kham-pha|digital|books|showcase|events/i.test(path);
    return path === href;
  }

  function hideLegacyShell() {
    document.querySelectorAll('#mainNav, nav.navbar, body > nav, body > header.topbar, body > .topbar').forEach(function (el) {
      el.classList.add('yt-legacy-hidden');
      el.setAttribute('aria-hidden', 'true');
    });
  }

  function primaryGroup() {
    if (/\/privacy\.html$/.test(path)) return { name: 'Liên hệ', href: '/contact.html' };
    if (/\/(?:pages\/(?:health|breakfast)\/|(?:nutrilite-plant-protein-review|protein-thuc-vat-tri-blend|omega-3-hap-thu-epa-dha|vitamin-c-extended-release)\.html$)/i.test(path)) {
      return { name: 'Sống khỏe', href: '/healthylifestyle.html' };
    }
    if (/\/(?:pages\/(?:passive-income|stories)\/|(?:2024LOOKBACK|GUITOICUATUONGLAI_CHAP1|gui20namsauChap2|affiliate-dropii-mlm-amway-comparison|crador-leadership-blueprint|khao-sat-co-hoi)\.html$)/i.test(path)) {
      return { name: 'Góc chủ động & câu chuyện', href: '/passiveincome.html' };
    }
    if (/\/(?:pages\/(?:books|digital|showcase)\/|events(?:\/|\.html$))/i.test(path)) {
      return { name: 'Khám phá', href: '/kham-pha.html' };
    }
    return null;
  }

  function isGroupHome(group) {
    if (!group) return true;
    if (group.href === '/healthylifestyle.html') return /\/(?:healthylifestyle\.html|pages\/health\/healthylifestyle\.html)$/.test(path);
    if (group.href === '/passiveincome.html') return /\/(?:passiveincome\.html|pages\/passive-income\/passiveincome\.html)$/.test(path);
    if (group.href === '/kham-pha.html') return /\/kham-pha\.html$/.test(path);
    if (group.href === '/contact.html') return /\/contact\.html$/.test(path);
    return false;
  }

  function applyDesignSystem() {
    document.querySelectorAll('.btn-primary, .primary-btn, .cta-btn, .contact-cta, .personal-cta-button, .zalo-link, button.primary, a.primary, a.btn:not(.light):not(.secondary):not(.btn-secondary), button.btn:not(.light):not(.secondary):not(.btn-secondary)').forEach(function (el) {
      el.classList.add('yt-primary-action');
    });
    document.querySelectorAll('.story-card, .article-card, .series-card, .env-card, .book-card, .product-card, .digital-card, .event-card, .next-card, .plan-card, .explore-card, .card').forEach(function (el) {
      el.classList.add('yt-content-card');
    });
  }

  function buildGroupReturn(header) {
    var group = primaryGroup();
    if (!group || isGroupHome(group)) return;
    var returnBar = document.createElement('nav');
    returnBar.className = 'yt-group-return';
    returnBar.setAttribute('aria-label', 'Nhóm nội dung chính');
    returnBar.innerHTML = '<a href="' + group.href + '"><span aria-hidden="true">←</span> Trở về ' + group.name + '</a>' +
      '<span class="yt-group-label">Nhóm nội dung chính · ' + group.name + '</span>';
    header.insertAdjacentElement('afterend', returnBar);
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
    return header;
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
        '<span><a href="/healthylifestyle.html">Sống khỏe</a> · <a href="/passiveincome.html">Góc chủ động</a> · <a href="/kham-pha.html">Khám phá</a> · <a href="/contact.html">Liên hệ</a></span></div>';
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
      '<span><a href="/healthylifestyle.html">Sống khỏe</a> · <a href="/passiveincome.html">Góc chủ động</a> · <a href="/kham-pha.html">Khám phá</a> · <a href="/contact.html">Liên hệ</a></span></div>';
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
  var siteHeader = buildHeader();
  buildGroupReturn(siteHeader);
  applyDesignSystem();
  improveContent();
  buildContact();
})();
