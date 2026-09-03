var SUPABASE_URL = 'https://qptnjgdfobznwmsguvyf.supabase.co';
var SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwdG5qZ2Rmb2J6bndtc2d1dnlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5MjA3MjIsImV4cCI6MjA5MzQ5NjcyMn0.QLfIITvc-AdWVLZHHghocNYyYyYvPxZZMAXhdl_4Bdo';
var sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

window.addEventListener('pageshow', function(e) {
  if (e.persisted) location.reload();
});

/* --- BANDEAU DE DIAGNOSTIC TEMPORAIRE --- */
(function() {
  var banner = document.createElement('div');
  banner.style.cssText = 'position:fixed;bottom:0;left:0;right:0;z-index:999999;background:#111;color:#0f0;font-family:monospace;font-size:10px;padding:6px;max-height:32vh;overflow-y:auto;white-space:pre-wrap;';
  banner.textContent = '[debug] page: ' + location.pathname;
  function attach() {
    if (document.body) document.body.appendChild(banner);
    else document.addEventListener('DOMContentLoaded', attach);
  }
  attach();

  var origGetSession = sb.auth.getSession.bind(sb.auth);
  sb.auth.getSession = function() {
    return origGetSession().then(function(res) {
      var u = res.data && res.data.session && res.data.session.user;
      banner.textContent += '\ngetSession → ' + (u ? 'OK (' + u.email + ')' : 'AUCUNE SESSION');
      return res;
    });
  };
})();
