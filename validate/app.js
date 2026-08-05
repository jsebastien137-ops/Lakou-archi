/* ============================================================
   validate/app.js — Lakou Achitekti
   Page autonome : /validate/index.html + /validate/app.js
   Dépend des fonctions partagées de /app.js : sb, toast, currentUser,
   currentProfile.
   ============================================================ */

(async function initValidatePage() {
  var sessionRes = await sb.auth.getSession();
  if (!sessionRes.data.session) { window.location.href = '/login/'; return; }

  if (!currentUser) currentUser = sessionRes.data.session.user;
  if (!currentProfile) {
    var pRes = await sb.from('profiles').select('*').eq('id', currentUser.id).single();
    currentProfile = pRes.data || { role: 'student', full_name: currentUser.email, email: currentUser.email, id: currentUser.id };
  }

  var role = currentProfile.role;
  if (role !== 'admin' && role !== 'teacher') {
    document.getElementById('validate-sub').textContent = '';
    document.getElementById('validate-loading').remove();
    document.getElementById('validate-denied').classList.remove('hidden');
    setTimeout(function() { window.location.href = '/dashboard/'; }, 1800);
    return;
  }

  loadValidateQueue();
})();

async function loadValidateQueue() {
  var list = document.getElementById('validate-list');
  var subEl = document.getElementById('validate-sub');

  var res = await sb.from('projects')
    .select('*, student:profiles!student_id(full_name), school:schools(name)')
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  if (res.error) {
    list.innerHTML = '<div class="empty-state"><p>Erreur de chargement : ' + res.error.message + '</p></div>';
    subEl.textContent = '';
    return;
  }

  var projects = res.data || [];

  if (projects.length === 0) {
    subEl.textContent = 'Aucun projet en attente.';
    list.innerHTML = '<div class="empty-state"><p>Rien à valider pour le moment.</p></div>';
    return;
  }

  subEl.textContent = projects.length + ' projet' + (projects.length > 1 ? 's' : '') + ' en attente de validation.';

  var html = '';
  for (var i = 0; i < projects.length; i++) {
    var p = projects[i];
    var student = p.student ? p.student.full_name : '-';
    var school = p.school ? p.school.name : '-';
    html += '<div class="validation-card" id="vcard-' + p.id + '">';
    html += '<div class="validation-card-title">' + p.title + '</div>';
    html += '<div class="validation-card-meta">' + student + ' — ' + school + ' — ' + (p.academic_year || '-') + '</div>';
    html += '<textarea class="validation-note" id="note-' + p.id + '" rows="2" placeholder="Note optionnelle..."></textarea>';
    html += '<div class="validation-actions">';
    html += '<button class="btn-approve" onclick="doValidateDecision(' + JSON.stringify(p.id) + ', true)">Approuver</button>';
    html += '<button class="btn-reject" onclick="doValidateDecision(' + JSON.stringify(p.id) + ', false)">Refuser</button>';
    html += '<button class="action-link" onclick="window.location.href=\'/projet/?id=' + p.id + '\'">Voir le projet</button>';
    html += '</div></div>';
  }
  list.innerHTML = html;
}

async function doValidateDecision(projectId, approved) {
  if (!currentUser) return;
  var card = document.getElementById('vcard-' + projectId);
  if (card) card.style.opacity = '0.4';
  var noteEl = document.getElementById('note-' + projectId);
  var note = noteEl ? noteEl.value : '';

  var res = await sb.from('projects').update({
    status: approved ? 'approved' : 'rejected',
    validated_by: currentUser.id,
    validated_at: new Date().toISOString(),
    validation_note: note || null
  }).eq('id', projectId);

  if (res.error) { toast(res.error.message, 'error'); if (card) card.style.opacity = '1'; return; }

  toast(approved ? 'Projet approuvé !' : 'Projet refusé.');
  if (card) card.remove();

  var subEl = document.getElementById('validate-sub');
  var remaining = document.querySelectorAll('.validation-card').length - 1;
  if (remaining <= 0) {
    setTimeout(function() {
      var list = document.getElementById('validate-list');
      if (list && list.querySelectorAll('.validation-card').length === 0) {
        subEl.textContent = 'Aucun projet en attente.';
        list.innerHTML = '<div class="empty-state"><p>Rien à valider pour le moment.</p></div>';
      }
    }, 350);
  } else if (subEl) {
    subEl.textContent = remaining + ' projet' + (remaining > 1 ? 's' : '') + ' en attente de validation.';
  }
}
