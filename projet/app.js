/* ============================================================
   PROJET — /projet/app.js (fiche détaillée d'un projet)
   Remplace les anciennes fonctions dupliquées tdToggleLike/
   doToggleLike (sans gestion d'erreur, jamais réellement
   branchées à une page) par une seule implémentation propre.
   ============================================================ */

var SUPABASE_URL = 'https://qptnjgdfobznwmsguvyf.supabase.co';
var SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwdG5qZ2Rmb2J6bndtc2d1dnlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5MjA3MjIsImV4cCI6MjA5MzQ5NjcyMn0.QLfIITvc-AdWVLZHHghocNYyYyYvPxZZMAXhdl_4Bdo';
var sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

var currentUser = null;
var currentProjectId = null;
var isLiked = false;

var STATUS_LABELS = { draft: 'Brouillon', pending: 'En attente', approved: 'Approuvé', rejected: 'Refusé' };
var TD_ORDER  = ['plan_masse', 'niveaux', 'coupes', 'facades', 'structure', 'rendus'];
var TD_LABELS = {
  plan_masse: '🗺 Plan de masse / Implantation',
  niveaux:    '📐 Niveaux & Étages',
  coupes:     '✂️ Coupes',
  facades:    '🏛 Façades',
  structure:  '⚙️ Structure',
  rendus:     '🎨 Rendus'
};

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
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

/* ---------- Chargement du projet ---------- */
async function loadProject() {
  var params = new URLSearchParams(window.location.search);
  var id = params.get('id');
  currentProjectId = id;
  if (!id) { document.getElementById('pd-loading').textContent = 'Projet introuvable.'; return; }

  var res = await sb.from('projects')
    .select('*, student:profiles!student_id(id, full_name, avatar_url, school), school:schools(name), stages:project_stages(*, images:stage_images(*)), images:project_images(*)')
    .eq('id', id)
    .single();

  var p = res.data;
  if (!p) { document.getElementById('pd-loading').textContent = 'Projet introuvable.'; return; }

  document.getElementById('pd-loading').classList.add('hidden');
  document.getElementById('pd-root').classList.remove('hidden');
  document.title = p.title + ' — Lakou Achitekti';

  // Vue comptée une fois par session (cohérent avec le reste du site)
  var viewedKey = 'viewed_project_' + id;
  if (!sessionStorage.getItem(viewedKey)) {
    sessionStorage.setItem(viewedKey, '1');
    sb.rpc('increment_view_count', { project_id: id }).then(function(){}, function(){});
  }

  if (p.cover_image_url) {
    document.getElementById('pd-cover-img').src = p.cover_image_url;
    document.getElementById('pd-cover-wrap').classList.remove('hidden');
  }
  document.getElementById('pd-status').textContent = STATUS_LABELS[p.status] || p.status;
  document.getElementById('pd-title').textContent = p.title;
  document.getElementById('pd-desc').textContent = p.description || 'Aucune description.';

  var metaParts = [];
  if (p.school) metaParts.push('<span><strong>École</strong> ' + p.school.name + '</span>');
  if (p.level) metaParts.push('<span><strong>Classe</strong> ' + p.level + '</span>');
  if (p.academic_year) metaParts.push('<span><strong>Année</strong> ' + p.academic_year + '</span>');
  if (p.area) metaParts.push('<span><strong>Superficie</strong> ' + p.area + ' m²</span>');
  metaParts.push('<span><strong>Vues</strong> ' + (p.view_count || 0) + '</span>');
  document.getElementById('pd-meta').innerHTML = metaParts.join('');

  if (p.student) {
    var avatarHtml = p.student.avatar_url
      ? '<img src="' + p.student.avatar_url + '" alt="">'
      : (p.student.full_name || '?').charAt(0).toUpperCase();
    document.getElementById('pd-author').innerHTML =
      '<div class="pd-author-avatar" onclick="window.location.href=\'/galerie/?user=' + p.student.id + '\'">' + avatarHtml + '</div>' +
      '<span class="pd-author-name" onclick="window.location.href=\'/galerie/?user=' + p.student.id + '\'">' + p.student.full_name + '</span>';
  }

  renderTimeline(p.stages || []);
  renderDossier(p.images || []);

  if (currentUser && (currentUser.id === p.student_id || window.__isAdmin)) {
    document.getElementById('pd-edit-btn').classList.remove('hidden');
  }

  await loadLikeState();
  await loadComments();
  setupCommentForm();
}

