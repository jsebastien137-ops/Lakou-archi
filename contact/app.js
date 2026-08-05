/* ============================================================
   CONTACT — /contact/app.js
   ============================================================ */

var SUPABASE_URL = 'https://qptnjgdfobznwmsguvyf.supabase.co';
var SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwdG5qZ2Rmb2J6bndtc2d1dnlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5MjA3MjIsImV4cCI6MjA5MzQ5NjcyMn0.QLfIITvc-AdWVLZHHghocNYyYyYvPxZZMAXhdl_4Bdo';
var sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

var currentUser = null;
var isAdmin = false;

var USER_CATEGORIES = [
  'Question sur mon compte',
  'Problème avec un projet',
  'Suggestion pour la plateforme',
  'Signaler un contenu ou un comportement',
  'Autre'
];
var ADMIN_CATEGORIES = [
  'Question générale',
  'Problème technique',
  "Signalement d'un utilisateur",
  "Demande de changement d'administrateur",
  'Urgence administrative'
];

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

function populateCategories() {
  var list = isAdmin ? ADMIN_CATEGORIES : USER_CATEGORIES;
  var sel = document.getElementById('f-category');
  sel.innerHTML = list.map(function(c) { return '<option value="' + c + '">' + c + '</option>'; }).join('');
}

async function sendContactMessage() {
  var category = document.getElementById('f-category').value;
  var message = document.getElementById('f-message').value.trim();
  if (!message) { toast('Écris un message avant d\'envoyer.', 'error'); return; }

  var senderName = null, senderEmail = null;
  if (!currentUser) {
    senderName = document.getElementById('f-name').value.trim();
    senderEmail = document.getElementById('f-email').value.trim();
    if (!senderName || !senderEmail) { toast('Nom et email requis.', 'error'); return; }
  }

  var btn = document.getElementById('send-btn');
  btn.disabled = true;
  btn.textContent = 'Envoi en cours...';

  try {
    var sessionRes = await sb.auth.getSession();
    var token = sessionRes.data && sessionRes.data.session ? sessionRes.data.session.access_token : null;

    var headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = 'Bearer ' + token;

    var res = await fetch(SUPABASE_URL + '/functions/v1/send-contact-message', {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({ category: category, messageText: message, senderName: senderName, senderEmail: senderEmail })
    });
    var data = await res.json();

    if (!res.ok) throw new Error(data.error || 'Erreur inconnue');

    toast('Message envoyé !');
    document.getElementById('f-message').value = '';
    if (!currentUser) {
      document.getElementById('f-name').value = '';
      document.getElementById('f-email').value = '';
    }
  } catch (e) {
    toast("Le message n'a pas pu être envoyé : " + e.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Envoyer';
  }
}

document.addEventListener('DOMContentLoaded', async function() {
  try {
    var sessionRes = await sb.auth.getSession();
    if (sessionRes.data && sessionRes.data.session && sessionRes.data.session.user) {
      currentUser = sessionRes.data.session.user;
      var profRes = await sb.from('profiles').select('role').eq('id', currentUser.id).single();
      isAdmin = !!(profRes.data && profRes.data.role === 'admin');
    } else {
      document.getElementById('contact-guest-fields').classList.remove('hidden');
    }
  } catch (e) {
    document.getElementById('contact-guest-fields').classList.remove('hidden');
  }
  populateCategories();
});
