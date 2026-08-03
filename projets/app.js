/* ============================================================
   PROJETS — archive publique (extrait/adapté de app.js global)
   Page autonome : /projets/index.html + /projets/app.js
   ============================================================ */

var SUPABASE_URL = 'https://qptnjgdfobznwmsguvyf.supabase.co';
var SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwdG5qZ2Rmb2J6bndtc2d1dnlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5MjA3MjIsImV4cCI6MjA5MzQ5NjcyMn0.QLfIITvc-AdWVLZHHghocNYyYyYvPxZZMAXhdl_4Bdo';
var sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

var currentUser = null;
var currentProfile = null;
var allPublicProjects = [];

/* ---------- Helpers (extraits de app.js) ---------- */
function toast(msg, type) {
  if (!type) type = 'success';
  var c = document.getElementById('toast');
  var el = document.createElement('div');
  el.className = 'toast-item ' + type;
  el.textContent = msg;
  c.appendChild(el);
  setTimeout(function() { el.remove(); }, 3500);
}
function showErr(id, msg) {
  var el = document.getElementById(id);
  if (el) { el.textContent = msg; el.classList.remove('hidden'); }
}
function hideErr(id) {
  var el = document.getElementById(id);
  if (el) el.classList.add('hidden');
}

/* ---------- Session (facultative : la page reste publique) ---------- */
async function initSession() {
  var sessionRes = await sb.auth.getSession();
  if (sessionRes.data && sessionRes.data.session && sessionRes.data.session.user) {
    currentUser = sessionRes.data.session.user;
    var profRes = await sb.from('profiles').select('*').eq('id', currentUser.id).single();
    currentProfile = profRes.data || { role: 'student' };
  }
  // Le bouton + n'est proposé qu'aux étudiants connectés (comme sur le tableau de bord)
  var fab = document.getElementById('fab-new-project');
  if (fab) fab.classList.toggle('hidden', !(currentUser && currentProfile && currentProfile.role === 'student'));
}

/* ---------- Chargement des projets approuvés ---------- */
async function loadPublicProjects() {
  var grid = document.getElementById('projets-grid');
  if (grid) grid.innerHTML = '<p style="color:var(--gris);font-family:sans-serif;font-size:0.85rem">Chargement...</p>';

  var res = await sb.from('projects')
    .select('*, student:profiles!student_id(id, full_name, avatar_url, school)')
    .eq('status', 'approved')
    .order('created_at', { ascending: false });

  allPublicProjects = res.data || [];
  renderGrid(allPublicProjects);
}

/* ---------- Filtre par niveau (L1, L2, ...) ---------- */
function filterProjects(level, btn) {
  var btns = document.querySelectorAll('#projets-filters .filter-btn');
  for (var i = 0; i < btns.length; i++) btns[i].classList.remove('active');
  if (btn) btn.classList.add('active');
  var filtered = level === 'all' ? allPublicProjects : allPublicProjects.filter(function(p) { return p.level === level; });
  renderGrid(filtered);
}