/* ---------- Évolution du projet (timeline) ---------- */
function renderTimeline(stages) {
  stages = stages.slice().sort(function(a, b) { return a.order_index - b.order_index; });
  if (!stages.length) return;
  document.getElementById('pd-timeline-section').classList.remove('hidden');
  var html = '';
  stages.forEach(function(s) {
    var imgs = s.images || [];
    html += '<div class="pd-timeline-stage">';
    html += '<div class="pd-timeline-stage-title">' + s.title + '</div>';
    if (s.description) html += '<p class="pd-timeline-stage-desc">' + s.description + '</p>';
    if (imgs.length) {
      html += '<div class="pd-timeline-imgs">';
      imgs.forEach(function(img) {
        html += '<img src="' + img.url + '" alt="" onclick="window.open(\'' + img.url + '\',\'_blank\')">';
      });
      html += '</div>';
    }
    html += '</div>';
  });
  document.getElementById('pd-timeline').innerHTML = html;
}

/* ---------- Dossier technique (par catégorie) ---------- */
function renderDossier(images) {
  images = (images || []).filter(function(img) { return img.category && img.category !== 'cover'; });
  if (!images.length) return;
  document.getElementById('pd-dossier-section').classList.remove('hidden');

  var byCategory = {};
  images.forEach(function(img) {
    if (!byCategory[img.category]) byCategory[img.category] = [];
    byCategory[img.category].push(img);
  });

  var keys = TD_ORDER.filter(function(k) { return byCategory[k] && byCategory[k].length; });
  var extras = Object.keys(byCategory).filter(function(k) { return TD_ORDER.indexOf(k) === -1; });

  var html = '';
  keys.concat(extras).forEach(function(cat) {
    var imgs = byCategory[cat].slice().sort(function(a, b) { return a.order_index - b.order_index; });
    var label = TD_LABELS[cat] || cat;
    html += '<div class="pd-dossier-group">';
    html += '<p class="pd-dossier-label">' + label + '</p>';
    html += '<div class="pd-dossier-grid">';
    imgs.forEach(function(img) {
      html += '<img src="' + img.url + '" alt="' + (img.alt_text || '') + '" onclick="window.open(\'' + img.url + '\',\'_blank\')">';
    });
    html += '</div></div>';
  });
  document.getElementById('pd-dossier').innerHTML = html;
}

/* ============================================================
   LIKES — implémentation unique, avec vraie gestion d'erreur
   ============================================================ */
async function loadLikeState() {
  var countRes = await sb.from('likes').select('*', { count: 'exact', head: true }).eq('project_id', currentProjectId);
  document.getElementById('pd-like-count').textContent = countRes.count || 0;

  if (currentUser) {
    var res = await sb.from('likes').select('id').eq('project_id', currentProjectId).eq('user_id', currentUser.id).maybeSingle();
    isLiked = !!(res.data);
    updateLikeButton();
  }
}

function updateLikeButton() {
  var btn = document.getElementById('pd-like-btn');
  var icon = document.getElementById('pd-like-icon');
  btn.classList.toggle('liked', isLiked);
  icon.textContent = isLiked ? '♥' : '♡';
}

