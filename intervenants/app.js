/* ============================================================
   INTERVENANTS — /intervenants/index.html + app.js
   Page vitrine publique : cartes des enseignant·e·s (avatar, bio,
   spécialité, école), cliquables vers leur galerie /galerie/?user=id.
   Pas de garde de session : accessible aux visiteurs non connectés.
   Le lien dans le menu (shell.html) reste réservé aux non-connectés
   et aux comptes de rôle "visitor" — voir updateNavForUser/Guest
   dans /app.js — mais cette page reste joignable directement par URL.
   ============================================================ */

var SUPABASE_URL = 'https://qptnjgdfobznwmsguvyf.supabase.co';
var SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwdG5qZ2Rmb2J6bndtc2d1dnlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5MjA3MjIsImV4cCI6MjA5MzQ5NjcyMn0.QLfIITvc-AdWVLZHHghocNYyYyYvPxZZMAXhdl_4Bdo';
var sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

function toast(msg, type) {
  if (!type) type = 'success';
  var c = document.getElementById('toast');
  if (!c) return;
  var el = document.createElement('div');
  el.className = 'toast-item ' + type;
  el.textContent = msg;
  c.appendChild(el);
  setTimeout(function() { el.remove(); }, 3500);
}

document.addEventListener('DOMContentLoaded', loadIntervenants);

async function loadIntervenants() {
  var grid = document.getElementById('intervenants-grid');

  var res = await sb.from('profiles')
    .select('id, full_name, avatar_url, bio, specialty, school')
    .eq('role', 'teacher')
    .order('full_name', { ascending: true });

  if (res.error) {
    grid.innerHTML = '<p class="intervenants-loading">Erreur de chargement : ' + res.error.message + '</p>';
    return;
  }

  var teachers = res.data || [];
  if (teachers.length === 0) {
    grid.innerHTML = '<p class="intervenants-loading">Aucun intervenant à afficher pour le moment.</p>';
    return;
  }

  var html = '';
  for (var i = 0; i < teachers.length; i++) {
    var t = teachers[i];
    var initiale = (t.full_name || '?').charAt(0).toUpperCase();
    var avatarHtml = t.avatar_url
      ? '<img src="' + t.avatar_url + '" alt="">'
      : '<span class="intervenant-avatar-fallback">' + initiale + '</span>';

    html += '<div class="intervenant-card" onclick="window.location.href=\'/galerie/?user=' + t.id + '\'">';
    html += '<div class="intervenant-avatar">' + avatarHtml + '</div>';
    html += '<div class="intervenant-body">';
    html += '<h3 class="intervenant-name">' + (t.full_name || 'Intervenant·e') + '</h3>';
    if (t.specialty) html += '<p class="intervenant-specialty">' + t.specialty + '</p>';
    if (t.school) html += '<p class="intervenant-school">' + t.school + '</p>';
    if (t.bio) html += '<p class="intervenant-bio">' + t.bio + '</p>';
    html += '</div></div>';
  }
  grid.innerHTML = html;
}
