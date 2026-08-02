/* ============================================================
   inscription/app.js — Lakou Archi
   Logique propre à la page Inscription uniquement.
   Dépend des fonctions partagées de /app.js (doit être chargé avant
   ce fichier) : sb, toast, showErr, hideErr, showConfirmModal.
   ============================================================ */

async function doRegister() {
  hideErr('register-error');
  var btn = document.getElementById('register-btn');
  var name = document.getElementById('reg-name').value;
  var email = document.getElementById('reg-email').value;
  var password = document.getElementById('reg-password').value;
  var role = document.getElementById('reg-role').value;
  var school = document.getElementById('reg-school') ? document.getElementById('reg-school').value.trim() || null : null;
  if (!name || !email || !password) { showErr('register-error', 'Remplissez tous les champs.'); return; }
  var cgu = document.getElementById('cgu-check');
  if (!cgu || !cgu.checked) { showErr('register-error', 'Vous devez accepter les conditions d\'utilisation.'); return; }
  btn.disabled = true; btn.textContent = 'Inscription...';
  try {
    var res = await sb.auth.signUp({
      email: email,
      password: password,
      options: { data: { full_name: name, role: role } }
    });
    if (res.error) {
      showErr('register-error', res.error.message);
      btn.disabled = false;
      btn.textContent = 'Créer mon compte';
      return;
    }
    if (res.data && res.data.user) {
      var updateData = {
        id: res.data.user.id,
        email: email,
        full_name: name,
        role: role
      };
      if (school) updateData.school = school;
      await sb.from('profiles').upsert(updateData, { onConflict: 'id' });
    }
    var s = document.getElementById('register-success');
    if (s) { s.classList.remove('hidden'); s.style.display = 'block'; }
    showConfirmModal();
    btn.disabled = false; btn.textContent = 'Créer mon compte';
  } catch (e) {
    showErr('register-error', 'Erreur: ' + e.message);
    btn.disabled = false; btn.textContent = 'Créer mon compte';
  }
}

function toggleRoleInfo(role) {
  var academic = document.getElementById('role-info-academic');
  var visitor = document.getElementById('role-info-visitor');
  if (!academic || !visitor) return;
  if (role === 'visitor') {
    academic.style.display = 'none';
    visitor.style.display = 'block';
  } else {
    academic.style.display = 'block';
    visitor.style.display = 'none';
  }
}
