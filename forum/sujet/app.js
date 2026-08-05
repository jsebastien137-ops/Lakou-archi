/* ============================================================
   FORUM — /forum/sujet/index.html + app.js (détail d'un sujet)
   ============================================================ */

var SUPABASE_URL = 'https://qptnjgdfobznwmsguvyf.supabase.co';
var SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwdG5qZ2Rmb2J6bndtc2d1dnlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5MjA3MjIsImV4cCI6MjA5MzQ5NjcyMn0.QLfIITvc-AdWVLZHHghocNYyYyYvPxZZMAXhdl_4Bdo';
var sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

var currentUser = null;
var currentProfile = null;
var topicId = null;
var topicData = null;
var repliesCache = [];
var votesCache = []; // {id, reply_id, user_id, vote_type}

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
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) + ' à ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}
function escapeHtml(s) {
  var div = document.createElement('div');
  div.textContent = s || '';
  return div.innerHTML;
}

/* ---------- Garde d'accès + init ---------- */
(async function initSujet() {
  var params = new URLSearchParams(window.location.search);
  topicId = params.get('id');
  if (!topicId) { window.location.href = '/forum/'; return; }

  var sessionRes = await sb.auth.getSession();
  if (!sessionRes.data || !sessionRes.data.session || !sessionRes.data.session.user) {
    window.location.href = '/login/'; return;
  }
  currentUser = sessionRes.data.session.user;

  var profRes = await sb.from('profiles').select('*').eq('id', currentUser.id).single();
  currentProfile = profRes.data;
  var role = currentProfile ? currentProfile.role : null;
  if (!role || role === 'visitor') { window.location.href = '/dashboard/'; return; }

  await loadTopic();
})();

/* ---------- Chargement du sujet ---------- */
async function loadTopic() {
  var res = await sb.from('forum_topics')
    .select('*, author:profiles!author_id(full_name, avatar_url)')
    .eq('id', topicId)
    .single();

  if (res.error || !res.data) {
    document.getElementById('sujet-guard-msg').textContent = 'Ce sujet est introuvable ou inaccessible.';
    return;
  }
  topicData = res.data;

  document.getElementById('sujet-guard-msg').classList.add('hidden');
  document.getElementById('sujet-content').classList.remove('hidden');
  document.title = topicData.title + ' — Forum Lakou Achitekti';

  renderTopic();
  renderResolveBar();
  await loadReplies();
}

function renderTopic() {
  var t = topicData;
  var author = t.author ? t.author.full_name : '—';
  var resolved = t.status === 'resolved';
  var html = '';
  html += '<span class="forum-topic-cat">' + (CAT_LABELS[t.category] || t.category) + '</span>';
  if (resolved) html += '<span class="forum-topic-resolved">🔒 Résolu</span>';
  html += '<h1 class="forum-detail-title">' + escapeHtml(t.title) + '</h1>';
  html += '<div class="forum-topic-meta">' + escapeHtml(author) + ' · ' + formatDate(t.created_at) + '</div>';
  html += '<div class="forum-detail-content">' + escapeHtml(t.content).replace(/\n/g, '<br>') + '</div>';
  document.getElementById('forum-topic-detail').innerHTML = html;

  var locked = resolved;
  document.getElementById('forum-reply-form').classList.toggle('hidden', locked);
  document.getElementById('forum-locked-msg').classList.toggle('hidden', !locked);
}

function renderResolveBar() {
  var bar = document.getElementById('admin-resolve-bar');
  if (!currentProfile || currentProfile.role !== 'admin') { bar.classList.add('hidden'); return; }
  bar.classList.remove('hidden');
  var resolved = topicData.status === 'resolved';
  bar.innerHTML = '<button class="form-btn-cancel" onclick="toggleResolved()">' +
    (resolved ? 'Rouvrir le sujet' : 'Marquer comme résolu') + '</button>';
}

async function toggleResolved() {
  var newStatus = topicData.status === 'resolved' ? 'open' : 'resolved';
  var res = await sb.from('forum_topics').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', topicId);
  if (res.error) { toast(res.error.message, 'error'); return; }
  topicData.status = newStatus;
  toast(newStatus === 'resolved' ? 'Sujet marqué comme résolu.' : 'Sujet rouvert.');
  renderTopic();
  renderResolveBar();
}

