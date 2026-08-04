/* ============================================================
   PROJET — /projet/editer.js (édition, propriétaire ou admin)
   Reconstruction propre de l'ancienne page "edit-project" (SPA)
   qui n'avait jamais eu de fichier HTML pour l'héberger.
   ============================================================ */

var SUPABASE_URL = 'https://qptnjgdfobznwmsguvyf.supabase.co';
var SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwdG5qZ2Rmb2J6bndtc2d1dnlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5MjA3MjIsImV4cCI6MjA5MzQ5NjcyMn0.QLfIITvc-AdWVLZHHghocNYyYyYvPxZZMAXhdl_4Bdo';
var sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

var currentUser = null;
var currentProjectId = null;
var isAdmin = false;

var STAGE_LABELS = { sketches: 'Carnets de croquis', conceptual: 'Maquettes conceptuelles', plans: 'Plans en cours', final: 'Maquettes finales' };
var TD_SECTIONS = [
  { key: 'plan_masse', label: '🗺 Plan de masse / Implantation', hasSubLabel: false },
  { key: 'niveaux',    label: '📐 Niveaux & Étages',             hasSubLabel: true, hint: 'ex: Niveau 1, RDC' },
  { key: 'coupes',     label: '✂️ Coupes',                       hasSubLabel: true, hint: 'ex: Coupe A-A' },
  { key: 'facades',    label: '🏛 Façades',                      hasSubLabel: true, hint: 'ex: Façade Nord' },
  { key: 'structure',  label: '⚙️ Structure',                    hasSubLabel: false },
  { key: 'rendus',     label: '🎨 Rendus',                       hasSubLabel: false }
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

/* ---------- Compression (même logique que le reste du site) ---------- */
function compressImage(file, callback) {
  if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') { callback(file); return; }
  var MB = file.size / (1024 * 1024);
  if (MB < 1) { callback(file); return; }
  var MAX = 2400, Q = 0.78;
  if (MB >= 5) { MAX = 1600; Q = 0.62; }
  var reader = new FileReader();
  reader.onload = function(e) {
    var img = new Image();
    img.onload = function() {
      var w = img.width, h = img.height;
      if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; }
      if (h > MAX) { w = Math.round(w * MAX / h); h = MAX; }
      var cvs = document.createElement('canvas');
      cvs.width = w; cvs.height = h;
      cvs.getContext('2d').drawImage(img, 0, 0, w, h);
      cvs.toBlob(function(blob) {
        callback(new File([blob], file.name.replace(/\.\w+$/, '.jpg'), { type: 'image/jpeg' }));
      }, 'image/jpeg', Q);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

/* ---------- Garde d'accès : propriétaire ou admin ---------- */
async function guardAccess() {
  var params = new URLSearchParams(window.location.search);
  currentProjectId = params.get('id');
  if (!currentProjectId) { document.getElementById('guard-msg').textContent = 'Projet introuvable.'; return false; }

  var sessionRes = await sb.auth.getSession();
  if (!sessionRes.data || !sessionRes.data.session || !sessionRes.data.session.user) {
    window.location.href = '/?login=1';
    return false;
  }
  currentUser = sessionRes.data.session.user;

  var profRes = await sb.from('profiles').select('role').eq('id', currentUser.id).single();
  isAdmin = !!(profRes.data && profRes.data.role === 'admin');

  var projRes = await sb.from('projects').select('student_id, title').eq('id', currentProjectId).single();
  if (!projRes.data) { document.getElementById('guard-msg').textContent = 'Projet introuvable.'; return false; }
  if (projRes.data.student_id !== currentUser.id && !isAdmin) {
    document.getElementById('guard-msg').textContent = "Tu ne peux modifier que tes propres projets.";
    setTimeout(function() { window.location.href = '/projet/?id=' + currentProjectId; }, 1500);
    return false;
  }

  document.getElementById('guard-msg').classList.add('hidden');
  document.getElementById('edit-root').classList.remove('hidden');
  document.getElementById('edit-title-display').textContent = projRes.data.title;
  return true;
}

/* ---------- Chargement complet ---------- */
async function loadAll() {
  var res = await sb.from('projects').select('*').eq('id', currentProjectId).single();
  var p = res.data;
  if (!p) return;

  document.getElementById('f-title').value = p.title || '';
  document.getElementById('f-desc').value = p.description || '';
  document.getElementById('f-level').value = p.level || '';
  document.getElementById('f-year').value = p.academic_year || '';
  document.getElementById('f-program').value = p.program_type || '';
  document.getElementById('f-area').value = p.area || '';
  document.getElementById('f-location').value = p.location || '';

  if (p.cover_image_url) {
    var img = document.getElementById('cover-preview');
    img.src = p.cover_image_url;
    img.style.display = 'block';
  }

  renderStatusCard(p.status);
  await loadStages();
  await loadDossier();
}

function renderStatusCard(status) {
  var el = document.getElementById('status-card');
  if (status === 'draft') {
    el.innerHTML = '<p style="font-family:sans-serif;font-size:0.85rem;color:var(--gris);margin-bottom:0.8rem">Ce projet est en brouillon — lui seul le voit.</p>'
      + '<button class="form-btn" style="width:100%" onclick="submitForValidation()">Soumettre pour validation</button>';
  } else if (status === 'pending') {
    el.innerHTML = '<p style="font-family:sans-serif;font-size:0.85rem;color:var(--gris)">En attente de validation par un enseignant.</p>';
  } else if (status === 'approved') {
    el.innerHTML = '<p style="font-family:sans-serif;font-size:0.85rem;color:#2a6b2a">✓ Projet approuvé et publié.</p>';
  } else if (status === 'rejected') {
    el.innerHTML = '<p style="font-family:sans-serif;font-size:0.85rem;color:#b91c1c">Ce projet a été refusé. Modifie-le puis resoumets-le.</p>'
      + '<button class="form-btn" style="width:100%;margin-top:0.6rem" onclick="submitForValidation()">Resoumettre</button>';
  }
}

async function submitForValidation() {
  var res = await sb.from('projects').update({ status: 'pending' }).eq('id', currentProjectId);
  if (res.error) { toast(res.error.message, 'error'); return; }
  toast('Projet soumis pour validation !');
  renderStatusCard('pending');
}

/* ---------- Infos générales ---------- */
async function saveProjectInfo() {
  var title = document.getElementById('f-title').value.trim();
  if (!title) { toast('Le titre est obligatoire.', 'error'); return; }
  var btn = document.getElementById('save-info-btn');
  btn.disabled = true; btn.textContent = 'Enregistrement...';

  var res = await sb.from('projects').update({
    title: title,
    description: document.getElementById('f-desc').value || null,
    level: document.getElementById('f-level').value || null,
    academic_year: document.getElementById('f-year').value || null,
    program_type: document.getElementById('f-program').value || null,
    area: parseInt(document.getElementById('f-area').value) || null,
    location: document.getElementById('f-location').value || null
  }).eq('id', currentProjectId);

  btn.disabled = false; btn.textContent = 'Enregistrer';
  if (res.error) { toast(res.error.message, 'error'); return; }
  toast('Informations enregistrées !');
  document.getElementById('edit-title-display').textContent = title;
}

/* ---------- Couverture ---------- */
function uploadCover(input) {
  var file = input.files[0];
  if (!file) return;
  toast('Compression en cours...');
  compressImage(file, async function(compressed) {
    var ext = compressed.name.split('.').pop().toLowerCase();
    var path = 'covers/' + currentProjectId + '/cover_' + Date.now() + '.' + ext;
    var up = await sb.storage.from('project-images').upload(path, compressed, { upsert: true });
    if (up.error) { toast('Erreur upload : ' + up.error.message, 'error'); return; }
    var url = sb.storage.from('project-images').getPublicUrl(path).data.publicUrl;
    var res = await sb.from('projects').update({ cover_image_url: url }).eq('id', currentProjectId);
    if (res.error) { toast(res.error.message, 'error'); return; }
    var img = document.getElementById('cover-preview');
    img.src = url; img.style.display = 'block';
    toast('Couverture mise à jour !');
  });
}

/* ---------- Étapes (évolution du projet) ---------- */
async function loadStages() {
  var res = await sb.from('project_stages').select('*, images:stage_images(*)').eq('project_id', currentProjectId).order('order_index');
  var stages = res.data || [];
  var list = document.getElementById('stage-list');
  if (!stages.length) { list.innerHTML = '<p style="font-size:0.8rem;color:var(--gris);font-family:sans-serif;font-style:italic">Aucune étape pour le moment.</p>'; return; }

  var html = '';
  stages.forEach(function(s) {
    var imgs = s.images || [];
    html += '<div style="border:1px solid var(--gris-light);border-radius:0.4rem;padding:0.9rem;margin-bottom:0.8rem">';
    html += '<p style="font-size:0.68rem;color:var(--ocre);font-family:sans-serif;font-weight:600;text-transform:uppercase;letter-spacing:0.05em">' + (STAGE_LABELS[s.stage_type] || s.stage_type) + '</p>';
    html += '<p style="font-family:\'Cormorant Garamond\',serif;font-size:1.05rem;color:var(--terre);margin:0.2rem 0 0.5rem">' + s.title + '</p>';
    if (imgs.length) {
      html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(70px,1fr));gap:0.4rem;margin-bottom:0.6rem">';
      imgs.forEach(function(img) { html += '<img src="' + img.url + '" style="width:100%;aspect-ratio:1/1;object-fit:cover;border-radius:0.3rem">'; });
      html += '</div>';
    }
    html += '<label style="font-size:0.72rem;color:var(--terre);cursor:pointer;font-family:sans-serif;font-weight:600">📎 Ajouter une image'
          + '<input type="file" accept="image/*" style="display:none" onchange="uploadStageImage(\'' + s.id + '\', this)"></label>';
    html += '</div>';
  });
  list.innerHTML = html;
}

async function addStage() {
  var type = document.getElementById('stage-type').value;
  var title = document.getElementById('stage-title').value.trim();
  var desc = document.getElementById('stage-desc').value;
  if (!title) { toast('Le titre de l\'étape est obligatoire.', 'error'); return; }

  var cr = await sb.from('project_stages').select('order_index').eq('project_id', currentProjectId).order('order_index', { ascending: false }).limit(1);
  var next = cr.data && cr.data.length ? cr.data[0].order_index + 1 : 0;

  var res = await sb.from('project_stages').insert({ project_id: currentProjectId, stage_type: type, title: title, description: desc || null, order_index: next });
  if (res.error) { toast(res.error.message, 'error'); return; }

  document.getElementById('stage-title').value = '';
  document.getElementById('stage-desc').value = '';
  toast('Étape ajoutée !');
  await loadStages();
}

function uploadStageImage(stageId, input) {
  var file = input.files[0];
  if (!file) return;
  toast('Compression en cours...');
  compressImage(file, async function(compressed) {
    var ext = compressed.name.split('.').pop().toLowerCase();
    var path = 'stages/' + stageId + '/' + Date.now() + '.' + ext;
    var up = await sb.storage.from('project-images').upload(path, compressed);
    if (up.error) { toast('Erreur upload : ' + up.error.message, 'error'); return; }
    var url = sb.storage.from('project-images').getPublicUrl(path).data.publicUrl;
    var ins = await sb.from('stage_images').insert({ stage_id: stageId, url: url, file_type: compressed.type, file_size: compressed.size, order_index: 0 });
    if (ins.error) { toast(ins.error.message, 'error'); return; }
    toast('Image ajoutée !');
    await loadStages();
  });
}

/* ---------- Dossier technique ---------- */
async function loadDossier() {
  var res = await sb.from('project_images').select('*').eq('project_id', currentProjectId).neq('category', 'cover').order('category').order('order_index');
  var images = res.data || [];
  var byCategory = {};
  images.forEach(function(img) { (byCategory[img.category] = byCategory[img.category] || []).push(img); });

  var html = '';
  TD_SECTIONS.forEach(function(section) {
    var imgs = byCategory[section.key] || [];
    html += '<div style="margin-bottom:1.6rem">';
    html += '<p style="font-size:0.68rem;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:var(--ocre);font-family:sans-serif;margin-bottom:0.6rem">' + section.label + '</p>';

    if (imgs.length) {
      html += '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(90px,1fr));gap:0.5rem;margin-bottom:0.7rem">';
      imgs.forEach(function(img) {
        html += '<div style="position:relative">';
        html += '<img src="' + img.url + '" style="width:100%;aspect-ratio:1/1;object-fit:cover;border-radius:0.3rem">';
        html += '<button onclick="deleteDossierImage(\'' + img.id + '\')" style="position:absolute;top:2px;right:2px;background:rgba(0,0,0,0.7);color:#fff;border:none;width:20px;height:20px;border-radius:50%;font-size:0.6rem;cursor:pointer">✕</button>';
        if (img.alt_text) html += '<p style="font-size:0.6rem;color:var(--gris);font-family:sans-serif;margin-top:0.15rem">' + img.alt_text + '</p>';
        html += '</div>';
      });
      html += '</div>';
    }

    if (section.hasSubLabel) {
      html += '<input type="text" id="sublabel-' + section.key + '" class="field-input" placeholder="' + section.hint + '" style="margin-bottom:0.5rem">';
    }
    html += '<label style="font-size:0.72rem;color:var(--terre);cursor:pointer;font-family:sans-serif;font-weight:600">📎 Ajouter une planche'
          + '<input type="file" accept="image/*" style="display:none" onchange="uploadDossierImage(\'' + section.key + '\', this)"></label>';
    html += '</div>';
  });
  document.getElementById('td-editor').innerHTML = html;
}

function uploadDossierImage(category, input) {
  var file = input.files[0];
  if (!file) return;
  var sublabelEl = document.getElementById('sublabel-' + category);
  var sublabel = sublabelEl ? sublabelEl.value.trim() : '';
  toast('Compression en cours...');
  compressImage(file, async function(compressed) {
    var cntRes = await sb.from('project_images').select('id', { count: 'exact', head: true }).eq('project_id', currentProjectId).eq('category', category);
    var orderIdx = cntRes.count || 0;
    var ext = compressed.name.split('.').pop().toLowerCase();
    var path = 'td/' + currentProjectId + '/' + category + '/' + Date.now() + '.' + ext;
    var up = await sb.storage.from('project-images').upload(path, compressed, { upsert: true });
    if (up.error) { toast('Erreur upload : ' + up.error.message, 'error'); return; }
    var url = sb.storage.from('project-images').getPublicUrl(path).data.publicUrl;
    var ins = await sb.from('project_images').insert({
      project_id: currentProjectId, url: url, category: category,
      order_index: orderIdx, alt_text: sublabel || null, file_size: compressed.size
    });
    if (ins.error) { toast('Erreur DB : ' + ins.error.message, 'error'); return; }
    toast('Planche ajoutée !');
    await loadDossier();
  });
}

async function deleteDossierImage(imageId) {
  if (!confirm('Supprimer cette planche ?')) return;
  var res = await sb.from('project_images').delete().eq('id', imageId);
  if (res.error) { toast(res.error.message, 'error'); return; }
  toast('Planche supprimée.');
  await loadDossier();
}

/* ---------- Init ---------- */
document.addEventListener('DOMContentLoaded', async function() {
  var ok = await guardAccess();
  if (!ok) return;
  await loadAll();
});
