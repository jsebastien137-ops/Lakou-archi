/* ============================================================
   dashboard/app.js — Lakou Archi
   Logique propre au Tableau de bord.
   Dépend des fonctions partagées de /app.js : sb, toast, currentUser,
   currentProfile.
   ============================================================ */

var ATELIER_TYPES_DASH = [
  { key: 'sketches',   label: 'Carnets de croquis' },
  { key: 'conceptual', label: 'Maquettes conceptuelles' },
  { key: 'plans',      label: 'Plans en cours' },
  { key: 'evolution',  label: 'Évolutions du projet' },
  { key: 'validated',  label: 'Plans définitifs validés' },
  { key: 'final',      label: 'Maquettes finales' },
  { key: 'artistic',   label: 'Travaux artistiques' }
];

var STATUS_LABEL_DASH = { draft: 'Brouillon', pending: 'En attente', approved: 'Approuvé', rejected: 'Refusé' };

(async function initDashboard() {
  var sessionRes = await sb.auth.getSession();
  if (!sessionRes.data.session) { window.location.href = '/login/'; return; }

  if (!currentUser) currentUser = sessionRes.data.session.user;
  if (!currentProfile) {
    var pRes = await sb.from('profiles').select('*').eq('id', currentUser.id).single();
    currentProfile = pRes.data || { role: 'student', full_name: currentUser.email, email: currentUser.email, id: currentUser.id };
  }

  document.getElementById('dash-loading').style.display = 'none';
  document.getElementById('dash-welcome').style.display = 'block';
  document.getElementById('dash-settings-toolbar').style.display = 'block';

  var nom = currentProfile.full_name || currentUser.email;
  var role = currentProfile.role || 'student';
  var roleLabels = { student: 'étudiant·e', teacher: 'enseignant·e', admin: 'administrateur·rice', visitor: 'visiteur·se' };

  document.getElementById('dash-title-bienvenue').textContent = 'Bonjour, ' + nom;
  document.getElementById('dash-sub-role').textContent = 'Connecté·e en tant que ' + (roleLabels[role] || role) + ' — Lakou Achitekti';

  if (role === 'visitor') {
    // Visiteur : pas d'ateliers persos, pas de FAB, juste ses infos de base
    return;
  }

  document.getElementById('dash-ateliers').style.display = 'block';
  document.getElementById('dash-projects').style.display = 'block';
  document.getElementById('dash-fab-container').classList.remove('hidden');
  loadDashAteliers();
  loadDashProjects();

  if (role === 'admin') {
    document.getElementById('dash-stats').style.display = 'block';
    loadDashStats();
  }
  if (role === 'admin' || role === 'teacher') {
    document.getElementById('dash-admin').style.display = 'block';
    loadDashUsers();
  }
})();

/* ------------------------------------------------------------
   Mes ateliers — mini-cartes avec compteur en temps réel
------------------------------------------------------------ */
async function loadDashAteliers() {
  var grid = document.getElementById('dash-ateliers-grid');
  grid.innerHTML = '';
  for (var i = 0; i < ATELIER_TYPES_DASH.length; i++) {
    var t = ATELIER_TYPES_DASH[i];
    var res = await sb.from('chambre_posts')
      .select('*', { count: 'exact', head: true })
      .eq('author_id', currentUser.id)
      .eq('chambre_type', t.key);
    var count = res.count || 0;
    var card = document.createElement('div');
    card.className = 'dash-atelier-mini';
    card.onclick = (function(key) { return function() { window.location.href = '/ateliers/?type=' + key; }; })(t.key);
    card.innerHTML = '<span class="dash-atelier-mini-num">' + count + '</span><span class="dash-atelier-mini-label">' + t.label + '</span>';
    grid.appendChild(card);
  }

  // Mise à jour en direct si une publication est ajoutée/supprimée pendant que le dashboard est ouvert
  sb.channel('dash-chambre-posts-' + currentUser.id)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'chambre_posts', filter: 'author_id=eq.' + currentUser.id },
      function() { loadDashAteliers(); })
    .subscribe();
}

