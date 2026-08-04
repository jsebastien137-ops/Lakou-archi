/* ============================================================
   PARAMÈTRES — page autonome /settings/
   Ce fichier ne redéfinit rien : il s'appuie sur /app.js (chargé
   juste avant dans index.html), qui fournit déjà sb, currentUser,
   currentProfile, toast, loadProfileData, doAvatarUpload,
   doAvatarRemove, doSaveSettingsProfile, doChangePassword.
   ============================================================ */

document.addEventListener('DOMContentLoaded', async function() {
  var res = await sb.auth.getSession();
  if (!res.data || !res.data.session || !res.data.session.user) {
    window.location.href = '/?login=1';
    return;
  }
  currentUser = res.data.session.user;
  // Peuple avatar / bio / classe / école — voir loadProfileData() dans /app.js
  await loadProfileData();
});
