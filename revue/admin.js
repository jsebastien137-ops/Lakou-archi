/* ============================================================
   REVUE — /revue/admin.js (création / édition, admin uniquement)
   ============================================================ */

var REVUE_CONFIG = {
  supabaseUrl: 'https://qptnjgdfobznwmsguvyf.supabase.co',
  supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwdG5qZ2Rmb2J6bndtc2d1dnlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5MjA3MjIsImV4cCI6MjA5MzQ5NjcyMn0.QLfIITvc-AdWVLZHHghocNYyYyYvPxZZMAXhdl_4Bdo',
  maxVideoSeconds: 150,
  maxVideoBytesBeforeCompression: 30 * 1024 * 1024
};

var sb = supabase.createClient(REVUE_CONFIG.supabaseUrl, REVUE_CONFIG.supabaseKey);

var currentUser = null;
var editingId = null;
var pendingCoverFile = null;
var pendingVideoFile = null;
var pendingVideoDuration = null;
var pendingGalleryFiles = [];
var existingGalleryImages = []; // {id, url}

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

function slugify(text) {
  return text.toString().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    .substring(0, 60) + '-' + Date.now().toString(36);
}

/* ---------- Garde admin ---------- */
async function guardAdminAccess() {
  var sessionRes = await sb.auth.getSession();
  if (!sessionRes.data || !sessionRes.data.session || !sessionRes.data.session.user) {
    document.getElementById('admin-guard-msg').textContent = 'Connexion requise. Redirection...';
    setTimeout(function() { window.location.href = '/?login=1'; }, 1200);
    return false;
  }
  currentUser = sessionRes.data.session.user;
  var profRes = await sb.from('profiles').select('role').eq('id', currentUser.id).single();
  if (!profRes.data || profRes.data.role !== 'admin') {
    document.getElementById('admin-guard-msg').textContent = "Accès réservé à l'administrateur.";
    setTimeout(function() { window.location.href = './'; }, 1500);
    return false;
  }
  document.getElementById('admin-guard-msg').classList.add('hidden');
  document.getElementById('admin-form-wrap').classList.remove('hidden');
  return true;
}

/* ---------- Catégories ---------- */
async function loadCategoriesIntoSelect(selectedId) {
  var res = await sb.from('revue_categories').select('*').order('sort_order', { ascending: true });
  var cats = res.data || [];
  var sel = document.getElementById('f-category');
  var html = '<option value="">— Choisir —</option>';
  for (var i = 0; i < cats.length; i++) {
    html += '<option value="' + cats[i].id + '"' + (cats[i].id === selectedId ? ' selected' : '') + '>' + cats[i].label + '</option>';
  }
  sel.innerHTML = html;
}

async function createRevueCategory() {
  var input = document.getElementById('f-new-cat');
  var label = input.value.trim();
  if (!label) return;
  var slug = label.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  var res = await sb.from('revue_categories').insert({ slug: slug, label: label, sort_order: 99 }).select().single();
  if (res.error) { toast(res.error.message, 'error'); return; }
  input.value = '';
  await loadCategoriesIntoSelect(res.data.id);
  toast('Catégorie ajoutée.');
}

/* ---------- Aperçus fichiers ---------- */
function previewImageFile(input, previewId) {
  var file = input.files[0];
  if (!file) return;
  if (previewId === 'cover-preview') pendingCoverFile = file;
  var reader = new FileReader();
  reader.onload = function(e) {
    var img = document.getElementById(previewId);
    img.src = e.target.result;
    img.style.display = 'block';
  };
  reader.readAsDataURL(file);
}

function previewGalleryFiles(input) {
  pendingGalleryFiles = Array.prototype.slice.call(input.files);
  var wrap = document.getElementById('gallery-preview');
  wrap.innerHTML = '';
  pendingGalleryFiles.forEach(function(file) {
    var reader = new FileReader();
    reader.onload = function(e) {
      var img = document.createElement('img');
      img.src = e.target.result;
      wrap.appendChild(img);
    };
    reader.readAsDataURL(file);
  });
}