/* ------------------------------------------------------------
   Mes projets
------------------------------------------------------------ */
async function loadDashProjects() {
  var list = document.getElementById('dash-projects-list');
  var res = await sb.from('projects').select('id, title, status, created_at').eq('student_id', currentUser.id).order('created_at', { ascending: false });
  var projects = res.data || [];
  if (projects.length === 0) {
    list.innerHTML = '<p class="dash-sub">Aucun projet pour le moment — tapote le bouton + en bas.</p>';
    return;
  }
  var html = '';
  for (var i = 0; i < projects.length; i++) {
    var p = projects[i];
    html += '<div class="dash-project-row" onclick="window.location.href=\'/projet/?id=' + p.id + '\'">';
    html += '<span class="dash-project-title">' + p.title + '</span>';
    html += '<span class="status-' + p.status + '">' + (STATUS_LABEL_DASH[p.status] || p.status) + '</span>';
    html += '</div>';
  }
  list.innerHTML = html;
}

function ouvrirNouveauProjet() {
  document.getElementById('dash-new-title').value = '';
  document.getElementById('dash-new-desc').value = '';
  document.getElementById('dash-modal-msg').textContent = '';
  document.getElementById('dash-modal-overlay').classList.add('open');
}
document.addEventListener('DOMContentLoaded', function() {
  var closeBtn = document.getElementById('dash-modal-close');
  var overlay = document.getElementById('dash-modal-overlay');
  if (closeBtn) closeBtn.addEventListener('click', function() { overlay.classList.remove('open'); });
  if (overlay) overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.classList.remove('open'); });
});

async function doCreateProjectSimple() {
  var title = document.getElementById('dash-new-title').value.trim();
  var msg = document.getElementById('dash-modal-msg');
  if (!title) { msg.textContent = 'Le titre est obligatoire.'; msg.style.color = '#991b1b'; return; }
  var btn = document.getElementById('dash-new-submit');
  btn.disabled = true; btn.textContent = 'Création…';
  var res = await sb.from('projects').insert({
    title: title,
    description: document.getElementById('dash-new-desc').value.trim() || null,
    student_id: currentUser.id,
    status: 'draft',
    cover_image_url: null
  }).select().single();
  btn.disabled = false; btn.textContent = 'Créer le brouillon';
  if (res.error) { msg.textContent = res.error.message; msg.style.color = '#991b1b'; return; }
  document.getElementById('dash-modal-overlay').classList.remove('open');
  toast('Projet créé !');
  loadDashProjects();
}

/* ------------------------------------------------------------
   Statistiques — admin uniquement
------------------------------------------------------------ */
async function loadDashStats() {
  var countRes = await sb.from('profiles').select('*', { count: 'exact', head: true });
  document.getElementById('dash-stats-inscrits').textContent = countRes.count ?? 0;

  sb.channel('dash-profiles-count')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'profiles' }, function() {
      var el = document.getElementById('dash-stats-inscrits');
      el.textContent = (parseInt(el.textContent, 10) || 0) + 1;
    })
    .subscribe();

  var res = await sb.from('projects').select('status, created_at');
  var rows = res.data || [];
  var counts = { draft: 0, pending: 0, approved: 0, rejected: 0 };
  var perDay = {};
  for (var i = 0; i < rows.length; i++) {
    var r = rows[i];
    if (counts[r.status] !== undefined) counts[r.status]++;
    var day = (r.created_at || '').slice(0, 10);
    if (day) perDay[day] = (perDay[day] || 0) + 1;
  }
  document.getElementById('dash-stat-draft').textContent = counts.draft;
  document.getElementById('dash-stat-pending').textContent = counts.pending;
  document.getElementById('dash-stat-approved').textContent = counts.approved;
  document.getElementById('dash-stat-rejected').textContent = counts.rejected;

  var days = [], values = [];
  for (var i = 13; i >= 0; i--) {
    var d = new Date();
    d.setDate(d.getDate() - i);
    var key = d.toISOString().slice(0, 10);
    days.push(key.slice(5).replace('-', '/'));
    values.push(perDay[key] || 0);
  }

  new Chart(document.getElementById('dash-stats-chart'), {
    type: 'bar',
    data: { labels: days, datasets: [{ data: values, backgroundColor: '#C17B3F', borderRadius: 4 }] },
    options: {
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, ticks: { stepSize: 1, font: { size: 10 } } },
        x: { ticks: { font: { size: 9 } } }
      }
    }
  });
}

