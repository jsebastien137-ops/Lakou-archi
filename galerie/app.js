/* ============================================================
   GALERIE — profil personnel (extrait/adapté de app.js global)
   Page autonome : /galerie/index.html + /galerie/app.js
   ============================================================ */

var SUPABASE_URL = 'https://qptnjgdfobznwmsguvyf.supabase.co';
var SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwdG5qZ2Rmb2J6bndtc2d1dnlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5MjA3MjIsImV4cCI6MjA5MzQ5NjcyMn0.QLfIITvc-AdWVLZHHghocNYyYyYvPxZZMAXhdl_4Bdo';
var sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

var currentUser = null;
var currentProfile = null;
var targetUserId = null;
var isOwnGallery = false;

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

/* ---------- Récupération de l'utilisateur ciblé (?user=) ---------- */
function getTargetUserIdFromUrl() {
  var params = new URLSearchParams(window.location.search);
  return params.get('user');
}

/* ---------- Chargement de la galerie ---------- */
async function loadGalerie() {
  var sessionRes = await sb.auth.getSession();
  if (!sessionRes.data || !sessionRes.data.session || !sessionRes.data.session.user) {
    // Pas connecté → retour à l'accueil (qui gère la connexion)
    window.location.href = '../?login=1';
    return;
  }
  currentUser = sessionRes.data.session.user;

  var urlUserId = getTargetUserIdFromUrl();
  targetUserId  = urlUserId || currentUser.id;
  isOwnGallery  = targetUserId === currentUser.id;

  var grid = document.getElementById('galerie-grid');
  if (grid) grid.innerHTML = '<p style="color:var(--gris);font-family:sans-serif;font-size:0.85rem">Chargement...</p>';

  var profileRes = await sb.from('profiles')
    .select('full_name, avatar_url, bio, specialty, location, role, school')
    .eq('id', targetUserId)
    .single();
  var profile = profileRes.data;
  if (isOwnGallery) currentProfile = profile;

  renderProfileHeader(profile);

  var query = sb.from('projects')
    .select('*, student:profiles!student_id(id, full_name, avatar_url, school)')
    .eq('student_id', targetUserId)
    .order('created_at', { ascending: false });

  if (!isOwnGallery) query = query.eq('status', 'approved');

  var res = await query;
  var projects = res.data || [];

  renderProjectGrid(projects);

  var fab = document.getElementById('fab-new-project');
  if (fab) fab.classList.toggle('hidden', !isOwnGallery);
}

function renderProfileHeader(profile) {
  var avatarEl   = document.getElementById('galerie-avatar');
  var titleEl    = document.getElementById('galerie-title');
  var schoolEl   = document.getElementById('galerie-school');
  var bioEl      = document.getElementById('galerie-bio');
  var badgeEl    = document.getElementById('galerie-badge');

  if (avatarEl) {
    if (profile && profile.avatar_url) {
      avatarEl.innerHTML = '<img src="' + profile.avatar_url + '" alt="">';
    } else {
      avatarEl.textContent = (profile && profile.full_name ? profile.full_name : 'E').charAt(0).toUpperCase();
    }
  }

  if (titleEl) titleEl.textContent = isOwnGallery ? 'Ma Galerie' : (profile ? profile.full_name : 'Galerie');

  if (schoolEl) schoolEl.textContent = profile && profile.school ? profile.school : '';

  if (bioEl) bioEl.textContent = profile && profile.bio ? profile.bio : '';

  if (badgeEl) {
    if (!isOwnGallery && profile) {
      var roleLabels = {
        student : '🎓 Étudiant(e)',
        teacher : '📐 Enseignant · Architecte',
        admin   : '⚙️ Administrateur',
        visitor : '👁 Visiteur'
      };
      var roleText = roleLabels[profile.role] || '🎓 Étudiant(e)';
      badgeEl.innerHTML = '<span style="display:inline-block;padding:0.22rem 0.7rem;'
        + 'background:rgba(193,123,63,0.18);color:var(--ocre);'
        + 'border-radius:2rem;font-size:0.72rem;font-family:sans-serif;font-weight:600;'
        + 'letter-spacing:0.04em">' + roleText + '</span>';
    } else {
      badgeEl.innerHTML = '';
    }
  }
}