/* ---------- Réponses + votes ---------- */
async function loadReplies() {
  var list = document.getElementById('forum-replies-list');
  list.innerHTML = '<p class="forum-loading">Chargement des réponses…</p>';

  var res = await sb.from('forum_replies')
    .select('*, author:profiles!author_id(full_name, avatar_url)')
    .eq('topic_id', topicId)
    .order('created_at', { ascending: true });

  repliesCache = res.data || [];
  document.getElementById('forum-replies-count').textContent = repliesCache.length + ' réponse' + (repliesCache.length > 1 ? 's' : '');

  if (repliesCache.length === 0) {
    votesCache = [];
    list.innerHTML = '<p class="forum-loading">Aucune réponse pour le moment.</p>';
    return;
  }

  var replyIds = repliesCache.map(function(r) { return r.id; });
  var votesRes = await sb.from('forum_reply_votes').select('*').in('reply_id', replyIds);
  votesCache = votesRes.data || [];

  renderReplies();
}

function renderReplies() {
  var list = document.getElementById('forum-replies-list');
  var html = '';
  for (var i = 0; i < repliesCache.length; i++) {
    var r = repliesCache[i];
    var author = r.author ? r.author.full_name : '—';
    var repliesVotes = votesCache.filter(function(v) { return v.reply_id === r.id; });
    var usefulCount = repliesVotes.filter(function(v) { return v.vote_type === 'useful'; }).length;
    var notRelevantCount = repliesVotes.filter(function(v) { return v.vote_type === 'not_relevant'; }).length;
    var myVote = repliesVotes.find(function(v) { return v.user_id === currentUser.id; });

    html += '<div class="forum-reply-card">';
    html += '<div class="forum-topic-meta">' + escapeHtml(author) + ' · ' + formatDate(r.created_at) + '</div>';
    html += '<div class="forum-reply-content">' + escapeHtml(r.content).replace(/\n/g, '<br>') + '</div>';
    html += '<div class="forum-vote-row">';
    html += '<button class="forum-vote-btn' + (myVote && myVote.vote_type === 'useful' ? ' active' : '') + '" onclick="doVote(\'' + r.id + '\',\'useful\')">👍 Utile (' + usefulCount + ')</button>';
    html += '<button class="forum-vote-btn' + (myVote && myVote.vote_type === 'not_relevant' ? ' active' : '') + '" onclick="doVote(\'' + r.id + '\',\'not_relevant\')">👎 Non pertinent (' + notRelevantCount + ')</button>';
    html += '</div></div>';
  }
  list.innerHTML = html;
}

async function doVote(replyId, type) {
  var existing = votesCache.find(function(v) { return v.reply_id === replyId && v.user_id === currentUser.id; });

  if (existing && existing.vote_type === type) {
    // Même vote reclique → on le retire
    var delRes = await sb.from('forum_reply_votes').delete().eq('id', existing.id);
    if (delRes.error) { toast(delRes.error.message, 'error'); return; }
    votesCache = votesCache.filter(function(v) { return v.id !== existing.id; });
  } else if (existing) {
    // Vote existant, type différent → on le change
    var updRes = await sb.from('forum_reply_votes').update({ vote_type: type }).eq('id', existing.id);
    if (updRes.error) { toast(updRes.error.message, 'error'); return; }
    existing.vote_type = type;
  } else {
    // Pas de vote encore → on l'ajoute
    var insRes = await sb.from('forum_reply_votes').insert({ reply_id: replyId, user_id: currentUser.id, vote_type: type }).select().single();
    if (insRes.error) { toast(insRes.error.message, 'error'); return; }
    votesCache.push(insRes.data);
  }
  renderReplies();
}

async function doPostReply() {
  var content = document.getElementById('forum-reply-content').value.trim();
  if (!content) { toast('Écris une réponse avant d\'envoyer.', 'error'); return; }

  var btn = document.getElementById('forum-reply-submit');
  btn.disabled = true; btn.textContent = 'Envoi…';

  var res = await sb.from('forum_replies').insert({ topic_id: topicId, content: content, author_id: currentUser.id });

  btn.disabled = false; btn.textContent = 'Répondre';
  if (res.error) { toast(res.error.message, 'error'); return; }

  document.getElementById('forum-reply-content').value = '';
  toast('Réponse publiée !');
  loadReplies();
}