document.addEventListener('DOMContentLoaded', function() {
  var btn = document.getElementById('dash-btn-rapport');
  if (!btn) return;
  btn.addEventListener('click', async function() {
    var msg = document.getElementById('dash-rapport-msg');
    btn.disabled = true; btn.textContent = 'Envoi…';
    msg.textContent = '';
    var res = await sb.functions.invoke('send-dashboard-report');
    btn.disabled = false; btn.textContent = 'Envoyer un rapport';
    if (res.error) {
      var detail = res.error.message || 'Erreur inconnue.';
      if (res.error.context && typeof res.error.context.json === 'function') {
        try {
          var body = await res.error.context.json();
          if (body && body.error) detail = body.error;
        } catch (e) { /* corps non-JSON, on garde le message par défaut */ }
      }
      msg.textContent = "Échec de l'envoi : " + detail;
      msg.style.color = '#991b1b';
      return;
    }
    msg.textContent = 'Rapport envoyé par email.';
    msg.style.color = '#166534';
  });
});

/* ------------------------------------------------------------
   Utilisateurs — admin uniquement
------------------------------------------------------------ */
async function loadDashUsers() {
  var list = document.getElementById('dash-users-list');
  var res = await sb.from('profiles').select('id, full_name, email, role, created_at').order('created_at', { ascending: false });
  var users = res.data || [];
  if (users.length === 0) { list.innerHTML = '<p class="dash-sub">Aucun inscrit pour le moment.</p>'; return; }

  var canEditRoles = currentProfile && currentProfile.role === 'admin';

  var html = '';
  for (var i = 0; i < users.length; i++) {
    var u = users[i];
    html += '<div class="dash-user-row">';
    html += '<span class="dash-user-name" title="' + (u.email || '') + '">' + (u.full_name || u.email || 'Sans nom') + '</span>';
    if (canEditRoles) {
      html += '<select class="dash-user-role-select" data-id="' + u.id + '">';
      html += '<option value="student"' + (u.role === 'student' ? ' selected' : '') + '>student</option>';
      html += '<option value="teacher"' + (u.role === 'teacher' ? ' selected' : '') + '>teacher</option>';
      html += '<option value="visitor"' + (u.role === 'visitor' ? ' selected' : '') + '>visitor</option>';
      html += '<option value="admin"' + (u.role === 'admin' ? ' selected' : '') + '>admin</option>';
      html += '</select>';
      html += '<span class="dash-user-status" data-statut></span>';
    } else {
      html += '<span style="font-family:sans-serif;font-size:0.8rem;color:var(--gris);font-style:italic">' + (u.role || '—') + '</span>';
    }
    html += '</div>';
  }
  list.innerHTML = html;

  if (!canEditRoles) return;

  document.querySelectorAll('.dash-user-role-select').forEach(function(select) {
    select.addEventListener('change', async function() {
      var id = select.getAttribute('data-id');
      var newRole = select.value;
      var statusEl = select.parentElement.querySelector('[data-statut]');
      statusEl.textContent = '…';
      statusEl.className = 'dash-user-status';
      var res = await sb.from('profiles').update({ role: newRole }).eq('id', id);
      statusEl.textContent = res.error ? '✕' : '✓';
      statusEl.className = 'dash-user-status ' + (res.error ? 'erreur' : 'ok');
    });
  });
}
