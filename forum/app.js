/* ============================================================
   FORUM — /forum/index.html + app.js (liste des sujets)
   Réservé aux connectés dont le rôle est student/teacher/admin
   (les comptes "visitor" n'y ont pas accès).
   ============================================================ */

var SUPABASE_URL = 'https://qptnjgdfobznwmsguvyf.supabase.co';
var SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwdG5qZ2Rmb2J6bndtc2d1dnlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5MjA3MjIsImV4cCI6MjA5MzQ5NjcyMn0.QLfIITvc-AdWVLZHHghocNYyYyYvPxZZMAXhdl_4Bdo';
var sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

var currentUser = null;
var currentProfile = null;
var forumCategory = '';

var CAT_LABELS = { questions: 'Questions', projets: 'Projets', ressources: 'Ressources', entraide: 'Entraide', annonces: 'Annonces' };

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

function formatDate(iso) {
  if (!iso) return '';
  var d = new Date(iso);
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

/* ---------- Garde d'accès ---------- */
(async function initForum() {
  var sessionRes = await sb.auth.getSession();
  if (!sessionRes.data || !sessionRes.data.session || !sessionRes.data.session.user) {
    document.getElementById('forum-guard-msg').textContent = 'Connexion requise. Redirection…';
    setTimeout(function() { window.location.href = '/login/'; }, 1200);
    return;
  }
  currentUser = sessionRes.data.session.user;

  var profRes = await sb.from('profiles').select('*').eq('id', currentUser.id).single();
  currentProfile = profRes.data;
  var role = currentProfile ? currentProfile.role : null;

  if (!role || role === 'visitor') {
    document.getElementById('forum-guard-msg').textContent = "Le forum est réservé aux étudiant·e·s et enseignant·e·s. Ton compte n'y a pas encore accès.";
    setTimeout(function() { window.location.href = '/dashboard/'; }, 2200);
    return;
  }

  document.getElementById('forum-guard-msg').classList.add('hidden');
  document.getElementById('forum-content').classList.remove('hidden');
  loadTopics();
})();

/* ---------- Catégories ---------- */
function setForumCategory(cat, btn) {
  forumCategory = cat;
  document.querySelectorAll('.forum-cat-pill').forEach(function(p) { p.classList.remove('active'); });
  if (btn) btn.classList.add('active');
  loadTopics();
}

/* ---------- Liste des sujets ---------- */
async function loadTopics() {
  var list = document.getElementById('forum-topics-list');
  list.innerHTML = '<p class="forum-loading">Chargement…</p>';

  var query = sb.from('forum_topics')
    .select('*, author:profiles!author_id(full_name, avatar_url)')
    .order('created_at', { ascending: false });
  if (forumCategory) query = query.eq('category', forumCategory);

  var res = await query;
  if (res.error) {
    list.innerHTML = '<p class="forum-loading">Erreur de chargement : ' + res.error.message + '</p>';
    return;
  }

  var topics = res.data || [];
  if (topics.length === 0) {
    list.innerHTML = '<p class="forum-loading">Aucun sujet pour le moment — sois le·la premier·ère à en ouvrir un.</p>';
    return;
  }

  // Compte des réponses par sujet
  var counts = {};
  await Promise.all(topics.map(async function(t) {
    var r = await sb.from('forum_replies').select('*', { count: 'exact', head: true }).eq('topic_id', t.id);
    counts[t.id] = r.count || 0;
  }));

  var html = '';
  for (var i = 0; i < topics.length; i++) {
    var t = topics[i];
    var author = t.author ? t.author.full_name : '—';
    var resolved = t.status === 'resolved';
    html += '<div class="forum-topic-row' + (resolved ? ' resolved' : '') + '" onclick="window.location.href=\'/forum/sujet/?id=' + t.id + '\'">';
    html += '<div class="forum-topic-main">';
    html += '<span class="forum-topic-cat">' + (CAT_LABELS[t.category] || t.category) + '</span>';
    if (resolved) html += '<span class="forum-topic-resolved">🔒 Résolu</span>';
    html += '<h3 class="forum-topic-title">' + t.title + '</h3>';
    html += '<div class="forum-topic-meta">' + author + ' · ' + formatDate(t.created_at) + ' · ' + counts[t.id] + ' réponse' + (counts[t.id] > 1 ? 's' : '') + '</div>';
    html += '</div></div>';
  }
  list.innerHTML = html;
}

/* ---------- Nouveau sujet ---------- */
function ouvrirNouveauSujet() {
  document.getElementById('forum-new-title').value = '';
  document.getElementById('forum-new-content').value = '';
  document.getElementById('forum-new-category').value = forumCategory || 'questions';
  document.getElementById('forum-modal-msg').textContent = '';
  document.getElementById('forum-modal-overlay').classList.add('open');
}
document.addEventListener('DOMContentLoaded', function() {
  var closeBtn = document.getElementById('forum-modal-close');
  var overlay = document.getElementById('forum-modal-overlay');
  if (closeBtn) closeBtn.addEventListener('click', function() { overlay.classList.remove('open'); });
  if (overlay) overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.classList.remove('open'); });
});

async function doCreateTopic() {
  var title = document.getElementById('forum-new-title').value.trim();
  var content = document.getElementById('forum-new-content').value.trim();
  var category = document.getElementById('forum-new-category').value;
  var msg = document.getElementById('forum-modal-msg');
  if (!title) { msg.textContent = 'Le titre est obligatoire.'; msg.style.color = '#991b1b'; return; }
  if (!content) { msg.textContent = 'Le message est obligatoire.'; msg.style.color = '#991b1b'; return; }

  var btn = document.getElementById('forum-new-submit');
  btn.disabled = true; btn.textContent = 'Publication…';

  var res = await sb.from('forum_topics').insert({
    title: title, content: content, category: category, author_id: currentUser.id, status: 'open'
  }).select().single();

  btn.disabled = false; btn.textContent = 'Publier';
  if (res.error) { msg.textContent = res.error.message; msg.style.color = '#991b1b'; return; }

  document.getElementById('forum-modal-overlay').classList.remove('open');
  window.location.href = '/forum/sujet/?id=' + res.data.id;
}