/* ---------- Rendu de la grille (carte avec avatar + nom de l'uploader) ---------- */
function renderGrid(projects) {
  var c = document.getElementById('projets-grid');
  if (!c) return;

  if (!projects || projects.length === 0) {
    c.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:3rem;color:var(--gris);font-family:sans-serif;font-size:0.85rem">Aucun projet disponible.</div>';
    return;
  }

  var html = '';
  for (var i = 0; i < projects.length; i++) {
    var p         = projects[i];
    var student   = p.student ? (p.student.full_name || '-') : '-';
    var studentId = p.student ? p.student.id : null;
    var avatarUrl = p.student ? p.student.avatar_url : null;
    var year      = p.academic_year || '';
    var area      = p.area ? p.area + ' m²' : '';
    var program   = p.program_type || '';
    var likes     = p.like_count || 0;
    var views     = p.view_count || 0;
    var pidEsc    = String(p.id).replace(/'/g, "\\'");

    var imgHtml = p.cover_image_url
      ? '<img src="' + p.cover_image_url + '" draggable="false" style="pointer-events:none;display:block;width:100%;height:100%;object-fit:cover">'
      : '<div class="project-card-placeholder">' + p.title.charAt(0) + '</div>';

    var badge = p.level ? '<span class="project-card-badge">' + p.level + '</span>' : '';

    var avatarHtml = avatarUrl
      ? '<img src="' + avatarUrl + '" alt="">'
      : student.charAt(0).toUpperCase();

    var authorHtml = '<div class="project-card-author">'
      + '<div class="project-card-avatar"' + (studentId ? ' onclick="event.stopPropagation();openStudentGallery(\'' + studentId + '\')"' : '') + '>' + avatarHtml + '</div>'
      + '<span class="project-card-student' + (studentId ? ' clickable' : '') + '"' + (studentId ? ' onclick="event.stopPropagation();openStudentGallery(\'' + studentId + '\')"' : '') + '>' + student + '</span>'
      + '</div>';

    html += '<div class="project-card" role="button" tabindex="0" style="cursor:pointer" '
          + 'onclick="openProject(\'' + pidEsc + '\')" '
          + 'onkeydown="if(event.key===\'Enter\'){openProject(\'' + pidEsc + '\')}">';
    html += '<div class="project-card-img">' + imgHtml + badge + '</div>';
    html += '<div class="project-card-body">';
    html += '<h3 class="project-card-title">' + p.title + '</h3>';
    html += '<div class="project-card-meta-row">';
    if (year)    html += '<span class="project-card-meta-item">📅 ' + year + '</span>';
    if (area)    html += '<span class="project-card-meta-item">📐 ' + area + '</span>';
    if (program) html += '<span class="project-card-meta-item">🏛️ ' + program + '</span>';
    html += '</div>';
    html += '<div class="project-card-footer">';
    html += authorHtml;
    html += '<div class="project-card-stats"><span>👁 ' + views + '</span><span>♥ ' + likes + '</span></div>';
    html += '</div>';
    html += '</div></div>';
  }
  c.innerHTML = html;
}

/* ---------- Navigation vers la galerie d'un étudiant / la fiche projet ---------- */
function openStudentGallery(userId) {
  window.location.href = '../galerie/?user=' + userId;
}
function openProject(id) {
  // La fiche projet complète vit dans l'app principale (SPA).
  // Voir la note dans le message de livraison pour brancher ?openProject= côté app.js global.
  window.location.href = '../?openProject=' + id;
}

/* ============================================================
   MODAL DE SOUMISSION — étape 1/2 (identique à /galerie/app.js)
   ============================================================ */
function openSubmitModal() {
  if (!currentUser) { window.location.href = '../?login=1'; return; }
  document.getElementById('submit-modal-overlay').classList.add('open');
}
function closeSubmitModal() {
  document.getElementById('submit-modal-overlay').classList.remove('open');
  hideErr('submit-modal-error');
}

async function doCreateProjectFromModal() {
  hideErr('submit-modal-error');
  if (!currentUser) { window.location.href = '../?login=1'; return; }

  var title = document.getElementById('modal-proj-title').value.trim();
  if (!title) { showErr('submit-modal-error', 'Le nom du projet est obligatoire.'); return; }

  var btn = document.getElementById('modal-submit-btn');
  if (btn.disabled) return;
  btn.disabled = true;
  btn.textContent = 'Création en cours...';

  try {
    var res = await sb.from('projects').insert({
      title:         title,
      description:   document.getElementById('modal-proj-desc').value || null,
      program_type:  document.getElementById('modal-proj-category').value || null,
      academic_year: document.getElementById('modal-proj-year').value || null,
      area:          parseInt(document.getElementById('modal-proj-area').value) || null,
      student_id:    currentUser.id,
      status:        'draft',
      cover_image_url: null
    }).select().single();

    if (res.error) {
      showErr('submit-modal-error', res.error.message);
      btn.disabled = false;
      btn.textContent = 'Créer et continuer →';
      return;
    }

    toast('Projet créé !');
    // Étape 2 (coupes, plans de masse, façades, etc.) : page principale.
    window.location.href = '../?editProject=' + res.data.id;
  } catch (e) {
    showErr('submit-modal-error', 'Erreur : ' + e.message);
    btn.disabled = false;
    btn.textContent = 'Créer et continuer →';
  }
}

/* ---------- Init ---------- */
document.addEventListener('DOMContentLoaded', async function() {
  await initSession();
  loadPublicProjects();
});