/* ---------- Vidéo : durée + compression ---------- */
function onRevueVideoSelected(input) {
  var file = input.files[0];
  if (!file) return;
  var statusEl = document.getElementById('video-status-msg');
  statusEl.textContent = 'Vérification de la vidéo...';

  var tempVideo = document.createElement('video');
  tempVideo.preload = 'metadata';
  tempVideo.src = URL.createObjectURL(file);
  tempVideo.onloadedmetadata = async function() {
    var duration = tempVideo.duration;
    URL.revokeObjectURL(tempVideo.src);

    if (duration > REVUE_CONFIG.maxVideoSeconds) {
      statusEl.textContent = 'Vidéo trop longue (' + Math.round(duration) + 's). Maximum ' + REVUE_CONFIG.maxVideoSeconds + 's.';
      toast('Vidéo trop longue.', 'error');
      input.value = '';
      pendingVideoFile = null;
      pendingVideoDuration = null;
      return;
    }

    pendingVideoDuration = Math.round(duration);
    var finalFile = file;

    if (file.size > REVUE_CONFIG.maxVideoBytesBeforeCompression) {
      statusEl.textContent = 'Compression en cours (fichier de ' + Math.round(file.size / 1024 / 1024) + ' Mo)...';
      try {
        finalFile = await compressVideoFile(file);
        statusEl.textContent = 'Compressée : ' + Math.round(finalFile.size / 1024 / 1024 * 10) / 10 + ' Mo (originale ' + Math.round(file.size / 1024 / 1024) + ' Mo).';
      } catch (e) {
        statusEl.textContent = 'Compression impossible sur cet appareil, envoi du fichier original.';
        finalFile = file;
      }
    } else {
      statusEl.textContent = 'Vidéo prête (' + Math.round(file.size / 1024 / 1024 * 10) / 10 + ' Mo, ' + pendingVideoDuration + 's).';
    }

    pendingVideoFile = finalFile;
    var preview = document.getElementById('video-preview');
    preview.src = URL.createObjectURL(finalFile);
    preview.style.display = 'block';
  };
  tempVideo.onerror = function() {
    statusEl.textContent = 'Impossible de lire cette vidéo.';
    toast('Fichier vidéo invalide.', 'error');
  };
}

/* Compression client-side : re-encode via canvas + MediaRecorder,
   résolution plafonnée et bitrate réduit. Fonctionne dans Chrome
   Android (celui utilisé sur le S8). Se déroule en temps réel
   (une vidéo de 150s prend ~150s à compresser). */
function compressVideoFile(file) {
  return new Promise(function(resolve, reject) {
    var video = document.createElement('video');
    video.src = URL.createObjectURL(file);
    video.muted = true;
    video.playsInline = true;

    video.addEventListener('loadedmetadata', function() {
      var maxWidth = 854; // ~480p
      var scale = video.videoWidth > maxWidth ? maxWidth / video.videoWidth : 1;
      var w = Math.round(video.videoWidth * scale);
      var h = Math.round(video.videoHeight * scale);

      var canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      var ctx = canvas.getContext('2d');

      var stream = canvas.captureStream(25);
      var mimeType = (window.MediaRecorder && MediaRecorder.isTypeSupported('video/webm;codecs=vp9'))
        ? 'video/webm;codecs=vp9' : 'video/webm';

      if (!window.MediaRecorder) { reject(new Error('MediaRecorder non supporté')); return; }

      var recorder = new MediaRecorder(stream, { mimeType: mimeType, videoBitsPerSecond: 1200000 });
      var chunks = [];
      recorder.ondataavailable = function(e) { if (e.data.size > 0) chunks.push(e.data); };
      recorder.onstop = function() {
        var blob = new Blob(chunks, { type: mimeType });
        var newName = file.name.replace(/\.[^.]+$/, '') + '.webm';
        resolve(new File([blob], newName, { type: mimeType }));
      };
      recorder.onerror = function(e) { reject(e.error || new Error('Erreur MediaRecorder')); };

      function drawFrame() {
        if (video.paused || video.ended) return;
        ctx.drawImage(video, 0, 0, w, h);
        requestAnimationFrame(drawFrame);
      }

      video.addEventListener('play', function() {
        recorder.start();
        drawFrame();
      });
      video.addEventListener('ended', function() { recorder.stop(); });

      video.play().catch(reject);
    });

    video.addEventListener('error', function() { reject(new Error('Lecture vidéo impossible')); });
  });
}

