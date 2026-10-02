(function () {
  'use strict';

  var form = document.getElementById('member-login-form');
  var message = document.getElementById('member-login-message');
  if (!form) return;

  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    var submit = form.querySelector('button[type="submit"]');
    submit.disabled = true;
    message.textContent = 'Đang kiểm tra tài khoản…';
    try {
      var response = await fetch('/member-api/login', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({
          identifier: form.elements.identifier.value,
          password: form.elements.password.value
        })
      });
      var data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Không thể đăng nhập.');
      window.location.replace(data.member && data.member.isAdmin ? '/members-admin.html' : '/members.html');
    } catch (error) {
      message.textContent = error.message;
      form.elements.password.value = '';
      form.elements.password.focus();
    } finally {
      submit.disabled = false;
    }
  });
})();
