window.onerror = function(msg, url, line) {
  alert('Erreur JS : ' + msg + ' (ligne ' + line + ')');
};

var SUPABASE_URL = 'https://qptnjgdfobznwmsguvyf.supabase.co';
var SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwdG5qZ2Rmb2J6bndtc2d1dnlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5MjA3MjIsImV4cCI6MjA5MzQ5NjcyMn0.QLfIITvc-AdWVLZHHghocNYyYyYvPxZZMAXhdl_4Bdo';
var sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Force un vrai rechargement si la page est restaurée depuis le bfcache
// (bouton retour natif) — évite l'UI figée sur un état "déconnecté".
window.addEventListener('pageshow', function(e) {
  if (e.persisted) location.reload();
});
