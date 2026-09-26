(function () {
  'use strict';

  var API = '/member-api';
  var categoryLabels = {
    'amway-present-value': 'Amway · Present Value',
    'wellness-sources': 'Wellness · Sources',
    'self-improve': 'Self · Improve'
  };

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  async function request(path, options) {
    var response = await fetch(API + path, Object.assign({
      credentials: 'same-origin',
      headers: { accept: 'application/json' }
    }, options || {}));
    var type = response.headers.get('content-type') || '';
    var data = type.includes('application/json') ? await response.json() : null;
    if (!response.ok) {
      var error = new Error(data && data.message ? data.message : 'Không thể kết nối hệ thống thành viên.');
      error.status = response.status;
      error.code = data && data.code;
      throw error;
    }
    return data;
  }

  function formatBytes(value) {
    var bytes = Number(value || 0);
    if (!bytes) return 'Chưa có tệp';
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  function setRuntimeState(title, copy, state) {
    var box = document.getElementById('member-runtime-state');
    if (!box) return;
    box.dataset.state = state || 'idle';
    var strong = box.querySelector('strong');
    var span = box.querySelector('span');
    if (strong) strong.textContent = title;
    if (span) span.textContent = copy;
  }

  function renderDocuments(documents) {
    var grouped = {};
    documents.forEach(function (doc) {
      (grouped[doc.category] || (grouped[doc.category] = [])).push(doc);
    });
    document.querySelectorAll('[data-member-docs]').forEach(function (container) {
      var category = container.getAttribute('data-member-docs');
      var items = grouped[category] || [];
      if (!items.length) {
        container.innerHTML = '<div class="member-empty">Chưa có tài liệu trong nhóm này.</div>';
        return;
      }
      container.innerHTML = items.map(function (doc) {
        var action = doc.file_ready
          ? '<a class="member-open" href="' + API + '/documents/' + doc.id + '/content" target="_blank" rel="noopener">Mở tài liệu</a>'
          : '<span class="member-placeholder">Chưa gắn tệp</span>';
        return '<article class="member-doc"><span class="member-doc-icon" aria-hidden="true">DOC</span><div><h3>' +
          escapeHtml(doc.title) + '</h3><p>' + escapeHtml(doc.source_label || doc.description || categoryLabels[category]) +
          ' · ' + escapeHtml(formatBytes(doc.size_bytes)) + '</p></div>' + action + '</article>';
      }).join('');
    });
  }

  async function initMemberPage() {
    if (!document.querySelector('[data-member-page]')) return;
    try {
      var session = await request('/session');
      var member = session.member;
      setRuntimeState('Xin chào ' + (member.displayName || member.email), 'Bạn đang truy cập với quyền ' + member.role + '.', 'ready');
      var result = await request('/documents');
      renderDocuments(result.documents || []);
      var adminLink = document.querySelector('[data-admin-link]');
      if (adminLink) adminLink.hidden = !member.isAdmin;
    } catch (error) {
      setRuntimeState(
        'Hệ thống đăng nhập chưa kích hoạt',
        'Giao diện mẫu vẫn có thể xem; tài liệu thật sẽ chỉ mở sau khi Cloudflare Access và kho riêng tư được kết nối.',
        'offline'
      );
    }
  }

  function renderMemberRows(members) {
    var target = document.getElementById('admin-member-list');
    if (!target) return;
    target.innerHTML = members.map(function (member) {
      return '<div class="admin-row"><strong>' + escapeHtml(member.display_name || member.email) + '</strong><span>' +
        escapeHtml(member.email) + '<br>' + escapeHtml(member.role) + '</span><span class="' + (member.active ? 'admin-status' : '') + '">' +
        (member.active ? 'Đang hoạt động' : 'Đã khóa') + '</span></div>';
    }).join('');
  }

  function renderAdminDocuments(documents) {
    var target = document.getElementById('admin-document-list');
    if (!target) return;
    target.innerHTML = documents.map(function (doc) {
      return '<div class="admin-row"><strong>' + escapeHtml(doc.title) + '</strong><span>' +
        escapeHtml(categoryLabels[doc.category] || doc.category) + '</span><span class="' + (doc.file_ready ? 'admin-status' : '') + '">' +
        (doc.file_ready ? 'Đã gắn tệp' : 'Chưa có tệp') + '</span></div>';
    }).join('');
  }

  function setAdminMessage(message, isError) {
    var target = document.getElementById('admin-message');
    if (!target) return;
    target.textContent = message || '';
    target.dataset.error = isError ? 'true' : 'false';
  }

  async function refreshAdminData() {
    var results = await Promise.all([request('/admin/members'), request('/admin/documents')]);
    renderMemberRows(results[0].members || []);
    renderAdminDocuments(results[1].documents || []);
  }

  async function submitMember(event) {
    event.preventDefault();
    var form = event.currentTarget;
    var submit = form.querySelector('button[type="submit"]');
    submit.disabled = true;
    setAdminMessage('Đang lưu thành viên…', false);
    try {
      await request('/admin/members', {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({
          email: form.elements.email.value,
          displayName: form.elements.displayName.value,
          role: form.elements.role.value
        })
      });
      form.reset();
      await refreshAdminData();
      setAdminMessage('Đã lưu thành viên.', false);
    } catch (error) {
      setAdminMessage(error.message, true);
    } finally {
      submit.disabled = false;
    }
  }

  async function submitDocument(event) {
    event.preventDefault();
    var form = event.currentTarget;
    var submit = form.querySelector('button[type="submit"]');
    var file = form.elements.file.files[0];
    submit.disabled = true;
    setAdminMessage('Đang tạo tài liệu…', false);
    try {
      var created = await request('/admin/documents', {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({
          title: form.elements.title.value,
          description: form.elements.description.value,
          category: form.elements.category.value,
          sourceLabel: form.elements.sourceLabel.value,
          accessLevel: form.elements.accessLevel.value
        })
      });
      if (file) {
        if (file.size > 25 * 1024 * 1024) throw new Error('Tệp vượt quá giới hạn 25 MB.');
        setAdminMessage('Đang tải tệp lên kho riêng tư…', false);
        await request('/admin/documents/' + created.id + '/file', {
          method: 'PUT',
          headers: { 'content-type': file.type || 'application/octet-stream', 'x-file-name': file.name, accept: 'application/json' },
          body: file
        });
      }
      form.reset();
      await refreshAdminData();
      setAdminMessage('Đã lưu tài liệu' + (file ? ' và tải tệp lên.' : '.'), false);
    } catch (error) {
      setAdminMessage(error.message, true);
    } finally {
      submit.disabled = false;
    }
  }

  async function initAdminPage() {
    if (!document.querySelector('[data-member-admin-page]')) return;
    try {
      var session = await request('/session');
      if (!session.member.isAdmin) throw new Error('Tài khoản không có quyền quản trị.');
      document.querySelectorAll('[data-admin-control]').forEach(function (element) { element.disabled = false; });
      document.getElementById('member-form').addEventListener('submit', submitMember);
      document.getElementById('document-form').addEventListener('submit', submitDocument);
      await refreshAdminData();
      setAdminMessage('Đã kết nối hệ thống quản trị.', false);
    } catch (error) {
      setAdminMessage('Chưa kích hoạt: ' + error.message, true);
    }
  }

  initMemberPage();
  initAdminPage();
})();
