(function () {
  'use strict';

  var accounts = {
    admin1231995: { passwordHash: '67cb77bd51daeb4a9a23409abeaa4ac3f61c33cadbb6f3d337c34c4cfdfc689a', displayName: 'Quản trị viên thử nghiệm', role: 'admin', isAdmin: true },
    user1231995: { passwordHash: 'cc5a287568abceba0402dcd5fe25744d49f59f01c4f35ddb6f8b84a355558528', displayName: 'Thành viên thử nghiệm', role: 'member', isAdmin: false }
  };

  async function sha256(value) {
    var bytes = new TextEncoder().encode(value);
    var digest = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest)).map(function (byte) {
      return byte.toString(16).padStart(2, '0');
    }).join('');
  }

  var form = document.getElementById('demo-login-form');
  var message = document.getElementById('demo-login-message');
  if (!form) return;

  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    var username = String(form.elements.username.value || '').trim();
    var password = String(form.elements.password.value || '');
    var account = accounts[username];
    var passwordHash = await sha256(password);
    if (!account || account.passwordHash !== passwordHash) {
      message.textContent = 'Tên đăng nhập hoặc mật khẩu thử nghiệm không đúng.';
      return;
    }
    sessionStorage.setItem('yenMemberDemo', JSON.stringify({
      username: username,
      displayName: account.displayName,
      role: account.role,
      isAdmin: account.isAdmin,
      demo: true
    }));
    window.location.href = account.isAdmin ? '/members-admin.html?demo=1' : '/members.html?demo=1';
  });
})();
