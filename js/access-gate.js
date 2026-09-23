(function () {
  'use strict';

  // Client-side gates are a reading prompt, not secure access control. Never put
  // API tokens or a plain-text password in this repository.
  var EXPECTED_DIGEST = '7385466706a098a6435c33bbb17455e4bbb21fcc569b6577dd7c0a5ef591186f';

  async function sha256(value) {
    var bytes = new TextEncoder().encode('yenhaitran-access:' + String(value || ''));
    var digest = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest)).map(function (byte) {
      return byte.toString(16).padStart(2, '0');
    }).join('');
  }

  window.YenAccessGate = Object.freeze({
    verify: async function (candidate) {
      if (!window.crypto || !window.crypto.subtle) return false;
      return (await sha256(candidate)) === EXPECTED_DIGEST;
    }
  });
})();
