/* ============================================================
   connexion/app.js — Lakou Archi
   Logique propre à la page Connexion uniquement.
   Dépend des fonctions partagées de /app.js (doit être chargé avant
   ce fichier) : sb, toast, showErr, hideErr, currentUser,
   currentProfile, updateNavForUser, loadProfileData,
   loadThemeFromProfile, updateAdminUI.
   ============================================================ */

async function doLogin() {
  hideErr('login-error');
  var btn = document.getElementById('login-btn');
  var email = document.getElementById('login-email').value;
  var password = document.getElementById('login-password').value;
  if (!email || !password) { showErr('login-error', 'Remplissez tous les champs.'); return; }
  btn.disabled = true; btn.textContent = 'Connexion...';
  var timer = setTimeout(function() {
    btn.disabled = false;
    btn.textContent = 'Se connecter';
    showErr('login-error', 'Délai dépassé. Réessayez.');
  }, 8000);
  try {
    var res = await sb.auth.signInWithPassword({ email: email, password: password });
    clearTimeout(timer);
    if (res.error) {
      showErr('login-error', 'Email ou mot de passe incorrect.');
      btn.disabled = false;
      btn.textContent = 'Se connecter';
      return;
    }
    currentUser = res.data.user;
    currentProfile = { role: 'student', full_name: email, email: email, id: res.data.user.id };
    btn.disabled = false;
    btn.textContent = 'Se connecter';
    updateNavForUser();
    await loadProfileData();
    if (currentProfile) loadThemeFromProfile(currentProfile);
    updateAdminUI();
    var role = currentProfile ? currentProfile.role : 'student';
    if (role === 'visitor') {
      toast('Connexion réussie ! Explorez la plateforme librement.');
      window.location.href = '/';
    } else {
      toast('Connexion réussie !');
      window.location.href = '/dashboard/';
    }
  } catch (e) {
    clearTimeout(timer);
    console.warn('Login catch:', e);
    if (currentUser) {
      window.location.href = '/';
    }
    btn.disabled = false;
    btn.textContent = 'Se connecter';
  }
}