/* ---------- Grille de projets (carte identique au reste du site) ---------- */
function renderProjectGrid(projects) {
  var c = document.getElementById('galerie-grid');
  if (!c) return;

  if (!projects || projects.length === 0) {
    c.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:3rem;color:var(--gris);font-family:sans-serif;font-size:0.85rem">'
      + (isOwnGallery ? 'Aucun projet pour le moment. Utilise le bouton + pour déposer ton premier projet.' : "Cet étudiant n'a pas encore de projet publié.")
      + '</div>';
    return;
  }

  var html = '';
  for (var i = 0; i < projects.length; i++) {
    var p       = projects[i];
    var year    = p.academic_year || '';
    var area    = p.area ? p.area + ' m²' : '';
    var program = p.program_type || '';
    var likes   = p.like_count || 0;
    var views   = p.view_count || 0;
    var pidEsc  = String(p.id).replace(/'/g, "\\'");

    var imgHtml = p.cover_image_url
      ? '<img src="' + p.cover_image_url + '" draggable="false" style="pointer-events:none;display:block;width:100%;height:100%;object-fit:cover">'
      : '<div class="project-card-placeholder">' + p.title.charAt(0) + '</div>';

    var badge = p.level ? '<span class="project-card-badge">' + p.level + '</span>' : '';
    var statusTag = isOwnGallery ? '<span class="status-' + p.status + '" style="margin-left:0.5rem">'
      + (p.status === 'draft' ? 'Brouillon' : p.status === 'pending' ? 'En attente' : p.status === 'approved' ? 'Approuvé' : 'Refusé')
      + '</span>' : '';

    html += '<div class="project-card" role="button" tabindex="0" style="cursor:pointer" '
          + 'onclick="openProject(\'' + pidEsc + '\')" '
          + 'onkeydown="if(event.key===\'Enter\'){openProject(\'' + pidEsc + '\')}">';
    html += '<div class="project-card-img">' + imgHtml + badge + '</div>';
    html += '<div class="project-card-body">';
    html += '<h3 class="project-card-title">' + p.title + statusTag + '</h3>';
    if (p.description) {
      html += '<p class="project-card-desc" style="font-size:0.78rem;color:var(--gris);font-family:sans-serif;margin:0.3rem 0 0.5rem;line-height:1.4">' + p.description + '</p>';
    }
    html += '<div class="project-card-meta-row">';
    if (year)    html += '<span class="project-card-meta-item">📅 ' + year + '</span>';
    if (area)    html += '<span class="project-card-meta-item">📐 ' + area + '</span>';
    if (program) html += '<span class="project-card-meta-item">🏛️ ' + program + '</span>';
    html += '</div>';
    html += '<div class="project-card-footer">';
    html += '<div class="project-card-stats"><span>👁 ' + views + '</span><span>♥ ' + likes + '</span></div>';
    html += '</div>';
    if (isOwnGallery) {
      html += '<button class="project-delete-btn" onclick="event.stopPropagation();deleteProject(\'' + pidEsc + '\')" style="margin-top:0.5rem;background:none;border:none;color:#ccc;font-size:0.75rem;cursor:pointer;font-family:sans-serif">🗑 Supprimer</button>';
    }
    html += '</div></div>';
  }
  c.innerHTML = html;
}

/* ---------- Ouvrir le détail d'un projet ---------- */
function openProject(id) {
  window.location.href = '/projet/?id=' + id;
}

/* ---------- Suppression rapide (identique à app.js) ---------- */
async function deleteProject(id) {
  if (!confirm('Supprimer ce projet définitivement ?')) return;
  var res = await sb.from('projects').delete().eq('id', id);
  if (res.error) { toast('Erreur : ' + res.error.message, 'error'); return; }
  toast('Projet supprimé.');
  loadGalerie();
}

/* ============================================================
   MODAL DE SOUMISSION — étape 1/2 (infos de base uniquement)
   La suite (coupes, plans de masse, façades...) se fait sur la
   page "edit-project" de l'app principale, après redirection.
   ============================================================ */
function openSubmitModal() {
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
document.addEventListener('DOMContentLoaded', loadGalerie);
