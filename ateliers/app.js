/* ============================================================
   ateliers/app.js — Lakou Archi
   Logique propre à la page Ateliers (espace de travail par type).
   Dépend des fonctions partagées de /app.js : sb, toast, showNotif,
   currentUser, currentProfile, showAccessModal, openLightbox,
   openStudentGallery.
   ============================================================ */

var currentAtelierType = null;

var ATELIER_LABELS = {
  sketches: 'Carnets de croquis',
  conceptual: 'Maquettes conceptuelles',
  plans: 'Plans en cours',
  evolution: 'Évolutions du projet',
  validated: 'Plans validés',
  final: 'Maquettes finales',
  artistic: 'Travaux artistiques'
};

function selectAtelierType(type, btn) {
  currentAtelierType = type;
  document.querySelectorAll('.atelier-type-btn').forEach(function(b) {
    b.classList.remove('active');
  });
  if (btn) btn.classList.add('active');
  var titleEl = document.getElementById('atelier-gallery-title');
  if (titleEl) titleEl.textContent = ATELIER_LABELS[type] || type;
  loadAtelierPosts(type);
}

async function loadAtelierPosts(type) {
  var grid = document.getElementById('atelier-post-grid');
  grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:2rem;color:var(--gris)">Chargement...</div>';
  try {
    var res = await sb.from('chambre_posts')
      .select('*, author:profiles(id, full_name, avatar_url)')
      .eq('chambre_type', type)
      .order('created_at', { ascending: false });
    var posts = res.data || [];
    if (posts.length === 0) {
      grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:3rem;color:var(--gris);font-size:0.85rem">Aucune publication dans cet atelier. Soyez le premier !</div>';
      return;
    }
    var html = '';
    for (var i = 0; i < posts.length; i++) {
      var post = posts[i];
      var authorName = (post.author && post.author.full_name) ? post.author.full_name : 'Anonyme';
      var authorId = (post.author && post.author.id) ? post.author.id : null;
      var authorLink = authorId
        ? '<span class="atelier-post-author" onclick="openStudentGallery(\'' + authorId + '\')">' + authorName + '</span>'
        : '<span class="atelier-post-author">' + authorName + '</span>';
      var date = new Date(post.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
      var isOwner = currentUser && post.author_id === currentUser.id;
      var isPdf = post.file_type === 'application/pdf' || (post.file_url && post.file_url.endsWith('.pdf'));

      html += '<div class="atelier-post-card" id="apost-' + post.id + '">';
      html += '<div class="atelier-post-card-header">';
      var avatarHtml = (post.author && post.author.avatar_url)
        ? '<img src="' + post.author.avatar_url + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" onerror="this.style.display=\'none\';this.parentNode.innerText=\'' + authorName.charAt(0).toUpperCase() + '\'">'
        : authorName.charAt(0).toUpperCase();
      html += '<div class="atelier-post-avatar">' + avatarHtml + '</div>';
      html += '<div>';
      html += '<div class="atelier-post-author" onclick="' + (authorId ? "openStudentGallery('" + authorId + "')" : '') + '">' + authorName + '</div>';
      html += '<div class="atelier-post-date">' + date + '</div>';
      html += '</div></div>';

      if (isPdf) {
        html += '<div class="atelier-post-pdf">';
        html += '<span style="font-size:2rem">📄</span>';
        html += '<a href="' + post.file_url + '" target="_blank" rel="noopener" download="document.pdf" class="atelier-post-pdf-link">Télécharger / Voir le PDF</a>';
        html += '</div>';
      } else if (post.file_urls && post.file_urls.length > 1) {
        var imgs = post.file_urls;
        html += '<div class="atelier-carousel" id="carousel-' + post.id + '">';
        html += '<div class="atelier-carousel-track">';
        for (var j = 0; j < imgs.length; j++) {
          html += '<img src="' + imgs[j] + '" class="atelier-carousel-slide" style="' + (j === 0 ? '' : 'display:none') + '" onclick="openLightbox(\'' + imgs[j] + '\')">';
        }
        html += '</div>';
        html += '<div class="atelier-carousel-counter"><span class="carousel-current">1</span>/' + imgs.length + '</div>';
        html += '<button class="carousel-prev" onclick="carouselNav(\'' + post.id + '\',-1)">&#8249;</button>';
        html += '<button class="carousel-next" onclick="carouselNav(\'' + post.id + '\',1)">&#8250;</button>';
        html += '</div>';
      } else {
        html += '<div class="atelier-post-img">';
        html += '<img src="' + (post.file_url || '') + '" alt="' + authorName + '" onclick="openLightbox(\'' + post.file_url + '\')">';
        html += '</div>';
      }

      html += '<div class="atelier-post-body">';
      html += '<div class="atelier-post-actions">';
      html += '<button class="atelier-like-btn" onclick="doLikeAtelierPost(\'' + post.id + '\', this)">♥ <span class="like-num">' + (post.like_count || 0) + '</span></button>';
      html += '<button class="atelier-comment-btn" onclick="toggleAtelierComments(\'' + post.id + '\')">💬</button>';
      if (isOwner) { html += '<button class="atelier-delete-btn" onclick="doDeleteAtelierPost(\'' + post.id + '\', \'' + post.file_url + '\')">🗑</button>'; }
      html += '</div>';
      if (post.caption) { html += '<p class="atelier-post-caption">' + post.caption + '</p>'; }
      html += '<div class="comment-section" id="acomments-' + post.id + '">';
      html += '<div id="acomments-list-' + post.id + '"></div>';
      html += '<div class="comment-input-row">';
      html += '<input type="text" class="comment-input" id="acomment-input-' + post.id + '" placeholder="Commenter...">';
      html += '<button class="comment-submit" onclick="doAddAtelierComment(\'' + post.id + '\')">→</button>';
      html += '</div></div>';
      html += '</div></div>';
    }
    grid.innerHTML = html;
  } catch (e) {
    console.log('atelier err:', e.message, e);
    grid.innerHTML = '<div style="text-align:center;padding:2rem;color:red;font-size:0.8rem">Erreur: ' + e.message + '</div>';
  }
}

function carouselNav(postId, direction) {
  var carousel = document.getElementById('carousel-' + postId);
  if (!carousel) { return; }
  var slides = carousel.querySelectorAll('.atelier-carousel-slide');
  var counter = carousel.querySelector('.carousel-current');
  var current = 0;
  for (var i = 0; i < slides.length; i++) {
    if (slides[i].style.display !== 'none') { current = i; break; }
  }
  slides[current].style.display = 'none';
  var next = (current + direction + slides.length) % slides.length;
  slides[next].style.display = 'block';
  if (counter) { counter.textContent = next + 1; }
}

function compressImage(file, maxWidthPx, qualite) {
  return new Promise(function(resolve) {
    var reader = new FileReader();
    reader.onload = function(e) {
      var img = new Image();
      img.onload = function() {
        var canvas = document.createElement('canvas');
        var ratio = Math.min(maxWidthPx / img.width, maxWidthPx / img.height, 1);
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;
        var ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(function(blob) {
          resolve(new File([blob], file.name, { type: 'image/jpeg' }));
        }, 'image/jpeg', qualite);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

async function doAtelierUploadMultiple(input) {
  var files = Array.from(input.files);
  if (!files.length || !currentUser || !currentAtelierType) { return; }
  if (files.length > 10) { toast('Maximum 10 images à la fois.', 'error'); return; }
  var totalSize = files.reduce(function(sum, f) { return sum + f.size; }, 0);
  if (totalSize > 20 * 1024 * 1024) { toast('Taille totale trop lourde. Maximum 20 MB pour le groupe.', 'error'); return; }
  var oversized = files.filter(function(f) { return f.size > 10 * 1024 * 1024; });
  if (oversized.length > 0) { toast('Un fichier dépasse 10 MB.', 'error'); return; }
  toast('Upload en cours... (' + files.length + ' fichier' + (files.length > 1 ? 's' : '') + ')');
  var urls = [];
  try {
    for (var i = 0; i < files.length; i++) {
      var file = files[i];
      if (file.type.startsWith('image/')) { file = await compressImage(file, 1920, 0.82); }
      var ext = 'jpg';
      var path = 'ateliers/' + currentAtelierType + '/' + currentUser.id + '-' + Date.now() + '-' + i + '.' + ext;
      var up = await sb.storage.from('project-images').upload(path, file, { upsert: true });
      if (up.error) { throw new Error('Échec fichier ' + (i + 1) + ': ' + up.error.message); }
      var url = sb.storage.from('project-images').getPublicUrl(path).data.publicUrl;
      urls.push(url);
    }
  } catch (e) { toast('Erreur upload: ' + e.message, 'error'); return; }
  if (urls.length === 0) { toast('Aucun fichier uploadé.', 'error'); return; }
  try {
    var res = await sb.from('chambre_posts').insert({
      chambre_type: currentAtelierType || 'sketches',
      author_id: currentUser.id,
      file_url: urls[0],
      file_urls: urls,
      file_type: files[0].type,
      caption: null,
      like_count: 0
    });
    if (res.error) { throw new Error(res.error.message); }
  } catch (e) { toast('Erreur sauvegarde: ' + e.message, 'error'); return; }
  input.value = '';
  toast('' + urls.length + ' image' + (urls.length > 1 ? 's' : '') + ' publiée' + (urls.length > 1 ? 's' : '') + ' !');
  await loadAtelierPosts(currentAtelierType);
}

async function doAtelierUpload(input) {
  var file = input.files[0];
  if (!file || !currentUser) { return; }
  if (!currentAtelierType) { currentAtelierType = 'sketches'; }
  if (file.size > 10 * 1024 * 1024) { toast('Fichier trop lourd. Maximum 10 MB.', 'error'); return; }
  toast('Upload en cours...');
  var isPDF = file.type === 'application/pdf';
  if (!isPDF && file.type.startsWith('image/')) { file = await compressImage(file, 1920, 0.82); }
  var ext = isPDF ? file.name.split('.').pop() : 'jpg';
  var path = 'ateliers/' + currentAtelierType + '/' + currentUser.id + '-' + Date.now() + '.' + ext;
  var up = await sb.storage.from('project-images').upload(path, file);
  if (up.error) { toast(up.error.message, 'error'); return; }
  var url = sb.storage.from('project-images').getPublicUrl(path).data.publicUrl;
  var res = await sb.from('chambre_posts').insert({
    chambre_type: currentAtelierType || 'sketches',
    author_id: currentUser.id,
    file_url: url,
    file_type: isPDF ? 'application/pdf' : file.type,
    caption: null,
    like_count: 0
  });
  if (res.error) { toast('Erreur: ' + res.error.message, 'error'); return; }
  input.value = '';
  toast('Publication ajoutée !');
  if (typeof showNotif === 'function') showNotif('Nouvelle publication dans l\'atelier ' + (ATELIER_LABELS[currentAtelierType] || currentAtelierType));
  await loadAtelierPosts(currentAtelierType);
}

async function doLikeAtelierPost(postId, btn) {
  if (!currentUser) { window.location.href = '/login/'; return; }
  var num = btn.querySelector('.like-num');
  var current = parseInt(num.textContent) || 0;
  btn.classList.toggle('liked');
  var isLiked = btn.classList.contains('liked');
  var newVal = isLiked ? current + 1 : current - 1;
  num.textContent = newVal;
  btn.style.transform = isLiked ? 'scale(1.2)' : 'scale(1)';
  setTimeout(function() { btn.style.transform = 'scale(1)'; }, 200);
  await sb.from('chambre_posts').update({ like_count: newVal }).eq('id', postId);
  if (isLiked && typeof showNotif === 'function') { showNotif('Publication aimée dans cet atelier.'); }
}

async function doDeleteAtelierPost(postId, fileUrl) {
  if (!confirm('Supprimer cette publication ? Action irréversible.')) { return; }
  var res = await sb.from('chambre_posts').delete().eq('id', postId);
  if (res.error) { toast(res.error.message, 'error'); return; }
  try {
    var path = decodeURIComponent(fileUrl).split('/project-images/')[1];
    if (path) { await sb.storage.from('project-images').remove([path]); }
  } catch (e) { console.warn('storage delete:', e); }
  toast('Publication supprimée.');
  await loadAtelierPosts(currentAtelierType);
}

function toggleAtelierComments(postId) {
  var section = document.getElementById('acomments-' + postId);
  if (!section) { return; }
  var btn = document.querySelector('[onclick*="toggleAtelierComments(\'' + postId + '\')"]');
  section.classList.toggle('open');
  if (section.classList.contains('open')) {
    loadAtelierComments(postId);
    if (btn) { btn.classList.add('open'); }
  } else {
    if (btn) { btn.classList.remove('open'); }
  }
}

async function loadAtelierComments(postId) {
  var list = document.getElementById('acomments-list-' + postId);
  if (!list) { return; }

  var res = await sb.from('chambre_comments')
    .select('*, author:profiles!author_id(full_name, avatar_url, role)')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });

  var comments = res.data || [];
  if (comments.length === 0) {
    list.innerHTML = '<p style="font-size:0.78rem;color:var(--gris);padding:0.3rem 0">Aucun commentaire.</p>';
    return;
  }

  comments.sort(function(a, b) {
    var aIsTeacher = (a.author && (a.author.role === 'teacher' || a.author.role === 'admin')) ? 0 : 1;
    var bIsTeacher = (b.author && (b.author.role === 'teacher' || b.author.role === 'admin')) ? 0 : 1;
    return aIsTeacher - bIsTeacher;
  });

  var VISIBLE = 3;
  var html = '';

  for (var i = 0; i < comments.length; i++) {
    var c = comments[i];
    var name = c.author ? c.author.full_name : 'Anonyme';
    var isTeacher = c.author && (c.author.role === 'teacher' || c.author.role === 'admin');
    var hidden = i >= VISIBLE ? ' style="display:none" class="comment-item comment-hidden"' : ' class="comment-item' + (isTeacher ? ' comment-teacher' : '') + '"';

    var commentAvatar = (c.author && c.author.avatar_url)
      ? '<img src="' + c.author.avatar_url + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" onerror="this.style.display=\'none\';this.parentNode.innerText=\'' + name.charAt(0).toUpperCase() + '\'">'
      : name.charAt(0).toUpperCase();

    html += '<div' + hidden + '>';
    html += '<div class="comment-avatar-sm">' + commentAvatar + '</div>';
    html += '<div class="comment-body">';
    html += '<div class="comment-author">' + name + (isTeacher ? ' <span style="font-size:0.65rem;background:var(--ocre);color:#fff;padding:1px 6px;border-radius:999px;margin-left:4px">Intervenant</span>' : '') + '</div>';
    html += '<div class="comment-text">' + c.content + '</div>';
    html += '</div></div>';
  }

  if (comments.length > VISIBLE) {
    html += '<button onclick="showAllComments(\'' + postId + '\')" style="background:none;border:none;color:var(--ocre);font-size:0.78rem;cursor:pointer;padding:0.3rem 0;font-family:sans-serif;">Voir les ' + comments.length + ' commentaires</button>';
  }

  list.innerHTML = html;
}

function showAllComments(postId) {
  var hidden = document.querySelectorAll('#acomments-list-' + postId + ' .comment-hidden');
  for (var i = 0; i < hidden.length; i++) {
    hidden[i].style.display = 'flex';
    hidden[i].classList.remove('comment-hidden');
  }
  var btn = document.querySelector('#acomments-list-' + postId + ' button');
  if (btn) { btn.style.display = 'none'; }
}

async function doAddAtelierComment(postId) {
  if (!currentUser) { window.location.href = '/login/'; return; }
  var input = document.getElementById('acomment-input-' + postId);
  var content = input ? input.value.trim() : '';
  if (!content) return;
  var res = await sb.from('chambre_comments').insert({
    post_id: postId,
    author_id: currentUser.id,
    content: content
  });
  if (res.error) { toast(res.error.message, 'error'); return; }
  input.value = '';
  await loadAtelierComments(postId);
}

/* Lit ?type=xxx dans l'URL (posé par goToAteliers() sur les autres pages)
   et ouvre directement le bon atelier au chargement. */
document.addEventListener('DOMContentLoaded', function() {
  var params = new URLSearchParams(window.location.search);
  var type = params.get('type') || 'sketches';
  var btn = document.querySelector('.atelier-type-btn[data-type="' + type + '"]');
  selectAtelierType(type, btn);
});
