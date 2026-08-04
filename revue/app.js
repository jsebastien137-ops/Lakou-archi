/* ============================================================
   REVUE — /revue/app.js (page liste)
   Module autonome et réutilisable : seule la section CONFIG
   ci-dessous change d'un site Lakou à l'autre.
   ============================================================ */

var REVUE_CONFIG = {
  supabaseUrl: 'https://qptnjgdfobznwmsguvyf.supabase.co',
  supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwdG5qZ2Rmb2J6bndtc2d1dnlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5MjA3MjIsImV4cCI6MjA5MzQ5NjcyMn0.QLfIITvc-AdWVLZHHghocNYyYyYvPxZZMAXhdl_4Bdo',
  pageSize: 12
};

var sb = supabase.createClient(REVUE_CONFIG.supabaseUrl, REVUE_CONFIG.supabaseKey);

var revueCategories  = [];
var revueCategoryId  = '';   // '' = toutes
var revueSearchTerm  = '';
var revuePage        = 0;
var revueSearchTimer = null;

/* ---------- Helpers ---------- */
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
function formatDuration(seconds) {
  if (!seconds) return '';
  var m = Math.floor(seconds / 60);
  var s = Math.floor(seconds % 60);
  return m + ':' + (s < 10 ? '0' : '') + s;
}
function formatDate(iso) {
  if (!iso) return '';
  var d = new Date(iso);
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
}

/* ---------- Catégories ---------- */
async function loadRevueCategories() {
  var res = await sb.from('revue_categories').select('*').order('sort_order', { ascending: true });
  revueCategories = res.data || [];
  var c = document.getElementById('revue-categories');
  if (!c) return;
  var html = '<button class="revue-cat-pill active" data-slug="" onclick="setRevueCategory(\'\', this)">Tout</button>';
  for (var i = 0; i < revueCategories.length; i++) {
    var cat = revueCategories[i];
    html += '<button class="revue-cat-pill" data-id="' + cat.id + '" onclick="setRevueCategory(\'' + cat.id + '\', this)">' + cat.label + '</button>';
  }
  c.innerHTML = html;
}

function setRevueCategory(categoryId, btn) {
  revueCategoryId = categoryId;
  var pills = document.querySelectorAll('.revue-cat-pill');
  for (var i = 0; i < pills.length; i++) pills[i].classList.remove('active');
  if (btn) btn.classList.add('active');
  loadRevuePosts(true);
}

function onRevueSearchInput() {
  clearTimeout(revueSearchTimer);
  revueSearchTimer = setTimeout(function() {
    revueSearchTerm = document.getElementById('revue-search').value.trim();
    loadRevuePosts(true);
  }, 400);
}

/* ---------- Publications ---------- */
async function loadRevuePosts(reset) {
  if (reset) { revuePage = 0; document.getElementById('revue-grid').innerHTML = ''; }

  var loadMoreBtn = document.getElementById('revue-load-more-btn');
  var loadMoreWrap = document.getElementById('revue-load-more-wrap');
  if (loadMoreBtn) { loadMoreBtn.disabled = true; loadMoreBtn.textContent = 'Chargement...'; }

  var from = revuePage * REVUE_CONFIG.pageSize;
  var to   = from + REVUE_CONFIG.pageSize - 1;

  var query = sb.from('revue_posts')
    .select('*, category:revue_categories(id, slug, label), author:profiles!author_id(full_name, avatar_url)')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .range(from, to);

  if (revueCategoryId) query = query.eq('category_id', revueCategoryId);
  if (revueSearchTerm) query = query.ilike('title', '%' + revueSearchTerm + '%');

  var res = await query;
  var posts = res.data || [];

  if (reset && posts.length === 0) {
    document.getElementById('revue-grid').innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:3rem;color:var(--gris);font-family:sans-serif;font-size:0.85rem">Aucune publication pour le moment.</div>';
  } else {
    renderRevueCards(posts);
  }

  revuePage++;
  if (loadMoreWrap) loadMoreWrap.classList.toggle('hidden', posts.length < REVUE_CONFIG.pageSize);
  if (loadMoreBtn) { loadMoreBtn.disabled = false; loadMoreBtn.textContent = 'Charger plus'; }
}

function renderRevueCards(posts) {
  var grid = document.getElementById('revue-grid');
  var html = '';
  for (var i = 0; i < posts.length; i++) {
    var p = posts[i];
    var catLabel = p.category ? p.category.label : '';
    var author   = p.author ? p.author.full_name : '';
    var duration = p.video_duration_seconds ? '<span class="revue-card-duration">▶ ' + formatDuration(p.video_duration_seconds) + '</span>' : '';
    var imgHtml  = p.cover_image_url
      ? '<img src="' + p.cover_image_url + '" alt="">'
      : '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:var(--gris);font-family:serif;font-size:2rem">' + p.title.charAt(0) + '</div>';

    html += '<div class="revue-card" onclick="window.location.href=\'article.html?id=' + p.id + '\'">';
    html += '<div class="revue-card-img">' + imgHtml + duration;
    if (catLabel) html += '<span class="revue-card-cat">' + catLabel + '</span>';
    html += '</div>';
    html += '<div class="revue-card-body">';
    html += '<h3 class="revue-card-title">' + p.title + '</h3>';
    if (p.summary) html += '<p class="revue-card-summary">' + p.summary + '</p>';
    html += '<div class="revue-card-meta">';
    if (author) html += '<span>' + author + '</span><span class="dot">·</span>';
    html += '<span>' + formatDate(p.published_at || p.created_at) + '</span>';
    html += '</div></div></div>';
  }
  grid.insertAdjacentHTML('beforeend', html);
}

/* ---------- Init ---------- */
document.addEventListener('DOMContentLoaded', async function() {
  loadRevueCategories();
  loadRevuePosts(true);

  // Barre admin (bouton "Nouvelle publication") — visible seulement si role=admin
  try {
    var sessionRes = await sb.auth.getSession();
    if (sessionRes.data && sessionRes.data.session && sessionRes.data.session.user) {
      var uid = sessionRes.data.session.user.id;
      var profRes = await sb.from('profiles').select('role').eq('id', uid).single();
      if (profRes.data && profRes.data.role === 'admin') {
        var bar = document.getElementById('revue-admin-bar');
        if (bar) bar.classList.remove('hidden');
      }
    }
  } catch (e) { /* visiteur non connecté : rien à faire */ }
});