/* ---------- Chargement (mode édition) ---------- */
async function loadExistingPost(id) {
  var res = await sb.from('revue_posts')
    .select('*, images:revue_post_images(id, url, order_index)')
    .eq('id', id)
    .single();
  var p = res.data;
  if (!p) { toast('Publication introuvable.', 'error'); return; }

  document.getElementById('admin-form-eyebrow').textContent = 'Modifier';
  document.getElementById('admin-form-title').textContent = p.title;

  document.getElementById('f-title').value = p.title || '';
  document.getElementById('f-summary').value = p.summary || '';
  document.getElementById('f-body').value = p.body || '';
  document.getElementById('f-status').value = p.status || 'draft';
  document.getElementById('f-youtube').value = p.youtube_url || '';
  document.getElementById('f-tiktok').value = p.tiktok_url || '';

  await loadCategoriesIntoSelect(p.category_id);

  if (p.cover_image_url) {
    var img = document.getElementById('cover-preview');
    img.src = p.cover_image_url;
    img.style.display = 'block';
  }
  if (p.video_url) {
    var v = document.getElementById('video-preview');
    v.src = p.video_url;
    v.style.display = 'block';
    document.getElementById('video-status-msg').textContent = 'Vidéo actuelle (' + (p.video_duration_seconds || '?') + 's). Choisis un fichier pour la remplacer.';
    pendingVideoDuration = p.video_duration_seconds;
  }
  if (p.images && p.images.length) {
    existingGalleryImages = p.images;
    var wrap = document.getElementById('gallery-preview');
    wrap.innerHTML = '';
    p.images.forEach(function(img) {
      var el = document.createElement('img');
      el.src = img.url;
      wrap.appendChild(el);
    });
  }
}

/* ---------- Sauvegarde ---------- */
async function saveRevuePost() {
  var title = document.getElementById('f-title').value.trim();
  if (!title) { toast('Le titre est obligatoire.', 'error'); return; }

  var btn = document.getElementById('save-btn');
  btn.disabled = true;
  btn.textContent = 'Enregistrement...';

  try {
    var payload = {
      title: title,
      category_id: document.getElementById('f-category').value || null,
      summary: document.getElementById('f-summary').value || null,
      body: document.getElementById('f-body').value || null,
      status: document.getElementById('f-status').value,
      youtube_url: document.getElementById('f-youtube').value || null,
      tiktok_url: document.getElementById('f-tiktok').value || null,
      updated_at: new Date().toISOString()
    };
    if (payload.status === 'published') payload.published_at = new Date().toISOString();

    // Upload couverture
    if (pendingCoverFile) {
      var coverPath = 'covers/' + Date.now() + '-' + pendingCoverFile.name;
      var upCover = await sb.storage.from('revue-covers').upload(coverPath, pendingCoverFile, { upsert: true });
      if (upCover.error) throw upCover.error;
      payload.cover_image_url = sb.storage.from('revue-covers').getPublicUrl(coverPath).data.publicUrl;
    }

    // Upload vidéo
    if (pendingVideoFile) {
      var videoPath = 'videos/' + Date.now() + '-' + pendingVideoFile.name;
      var upVideo = await sb.storage.from('revue-videos').upload(videoPath, pendingVideoFile, { upsert: true });
      if (upVideo.error) throw upVideo.error;
      payload.video_url = sb.storage.from('revue-videos').getPublicUrl(videoPath).data.publicUrl;
      payload.video_duration_seconds = pendingVideoDuration;
    }

    var postId = editingId;
    if (editingId) {
      var upd = await sb.from('revue_posts').update(payload).eq('id', editingId);
      if (upd.error) throw upd.error;
    } else {
      payload.slug = slugify(title);
      payload.author_id = currentUser.id;
      var ins = await sb.from('revue_posts').insert(payload).select().single();
      if (ins.error) throw ins.error;
      postId = ins.data.id;
    }

    // Upload galerie (ajout aux images existantes)
    if (pendingGalleryFiles.length) {
      var startOrder = existingGalleryImages.length;
      for (var i = 0; i < pendingGalleryFiles.length; i++) {
        var gFile = pendingGalleryFiles[i];
        var gPath = 'gallery/' + postId + '/' + Date.now() + '-' + i + '-' + gFile.name;
        var upG = await sb.storage.from('revue-gallery').upload(gPath, gFile, { upsert: true });
        if (upG.error) throw upG.error;
        var gUrl = sb.storage.from('revue-gallery').getPublicUrl(gPath).data.publicUrl;
        await sb.from('revue_post_images').insert({ post_id: postId, url: gUrl, order_index: startOrder + i });
      }
    }

    toast('Publication enregistrée !');
    window.location.href = 'article.html?id=' + postId;
  } catch (e) {
    toast('Erreur : ' + (e.message || e), 'error');
    btn.disabled = false;
    btn.textContent = 'Enregistrer';
  }
}

/* ---------- Init ---------- */
document.addEventListener('DOMContentLoaded', async function() {
  var ok = await guardAdminAccess();
  if (!ok) return;

  var params = new URLSearchParams(window.location.search);
  editingId = params.get('id');

  if (editingId) {
    await loadExistingPost(editingId);
  } else {
    await loadCategoriesIntoSelect(null);
  }
});