async function toggleLike() {
  if (!currentUser) { toast('Connecte-toi pour liker.', 'error'); window.location.href = '/?login=1'; return; }
  var btn = document.getElementById('pd-like-btn');
  btn.disabled = true;

  try {
    if (isLiked) {
      var del = await sb.from('likes').delete().eq('project_id', currentProjectId).eq('user_id', currentUser.id);
      if (del.error) throw del.error;
      isLiked = false;
    } else {
      var ins = await sb.from('likes').insert({ project_id: currentProjectId, user_id: currentUser.id });
      if (ins.error) throw ins.error;
      isLiked = true;
    }
    var countRes = await sb.from('likes').select('*', { count: 'exact', head: true }).eq('project_id', currentProjectId);
    document.getElementById('pd-like-count').textContent = countRes.count || 0;
    updateLikeButton();
  } catch (e) {
    toast("Le like n'a pas pu être enregistré : " + (e.message || e), 'error');
  } finally {
    btn.disabled = false;
  }
}

/* ============================================================
   COMMENTAIRES
   ============================================================ */
function setupCommentForm() {
  if (currentUser) {
    document.getElementById('pd-comment-form').classList.remove('hidden');
  } else {
    document.getElementById('pd-comment-login-msg').classList.remove('hidden');
  }
}

async function loadComments() {
  var list = document.getElementById('pd-comments-list');
  var res = await sb.from('project_comments')
    .select('*, author:profiles!user_id(id, full_name, avatar_url)')
    .eq('project_id', currentProjectId)
    .order('created_at', { ascending: true });

  if (res.error) {
    list.innerHTML = '<p style="font-size:0.8rem;color:var(--gris);font-family:sans-serif;font-style:italic">Commentaires indisponibles.</p>';
    return;
  }
  var comments = res.data || [];
  if (!comments.length) {
    list.innerHTML = '<p style="font-size:0.8rem;color:var(--gris);font-family:sans-serif;font-style:italic">Aucun commentaire pour le moment.</p>';
    return;
  }

  var html = '';
  comments.forEach(function(c) {
    var author = c.author ? c.author.full_name : 'Anonyme';
    var avatarHtml = c.author && c.author.avatar_url
      ? '<img src="' + c.author.avatar_url + '" alt="">'
      : (author || '?').charAt(0).toUpperCase();
    var canDelete = currentUser && (currentUser.id === c.user_id || window.__isAdmin);
    html += '<div class="pd-comment">';
    html += '<div class="pd-comment-avatar">' + avatarHtml + '</div>';
    html += '<div class="pd-comment-body">';
    html += '<div class="pd-comment-head"><span class="pd-comment-author">' + author + '</span><span class="pd-comment-date">' + formatDate(c.created_at) + '</span></div>';
    html += '<p class="pd-comment-text">' + c.content + '</p>';
    if (canDelete) html += '<button class="pd-comment-delete" onclick="deleteComment(\'' + c.id + '\')">Supprimer</button>';
    html += '</div></div>';
  });
  list.innerHTML = html;
}

async function postComment() {
  if (!currentUser) { window.location.href = '/?login=1'; return; }
  var input = document.getElementById('pd-comment-input');
  var text = input.value.trim();
  if (!text) return;

  var res = await sb.from('project_comments').insert({
    project_id: currentProjectId,
    user_id: currentUser.id,
    content: text
  });
  if (res.error) { toast("Le commentaire n'a pas pu être publié : " + res.error.message, 'error'); return; }

  input.value = '';
  toast('Commentaire publié !');
  await loadComments();
}

async function deleteComment(commentId) {
  if (!confirm('Supprimer ce commentaire ?')) return;
  var res = await sb.from('project_comments').delete().eq('id', commentId);
  if (res.error) { toast(res.error.message, 'error'); return; }
  await loadComments();
}

/* ---------- Init ---------- */
document.addEventListener('DOMContentLoaded', async function() {
  try {
    var sessionRes = await sb.auth.getSession();
    if (sessionRes.data && sessionRes.data.session && sessionRes.data.session.user) {
      currentUser = sessionRes.data.session.user;
      var profRes = await sb.from('profiles').select('role').eq('id', currentUser.id).single();
      window.__isAdmin = !!(profRes.data && profRes.data.role === 'admin');
    }
  } catch (e) { /* visiteur non connecté */ }

  await loadProject();
});
