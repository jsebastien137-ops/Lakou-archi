
var SUPABASE_URL = 'https://qptnjgdfobznwmsguvyf.supabase.co';
var SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFwdG5qZ2Rmb2J6bndtc2d1dnlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5MjA3MjIsImV4cCI6MjA5MzQ5NjcyMn0.QLfIITvc-AdWVLZHHghocNYyYyYvPxZZMAXhdl_4Bdo';
var sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    var currentUser = null;
var currentProfile = null;
var currentProjectId = null;
var allPublicProjects = [];
var slideIdx = 0;
var slideTimer = null;
var totalSlides = 4;
var currentGalerieUserId = null;
var STAGE_LABELS = {
  sketches: 'Carnets de croquis',
  conceptual: 'Maquettes conceptuelles',
  plans: 'Plans en cours',
  final: 'Maquettes finales'
};

  var ATELIER_LABELS = {
  sketches: 'Carnets de croquis',
  conceptual: 'Maquettes conceptuelles',
  plans: 'Plans en cours',
  evolution: 'Evolutions du projet',
  validated: 'Plans valides',
  final: 'Maquettes finales',
  artistic: 'Travaux artistiques'
};
var currentAtelierType = null;
function showPage(name) {
  if (name === 'home') { loadStats(); loadVivante(); loadHomeProjects(); }
  if (name === 'contact') {
  var nameEl = document.getElementById('contact-name');
  if (nameEl && currentProfile) nameEl.value = currentProfile.full_name || '';
  var emailEl = document.getElementById('contact-email');
  if (emailEl && currentUser) emailEl.value = currentUser.email || '';
}
  if ((name === 'login' || name === 'register') && currentUser) {
    name = 'dashboard';
    var footer = document.getElementById('main-footer');
if (footer) footer.style.display = (name === 'home') ? 'block' : 'none';
  }
  var pages = document.querySelectorAll('.page');
  for (var i = 0; i < pages.length; i++) pages[i].classList.add('hidden');
  var p = document.getElementById('page-' + name);
  if (p) { p.classList.remove('hidden'); window.scrollTo(0,0); }
 if (name === 'galerie') loadGalerie();
    if (name === 'explorer-ateliers') loadExplorerAteliers();
    var backBtn = document.getElementById('global-back-btn');
if (backBtn) backBtn.style.display = (name === 'home') ? 'none' : 'flex';
    if (name === 'dashboard') loadDashboard();
  if (name === 'projects-public') loadPublicProjects();
  if (name === 'validate') loadValidationQueue();
 if (name === 'home') { loadStats(); loadVivante(); }
    if (name === 'chambres') {} 
if (name === 'teachers') { loadTeachersHome(); }

    if (name === 'settings') {}
}
   async function loadHomeProjects() {
  var grid = document.getElementById('home-projects-grid');
  if (!grid) { return; }
  var res = await sb.from('projects')
    .select('*, student:profiles!student_id(id, full_name, avatar_url, school)')
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .limit(6);
  if (res.error || !res.data || res.data.length === 0) {
    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:3rem;color:var(--gris);font-size:0.85rem">Aucun projet disponible.</div>';
    return;
  }
  allPublicProjects = res.data;
  renderGrid('home-projects-grid', res.data);
}
function showNotif(msg) {
  var notif = localStorage.getItem('notif');
  if (notif === '0') return;
  var banner = document.getElementById('notif-banner');
  var text = document.getElementById('notif-text');
  if (!banner || !text) return;
  text.textContent = msg;
  banner.classList.remove('hidden');
  setTimeout(function() { banner.classList.add('hidden'); }, 5000);
}
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
function statusBadge(s) {
  var l = {draft:'Brouillon',pending:'En attente',approved:'Approuve',rejected:'Refuse'};
  return '<span class="status-' + s + '">' + (l[s]||s) + '</span>';
}
function openLightbox(url) {
  document.getElementById('lightbox-img').src = url;
  document.getElementById('lightbox').classList.remove('hidden');
}
function closeLightbox() {
  document.getElementById('lightbox').classList.add('hidden');
  document.getElementById('lightbox-img').src = '';
}

function toggleMenu() {
  var btn = document.getElementById('hamburger-btn');
  var drawer = document.getElementById('menu-drawer');
  var overlay = document.getElementById('menu-overlay');
  btn.classList.toggle('open');
  drawer.classList.toggle('open');
  overlay.classList.toggle('open');
}
function closeMenu() {
  document.getElementById('hamburger-btn').classList.remove('open');
  document.getElementById('menu-drawer').classList.remove('open');
  document.getElementById('menu-overlay').classList.remove('open');
}

function goToSlide(n) {
  var slides = document.querySelectorAll('.slide');
  var dots = document.querySelectorAll('.dot');
  if (!slides.length || !dots.length) return;
  var total = slides.length;
  if (slides[slideIdx]) slides[slideIdx].classList.remove('active');
  if (dots[slideIdx]) dots[slideIdx].classList.remove('active');
  slideIdx = ((n % total) + total) % total;
  if (slides[slideIdx]) slides[slideIdx].classList.add('active');
  if (dots[slideIdx]) dots[slideIdx].classList.add('active');
}
function slideNext() { goToSlide(slideIdx + 1); }
function slidePrev() { goToSlide(slideIdx - 1); }
function startSlideshow() {
  slideTimer = setInterval(slideNext, 6000);
}
function stopSlideshow() { clearInterval(slideTimer); }


function updateNavForUser() {
  var signinBtn = document.getElementById('nav-signin-btn');
  if (signinBtn) signinBtn.classList.add('hidden');
  var dashLink = document.getElementById('nav-dashboard-link');
  if (dashLink) dashLink.classList.remove('hidden');
  var logoutBtn = document.getElementById('nav-logout-btn');
  if (logoutBtn) logoutBtn.classList.remove('hidden');
  var menuDash = document.getElementById('menu-dashboard');
  if (menuDash) menuDash.classList.remove('hidden');
  var menuGalerie = document.getElementById('menu-galerie');
if (menuGalerie) menuGalerie.classList.remove('hidden');
var menuSettings = document.getElementById('menu-settings');
if (menuSettings) menuSettings.classList.remove('hidden');
  var menuLogout = document.getElementById('menu-logout-item');
  if (menuLogout) menuLogout.classList.remove('hidden');
  var menuLogin = document.getElementById('menu-login-item');
  if (menuLogin) menuLogin.classList.add('hidden');
  var menuRegister = document.getElementById('menu-register-btn');
  if (menuRegister) menuRegister.classList.add('hidden');
  var menuLogoutBtn = document.getElementById('menu-logout-btn');
if (menuLogoutBtn) menuLogoutBtn.classList.remove('hidden');
}
function updateNavForGuest() {
  var signinBtn = document.getElementById('nav-signin-btn');
  if (signinBtn) signinBtn.classList.remove('hidden');
  var dashLink = document.getElementById('nav-dashboard-link');
  if (dashLink) dashLink.classList.add('hidden');
  var logoutBtn = document.getElementById('nav-logout-btn');
  if (logoutBtn) logoutBtn.classList.add('hidden');
  var menuDash = document.getElementById('menu-dashboard');
  if (menuDash) menuDash.classList.add('hidden');
  var menuGalerie = document.getElementById('menu-galerie');
var menuSettings = document.getElementById('menu-settings');
if (menuSettings) menuSettings.classList.add('hidden');
  var menuLogout = document.getElementById('menu-logout-item');
  if (menuLogout) menuLogout.classList.add('hidden');
  var menuLogin = document.getElementById('menu-login-item');
  if (menuLogin) menuLogin.classList.remove('hidden');
  var menuRegister = document.getElementById('menu-register-btn');
  if (menuRegister) menuRegister.classList.remove('hidden');
}

function updateAdminUI() {
  if (!currentProfile) return;
  var role = currentProfile.role;
  var vb = document.getElementById('dash-validate-btn');
  var nb = document.getElementById('dash-new-project-btn');
  var mv = document.getElementById('menu-validate');
  if (role === 'admin' || role === 'teacher') {
    if (vb) vb.classList.remove('hidden');
    if (nb) nb.classList.add('hidden');
    if (mv) mv.classList.remove('hidden');
  } else {
    if (vb) vb.classList.add('hidden');
    if (nb) nb.classList.remove('hidden');
    if (mv) mv.classList.add('hidden');
  }
}

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
    currentProfile = { role:'student', full_name:email, email:email, id:res.data.user.id };
    btn.disabled = false;
    btn.textContent = 'Se connecter';
    updateNavForUser();
    await loadProfileData();
    if (currentProfile) loadThemeFromProfile(currentProfile);
    updateAdminUI();
    toast('Connexion réussie !');
    document.querySelectorAll('.page').forEach(function(p) { p.classList.add('hidden'); });
    document.getElementById('page-dashboard').classList.remove('hidden');
    window.scrollTo(0, 0);
 } catch(e) {
    clearTimeout(timer);
    console.warn('Login catch:', e);
    if (currentUser) {
      showPage('home');
    }
    btn.disabled = false;
    btn.textContent = 'Se connecter';
  }
}

async function loadProfileData() {
  if (!currentUser) return;
  try {
    var res = await sb.from('profiles').select('*').eq('id', currentUser.id).single();
    if (res.data) {
      currentProfile = res.data;
      var fn = res.data.full_name || currentUser.email;
      var e1 = document.getElementById('dash-firstname'); if(e1) e1.textContent = fn.split(' ')[0];
      var e2 = document.getElementById('dash-email'); if(e2) e2.textContent = currentUser.email;
      var e3 = document.getElementById('dash-fullname'); if(e3) e3.textContent = fn;
      var roleLabel = res.data.role === 'teacher' ? 'Enseignant(e)' : res.data.role === 'admin' ? 'Administrateur' : 'Etudiant(e)';
      var e5 = document.getElementById('dash-role-label'); if(e5) e5.textContent = roleLabel;
      var e6 = document.getElementById('dash-bio');
if (e6) e6.textContent = res.data.bio || '';
      // Avatar
      var avatarImg = document.getElementById('dash-avatar-img');
      var avatarLetter = document.getElementById('dash-avatar-letter');
      var removeBtn = document.getElementById('avatar-remove-btn');
      if (res.data.avatar_url) {
        if(avatarImg) { avatarImg.src = res.data.avatar_url; avatarImg.style.display = 'block'; }
        if(avatarLetter) avatarLetter.style.display = 'none';
        if(removeBtn) removeBtn.style.display = 'block';
      } else {
        if(avatarImg) avatarImg.style.display = 'none';
        if(avatarLetter) { avatarLetter.style.display = 'block'; avatarLetter.textContent = fn.charAt(0).toUpperCase(); }
        if(removeBtn) removeBtn.style.display = 'none';
      }
      updateAdminUI();
      if (res.data.role === 'admin') {
        var ap = document.getElementById('admin-panel');
        if (ap) ap.classList.remove('hidden');
      }
    }
  } catch(e) { console.log('profile err:', e); }
}

async function doRegister() {
  hideErr('register-error');
  var btn = document.getElementById('register-btn');
  var name = document.getElementById('reg-name').value;
  var email = document.getElementById('reg-email').value;
  var password = document.getElementById('reg-password').value;
  var role = document.getElementById('reg-role').value;
  var school = document.getElementById('reg-school') ? document.getElementById('reg-school').value.trim() || null : null; // ← AJOUTER
  if (!name || !email || !password) { showErr('register-error', 'Remplissez tous les champs.'); return; }
  var cgu = document.getElementById('cgu-check');
  if (!cgu || !cgu.checked) { showErr('register-error', 'Vous devez accepter les conditions d\'utilisation.'); return; }
  btn.disabled = true; btn.textContent = 'Inscription...';
  try {
    var res = await sb.auth.signUp({email: email, password: password, options: {data: {full_name: name, role: role}}});
    if (res.error) { showErr('register-error', res.error.message); btn.disabled = false; btn.textContent = 'Creer mon compte'; return; }
    if (res.data && res.data.user && school) { await sb.from('profiles').update({ school: school }).eq('id', res.data.user.id); } // ← AJOUTER
    var s = document.getElementById('register-success');
    s.textContent = 'Compte cree ! Vous pouvez maintenant vous connecter.';
    s.classList.remove('hidden');
    btn.disabled = false; btn.textContent = 'Creer mon compte';
  } catch(e) { showErr('register-error', 'Erreur: ' + e.message); btn.disabled = false; btn.textContent = 'Creer mon compte'; }
}

async function doForgot() {
  hideErr('forgot-error');
  var btn=document.getElementById('forgot-btn');
  var email=document.getElementById('forgot-email').value;
  btn.disabled=true; btn.textContent='Envoi...';
  try { await sb.auth.resetPasswordForEmail(email); }
  catch(e) {}
  var s=document.getElementById('forgot-success');
  s.textContent='Lien envoye ! Verifiez votre boite mail.';
  s.classList.remove('hidden');
  btn.disabled=false; btn.textContent='Envoyer le lien';
}

async function doLogout() {
  await sb.auth.signOut();
  currentUser=null; currentProfile=null;
  updateNavForGuest();
  toast('Deconnexion reussie.');
  showPage('home');
}

async function loadStats() {
  try {
    var projRes = await sb.from('projects').select('*', { count: 'exact', head: true }).eq('status', 'approved');
    var studRes = await sb.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student');
    var visitRes = await sb.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'visitor');
    var teachRes = await sb.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'teacher');

    var p = document.getElementById('stat-projects');
    var s = document.getElementById('stat-students');
    var v = document.getElementById('stat-visitors');
    var t = document.getElementById('stat-teachers');

    if (p) p.textContent = projRes.count || 0;
    if (s) s.textContent = studRes.count || 0;
    if (v) v.textContent = visitRes.count || 0;
    if (t) t.textContent = teachRes.count || 0;
  } catch(e) {
    console.warn('loadStats:', e);
  }
}
loadStats();
async function loadVivante() {
  var quotes = [
    {text:"L\u2019architecture, c\u2019est la volont\u00e9 d\u2019une \u00e9poque traduite dans l\u2019espace.", author:"Mies van der Rohe"},
    {text:"La maison est une machine \u00e0 habiter.", author:"Le Corbusier"},
    {text:"L\u2019architecture doit \u00e9lever l\u2019esprit.", author:"Louis Kahn"},
    {text:"B\u00e2tir, c\u2019est affirmer son existence dans le temps.", author:"Anonyme"},
    {text:"La beaut\u00e9 d\u2019un \u00e9difice tient dans sa v\u00e9rit\u00e9.", author:"Viollet-le-Duc"}
  ];
  var q = quotes[Math.floor(Math.random() * quotes.length)];
  var qt = document.getElementById('vivante-quote');
  var qa = document.getElementById('vivante-quote-author');
  if (qt) qt.textContent = q.text;
  if (qa) qa.textContent = '\u2014 ' + q.author;
  try {
    var res = await sb.from('projects')
      .select('*, student:profiles!student_id(full_name)')
      .eq('status','approved')
      .order('created_at',{ascending:false})
      .limit(1)
      .single();
    if (res.data) {
      
      var p = res.data;
      var pt = document.getElementById('vivante-proj-title');
      if (pt) pt.textContent = p.title;
      var ps = document.getElementById('vivante-proj-student');
      if (ps) ps.textContent = p.student ? p.student.full_name : '';
      var cnt = await sb.from('likes').select('*',{count:'exact',head:true}).eq('project_id',p.id);
      var pl = document.getElementById('vivante-proj-likes');
      if (pl) pl.textContent = '\u2665 ' + (cnt.count||0);
      var pb = document.getElementById('vivante-proj-btn');
      var imgEl = document.getElementById('vivante-proj-img');
if (imgEl && p.cover_image_url) {
  imgEl.src = p.cover_image_url;
  imgEl.style.display = 'block';
}
      if (pb) pb.onclick = function() { openProjectDetail(p.id); };
    }
  } catch(e) { console.warn('loadVivante error:', e); }
}
async function loadPublicProjects() {
  var res = await sb.from('projects')
    .select('*, student:profiles!student_id(id, full_name, avatar_url, school)')
    .eq('status', 'approved')
    .order('created_at', { ascending: false });
  allPublicProjects = res.data || [];
  renderGrid('public-projects-grid', allPublicProjects);
}

function filterProjects(level,btn) {
  var btns=document.querySelectorAll('.filter-btn');
  for(var i=0;i<btns.length;i++) btns[i].classList.remove('active');
  btn.classList.add('active');
  var filtered=level==='all'?allPublicProjects:allPublicProjects.filter(function(p){return p.level===level;});
  renderGrid('public-projects-grid',filtered);
}

function renderGrid(id, projects) {
  var c = document.getElementById(id);
  if (!projects || projects.length === 0) {
    c.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:3rem;color:var(--gris);font-size:0.85rem">Aucun projet disponible.</div>';
    return;
  }
  var html = '';
  for (var i = 0; i < projects.length; i++) {
    var p = projects[i];
    var student = p.student ? (p.student.full_name || '-') : '-';
    var studentId = p.student ? p.student.id : null;
    var school = p.student && p.student.school ? p.student.school : null;
    var schoolBadge = school ? '<span style="font-size:0.65rem;background:rgba(160,120,70,0.1);color:var(--terre);padding:2px 8px;border-radius:999px;font-family:sans-serif;margin-left:4px;">' + school + '</span>' : '';
    var studentHtml = studentId
      ? '<span class="project-card-student clickable" onclick="event.stopPropagation();openStudentGallery(\'' + studentId + '\')">' + student + '</span>' + schoolBadge
      : '<span class="project-card-student">' + student + '</span>' + schoolBadge;
    var year = p.academic_year || '';
    var area = p.area ? p.area + ' m2' : '';
    var atelier = p.program_type || '';
    var likes = p.like_count || 0;
    var views = p.view_count || 0;
    var imgHtml = p.cover_image_url
      ? '<img class="clickable" src="' + getWatermarkedUrl(p.cover_image_url, student) + '" draggable="false">'
      : '<div class="project-card-placeholder">' + p.title.charAt(0) + '</div>';
    var badge = p.level ? '<span class="project-card-badge">' + p.level + '</span>' : '';
    html += '<div class="project-card" onclick="openProjectDetail(' + JSON.stringify(p.id) + ')">';
    html += '<div class="project-card-img">' + imgHtml + badge + '</div>';
    html += '<div class="project-card-body">';
    html += '<h3 class="project-card-title">' + p.title + '</h3>';
    if (p.description) { html += '<p class="project-card-desc" style="font-size:0.78rem;color:var(--gris);font-family:sans-serif;margin:0.3rem 0 0.5rem;line-height:1.4;">' + p.description + '</p>'; }
    html += '<div class="project-card-meta-row">';
    if (year) { html += '<span class="project-card-meta-item">📅 ' + year + '</span>'; }
    if (area) { html += '<span class="project-card-meta-item">📐 ' + area + '</span>'; }
    if (atelier) { html += '<span class="project-card-meta-item">🏛️ ' + atelier + '</span>'; }
    html += '</div>';
    html += '<div class="project-card-footer">';
    html += studentHtml;
    var isOwner = currentUser && p.student_id === currentUser.id;
    var isAdmin = currentProfile && currentProfile.role === 'admin';
    html += '<div class="project-card-stats">';
    html += '<span>👁 ' + views + '</span>';
    html += '<span>♥ ' + likes + '</span>';
    html += '</div></div>';
    if (isOwner || isAdmin) {
      html += '<button class="project-delete-btn" onclick="event.stopPropagation();deleteProject(\'' + p.id + '\')" style="margin-top:0.5rem;background:none;border:none;color:#ccc;font-size:0.75rem;cursor:pointer;font-family:sans-serif;">🗑 Supprimer</button>';
    }
    html += '</div></div>';
  }
  c.innerHTML = html;
}

async function loadDashboard() {
  console.log('loadDashboard called, currentUser:', currentUser ? currentUser.id : 'NULL');
  if (!currentUser) { showPage('login'); return; }
  var listEl = document.getElementById('dash-projects-list');
  console.log('dash-projects-list found:', listEl ? 'YES' : 'NULL');
  await loadProfileData();
  if (currentProfile) loadThemeFromProfile(currentProfile);
  updateAdminUI();
  try {
    var res=await sb.from('projects').select('*, stages:project_stages(id)').eq('student_id',currentUser.id).order('updated_at',{ascending:false});
    var all=res.data||[];
    var e1=document.getElementById('stat-total'); if(e1) e1.textContent=all.length;
    var e2=document.getElementById('stat-approved'); if(e2) e2.textContent=all.filter(function(p){return p.status==='approved';}).length;
    var e3=document.getElementById('stat-pending'); if(e3) e3.textContent=all.filter(function(p){return p.status==='pending';}).length;
    var e4=document.getElementById('stat-draft'); if(e4) e4.textContent=all.filter(function(p){return p.status==='draft';}).length;
    var listEl=document.getElementById('dash-projects-list');
    if(all.length===0) {
      listEl.innerHTML = '<div class="empty-state"><p>Aucun projet pour le moment.</p><button class="btn-primary" onclick="showPage(&quot;new-project&quot;)">Creer mon premier projet</button></div>';
    } else {
      var STATUS_LABELS={draft:'Brouillon',pending:'En attente',approved:'Approuve',rejected:'Refuse'};
      var html='';
      for(var i=0;i<all.length;i++) {
        var p=all[i];
        html+='<div class="project-row" onclick="openProjectDetail('+JSON.stringify(p.id)+')">';
        html+='<div><div class="project-row-title">'+p.title+'</div>';
        html+='<div class="project-row-meta">'+(p.academic_year||'Annee non renseignee')+'</div></div>';
        html+='<div class="project-row-right"><span class="status-'+p.status+'">'+(p.status==='draft'?'Brouillon':p.status==='pending'?'En attente':p.status==='approved'?'Approuvé':'Refusé')+'</span>';
        if(p.status==='draft') html+='<button class="action-link" onclick="event.stopPropagation();openEditProject(\''+p.id+'\')">Modifier</button>';
        html+='</div></div>';
      }
      listEl.innerHTML=html;
    }
  } catch(e) { console.log('dash err:',e); }
}
function openAtelierOrLogin(type) {
  if (!currentUser) {
    toast('Connectez-vous pour entrer dans cet atelier.');
    showPage('login');
    return;
  }
  currentAtelierType = type;
  var labelEl = document.getElementById('atelier-gallery-title');
  var subEl = document.getElementById('atelier-gallery-subtitle');
  if (labelEl) labelEl.textContent = ATELIER_LABELS[type] || type;
  if (subEl) subEl.textContent = 'Atelier communautaire — partagez et decouvrez les travaux';
  document.querySelectorAll('.page').forEach(function(p){ p.classList.add('hidden'); });
  var pg = document.getElementById('page-atelier-gallery');
  if (pg) { pg.classList.remove('hidden'); window.scrollTo(0,0); }
  loadAtelierPosts(type);
}
async function doCreateProject() {
  if (!currentUser) { showPage('login'); return; }
  hideErr('new-project-error');
  var btn = document.getElementById('create-proj-btn');
  if (btn.disabled) { return; } // ← bloque les doubles clics
  var title = document.getElementById('proj-title').value;
  if (!title) { showErr('new-project-error', 'Le titre est obligatoire.'); return; }
  btn.disabled = true;
  btn.textContent = 'Creation en cours...';
  try {
    var res = await sb.from('projects').insert({
      title: title,
      description: document.getElementById('proj-desc').value || null,
      level: document.getElementById('proj-level').value || null,
      academic_year: document.getElementById('proj-year').value || null,
      program_type: document.getElementById('proj-program').value || null,
      location: document.getElementById('proj-location').value || null,
      student_id: currentUser.id,
      status: 'draft',
      cover_image_url: null
    }).select().single();
    if (res.error) { showErr('new-project-error', res.error.message); btn.disabled = false; btn.textContent = 'Creer et continuer'; return; }
    toast('Projet cree !');
    currentProjectId = res.data.id;
    showPage('edit-project');
    await loadEditProject();
  } catch(e) {
    showErr('new-project-error', 'Erreur: ' + e.message);
    btn.disabled = false;
    btn.textContent = 'Creer et continuer';
  }
}

async function openEditProject(projectId) {
  currentProjectId = projectId;
  showPage('edit-project');
  await loadEditProject();
}
  


async function loadEditProject() {
  var res=await sb.from('projects').select('*').eq('id',currentProjectId).single();
  var project=res.data;
  var titleEl=document.getElementById('edit-project-title');
  if(titleEl) titleEl.textContent=project?project.title:'-';
  if (project) {
    var archEl = document.getElementById('edit-architects');
    var areaEl = document.getElementById('edit-area');
    var yearEl = document.getElementById('edit-year');
    var levelEl = document.getElementById('edit-level');
    var programEl = document.getElementById('edit-program');
    var locationEl = document.getElementById('edit-location');
    var descEl = document.getElementById('edit-description');
    if (archEl) archEl.value = project.architects || '';
    if (areaEl) areaEl.value = project.area || '';
    if (yearEl) yearEl.value = project.academic_year || '';
    if (levelEl) levelEl.value = project.level || '';
    if (programEl) programEl.value = project.program_type || '';
    if (locationEl) locationEl.value = project.location || '';
    if (descEl) descEl.value = project.description || '';
  }
  var area=document.getElementById('submit-validation-area');
  if(project&&project.status==='draft') {
    area.innerHTML='<div class="submit-card"><p class="submit-card-title">Pret a soumettre ?</p><p class="submit-card-desc">Une fois soumis, votre projet sera examine par un enseignant avant publication.</p><button class="form-btn" style="width:100%" onclick="doSubmitValidation()">Soumettre pour validation</button></div>';
  } else if(project&&project.status==='pending') {
    area.innerHTML='<div class="pending-card"><p>En attente de validation par un enseignant.</p></div>';
  } else if(project&&project.status==='approved') {
    area.innerHTML='<div class="pending-card" style="background:#edf7ed;border-color:#a8d4a8"><p style="color:#2a6b2a">Projet approuve et publie.</p></div>';
  }
  await loadStages();
}
async function loadStages() {
  var res=await sb.from('project_stages').select('*, images:stage_images(*)').eq('project_id',currentProjectId).order('order_index');
  var stages=res.data||[];
  var list=document.getElementById('stage-list');
  if(stages.length===0) {
    list.innerHTML='<div style="border:2px dashed var(--gris-light);padding:2.5rem;text-align:center"><p style="font-size:0.82rem;color:var(--gris)">Aucune chambre. Ajoutez-en une a droite.</p></div>';
    return;
  }
  var html='';
  for(var i=0;i<stages.length;i++) {
    var s=stages[i];
    var imgs=s.images||[];
    html+='<div class="stage-item">';
    html+='<div class="stage-header" onclick="toggleStage('+JSON.stringify(s.id)+')">';
    html+='<div><div class="stage-type-label">'+(STAGE_LABELS[s.stage_type]||s.stage_type)+'</div><div class="stage-title-text">'+s.title+'</div></div>';
    html+='<div style="display:flex;align-items:center;gap:0.5rem"><span class="stage-img-count">'+imgs.length+' img</span><span id="arr-'+s.id+'" style="color:var(--gris);font-size:0.8rem">&#9660;</span></div>';
    html+='</div>';
    html+='<div class="stage-body hidden" id="body-'+s.id+'">';
    if(imgs.length>0) {
      html+='<div class="img-grid">';
      for(var j=0;j<imgs.length;j++) {
        html+='<div class="img-thumb" onclick="openLightbox('+JSON.stringify(imgs[j].url)+')"><img src="'+imgs[j].url+'" alt="" draggable="false"></div>';
      }
      html+='</div>';
    }
    html+='<label class="upload-zone"><p>'+(imgs.length>0?'+ Ajouter une image':'Deposez votre premiere image')+'</p><small>JPG, PNG, PDF</small><input type="file" class="upload-input" accept="image/*,.pdf" onchange="doUploadImageMultiple(('+JSON.stringify(s.id)+', this)"></label>';
    html+='</div></div>';
  }
  list.innerHTML=html;
}

function toggleStage(id) {
  var body=document.getElementById('body-'+id);
  var arr=document.getElementById('arr-'+id);
  if(body.classList.contains('hidden')) { body.classList.remove('hidden'); if(arr) arr.innerHTML='&#9650;'; }
  else { body.classList.add('hidden'); if(arr) arr.innerHTML='&#9660;'; }
}

async function doAddStage() {
  var type=document.getElementById('stage-type').value;
  var title=document.getElementById('stage-title').value;
  var desc=document.getElementById('stage-desc').value;
  if(!title) { toast('Le titre est obligatoire.','error'); return; }
  var cr=await sb.from('project_stages').select('order_index').eq('project_id',currentProjectId).order('order_index',{ascending:false}).limit(1);
  var next=cr.data&&cr.data.length>0?cr.data[0].order_index+1:0;
  var res=await sb.from('project_stages').insert({project_id:currentProjectId,stage_type:type,title:title,description:desc,order_index:next});
  if(res.error) { toast(res.error.message,'error'); return; }
  document.getElementById('stage-title').value='';
  document.getElementById('stage-desc').value='';
  toast('Chambre ajoutee !');
  await loadStages();
}

async function doUploadImage(stageId,input) {
  var file=input.files[0];
  if(!file) return;
  toast('Upload en cours...');
  var uploadBtn = document.getElementById('upload-progress');
if (uploadBtn) uploadBtn.style.display = 'block';
  var ext=file.name.split('.').pop();
  var path='stages/'+stageId+'/'+Date.now()+'.'+ext;
  var up=await sb.storage.from('project-images').upload(path,file);
  if(up.error) { toast(up.error.message,'error'); return; }
  var url=sb.storage.from('project-images').getPublicUrl(path).data.publicUrl;
  await sb.from('stage_images').insert({stage_id:stageId,url:url,file_type:file.type,file_size:file.size,order_index:0});
  input.value='';
  toast('Image ajoutee !');
  await loadStages();
}

async function doSubmitValidation() {
  var res = await sb.from('projects').update({status:'approved'}).eq('id', currentProjectId);
  if (res.error) { toast(res.error.message, 'error'); return; }
  toast('Projet publie !');
  await loadEditProject();
}
async function openProjectDetail(projectId) {
  if (!currentUser) { showAccessModal(); return; }
  currentProjectId=projectId;
  showPage('project-detail');
  var viewedKey = 'viewed_' + projectId;
if (!sessionStorage.getItem(viewedKey)) {
  sessionStorage.setItem(viewedKey, '1');
  await sb.rpc('increment_view_count', {project_id: projectId});
}
  var res=await sb.from('projects').select('*, student:profiles!student_id(full_name), school:schools(name), stages:project_stages(*, images:stage_images(*))').eq('id',projectId).single();
  var p=res.data;
  var coverEl = document.getElementById('detail-cover');
if (coverEl) {
  if (p.cover_image_url) {
    coverEl.src = p.cover_image_url;
    coverEl.style.display = 'block';
  } else {
    coverEl.style.display = 'none';
  }
}
  if(!p) return;
  document.getElementById('detail-title').textContent=p.title;
  document.getElementById('detail-desc').textContent=p.description||'Aucune description.';
  if(p.level) document.getElementById('detail-level').textContent=p.level;
  document.getElementById('detail-status').innerHTML=statusBadge(p.status);
  var meta='';
  if(p.student) meta+='<span><strong>Etudiant</strong> '+p.student.full_name+'</span>';
  if(p.school) meta+='<span><strong>Ecole</strong> '+p.school.name+'</span>';
  if(p.academic_year) meta+='<span><strong>Annee</strong> '+p.academic_year+'</span>';
  meta+='<span><strong>Vues</strong> '+(p.view_count||0)+'</span>';
  document.getElementById('detail-meta').innerHTML=meta;
  var stages=(p.stages||[]).sort(function(a,b){return a.order_index-b.order_index;});
  var tl=document.getElementById('detail-timeline');
  if(stages.length===0) {
    tl.innerHTML='<p style="color:var(--gris);font-size:0.85rem">Aucune etape pour ce projet.</p>';
  } else {
    var html='';
    for(var i=0;i<stages.length;i++) {
      var s=stages[i];
      var imgs=s.images||[];
      html+='<div class="timeline-stage">';
      html+='<div class="timeline-stage-header"><div><div class="timeline-stage-type">'+(STAGE_LABELS[s.stage_type]||s.stage_type)+'</div><div class="timeline-stage-title">'+s.title+'</div></div></div>';
      html+='<div class="timeline-stage-body">';
      if(imgs.length>0) {
        html+='<div class="timeline-imgs">';
        for(var j=0;j<imgs.length;j++) {
          html+='<div class="timeline-img" onclick="openLightbox('+JSON.stringify(imgs[j].url)+')"><img src="'+imgs[j].url+'" alt="" draggable="false"></div>';
        }
        html+='</div>';
      } else {
        html+='<p style="font-size:0.8rem;color:var(--gris);font-style:italic">Aucune image pour cette etape.</p>';
      }
      if(s.description) html+='<p class="timeline-stage-desc">'+s.description+'</p>';
      html+='</div></div>';
    }
    tl.innerHTML=html;
  }
  var cnt=await sb.from('likes').select('*',{count:'exact',head:true}).eq('project_id',projectId);
  document.getElementById('like-count').textContent=(cnt.count||0)+' like(s)';
}

async function doToggleLike() {
  console.log('doToggleLike called, currentProjectId:', currentProjectId, 'currentUser:', currentUser ? currentUser.id : 'NULL');
  if(!currentUser) { showPage('login'); return; }
  var ex=await sb.from('likes').select('id').eq('project_id',currentProjectId).eq('user_id',currentUser.id).single();
  if(ex.data) { await sb.from('likes').delete().eq('id',ex.data.id); }
  else { await sb.from('likes').insert({project_id:currentProjectId,user_id:currentUser.id}); }
  var cnt=await sb.from('likes').select('*',{count:'exact',head:true}).eq('project_id',currentProjectId);
  document.getElementById('like-count').textContent=(cnt.count||0)+' like(s)';
  var btn=document.getElementById('like-btn');
  btn.classList.toggle('liked');
}

async function loadValidationQueue() {
  if(!currentProfile||(currentProfile.role!=='teacher'&&currentProfile.role!=='admin')) { showPage('dashboard'); return; }
  var res=await sb.from('projects').select('*, student:profiles!student_id(full_name), school:schools(name)').eq('status','pending').order('created_at',{ascending:true});
  var projects=res.data||[];
  var list=document.getElementById('validate-list');
  if(projects.length===0) {
    list.innerHTML='<div class="empty-state"><p>Aucun projet en attente de validation.</p></div>';
    return;
  }
  var html='';
  for(var i=0;i<projects.length;i++) {
    var p=projects[i];
    var student=p.student?p.student.full_name:'-';
    var school=p.school?p.school.name:'-';
    html += '<div class="validation-card" id="vcard-' + p.id + '">';
    html+='<div class="validation-card-title">'+p.title+'</div>';
    html+='<div class="validation-card-meta">'+student+' — '+school+' — '+(p.academic_year||'-')+'</div>';
    html+='<textarea class="validation-note" id="note-'+p.id+'" rows="2" placeholder="Note optionnelle..."></textarea>';
    html+='<div class="validation-actions">';
    html+='<button class="btn-approve" onclick="doValidate('+JSON.stringify(p.id)+', true)">Approuver</button>';
    html+='<button class="btn-reject" onclick="doValidate('+JSON.stringify(p.id)+', false)">Refuser</button>';
    html += '<button class="action-link" onclick="openProjectDetailFromValidation(\'' + p.id + '\')">Voir le projet</button>';
    html+='</div></div>';
  }
  list.innerHTML=html;
}
function openProjectDetailFromValidation(projectId) {
  var lastPage = 'validate';
  openProjectDetail(projectId);
  var backBtn = document.createElement('button');
  backBtn.textContent = '← Retour aux validations';
  backBtn.style.cssText = 'background:none;border:none;color:var(--ocre);font-size:0.78rem;cursor:pointer;margin-bottom:1rem;padding:0';
  backBtn.onclick = function() { showPage('validate'); };
  setTimeout(function() {
    var hero = document.querySelector('.detail-hero-inner');
    if (hero) hero.insertBefore(backBtn, hero.firstChild);
  }, 300);
}
async function doValidate(projectId, approved) {
  if (!currentUser) return;
  var card = document.querySelector('#vcard-' + projectId);
  if (card) card.style.opacity = '0.4';
  var noteEl = document.getElementById('note-' + projectId);
  var note = noteEl ? noteEl.value : '';
  var res = await sb.from('projects').update({
    status: approved ? 'approved' : 'rejected',
    validated_by: currentUser.id,
    validated_at: new Date().toISOString(),
    validation_note: note || null
  }).eq('id', projectId);
  if (res.error) { toast(res.error.message, 'error'); if(card) card.style.opacity='1'; return; }
  toast(approved ? 'Projet approuve !' : 'Projet refuse.');
  if (card) card.remove();
}
async function loadAllUsers() {
  if (!currentProfile || currentProfile.role !== 'admin') return;
  var list = document.getElementById('admin-users-list');
  list.innerHTML = '<p style="font-size:0.8rem;color:var(--gris)">Chargement...</p>';
  var res = await sb.from('profiles').select('id, email, full_name, role, created_at').order('created_at', {ascending: false});
  var users = res.data || [];
  var html = '<table style="width:100%;font-size:0.78rem;border-collapse:collapse;margin-top:0.5rem">';
  html += '<tr style="border-bottom:1px solid var(--gris-light)"><th style="text-align:left;padding:0.4rem;color:var(--gris)">Nom</th><th style="text-align:left;padding:0.4rem;color:var(--gris)">Email</th><th style="text-align:left;padding:0.4rem;color:var(--gris)">R&#244;le</th><th style="padding:0.4rem"></th></tr>';
  for (var i = 0; i < users.length; i++) {
    var u = users[i];
    html += '<tr style="border-bottom:1px solid rgba(160,120,70,0.1);color:#2c1a0e">';
    html += '<td style="padding:0.4rem">' + (u.full_name || '-') + '</td>';
    html += '<td style="padding:0.4rem">' + u.email + '</td>';
    html += '<td style="padding:0.4rem"><span class="status-' + u.role + '" style="font-size:0.6rem">' + u.role + '</span></td>';
    html += '<td style="padding:0.4rem"><select onchange="doChangeRole(\'' + u.id + '\', this.value)" style="font-size:0.72rem;border:1px solid var(--gris-light);padding:0.2rem">';
    html += '<option value="student"' + (u.role==='student'?' selected':'') + '>student</option>';
    html += '<option value=""' + (u.role==='teacher'?' selected':'') + '>teacher</option>';
    html += '<option value="admin"' + (u.role==='admin'?' selected':'') + '>admin</option>';
    html += '</select></td></tr>';
  }
  html += '</table>';
  list.innerHTML = html;
  document.getElementById('admin-panel').classList.remove('hidden');
}

async function doChangeRole(userId, newRole) {
  var res = await sb.from('profiles').update({role: newRole}).eq('id', userId);
  if (res.error) { toast(res.error.message, 'error'); return; }
  toast('R&#244;le mis &#224; jour.');
}
async function doAvatarUpload(input) {
  var file = input.files[0];
  if (!file || !currentUser) return;
  if (file.size > 2 * 1024 * 1024) { toast('Image trop lourde. Maximum 2 MB.', 'error'); return; }
  toast('Upload en cours...');
  var ext = file.name.split('.').pop().toLowerCase();
  var ext = file.name.split('.').pop().toLowerCase();
var path = currentUser.id + '.' + ext;
  var up = await sb.storage.from('avatars').upload(path, file, { upsert: true });
  if (up.error) { toast(up.error.message, 'error'); return; }
  var url = sb.storage.from('avatars').getPublicUrl(path).data.publicUrl;
  await sb.from('profiles').update({ avatar_url: url }).eq('id', currentUser.id);
  input.value = '';
  toast('Photo mise a jour !');
  await loadProfileData();
  if (currentProfile) { loadThemeFromProfile(currentProfile); }
}

async function doAvatarRemove() {
  if (!currentUser) { return; }
  var confirmed = confirm('Supprimer votre photo de profil ?');
  if (!confirmed) { return; }
  await sb.from('profiles').update({ avatar_url: null }).eq('id', currentUser.id);
  toast('Photo supprimee.');
  await loadProfileData();
  if (currentProfile) { loadThemeFromProfile(currentProfile); }
}

function toggleBioForm() {
  var f = document.getElementById('bio-form');
  if (!f) { return; }
  if (f.style.display === 'none') {
    f.style.display = 'block';
    var bioInput = document.getElementById('bio-input');
    var specialtyInput = document.getElementById('specialty-input');
    var locationInput = document.getElementById('location-input');
    var portfolioInput = document.getElementById('portfolio-input');
    if (bioInput && currentProfile && currentProfile.bio) { bioInput.value = currentProfile.bio; }
    if (specialtyInput && currentProfile && currentProfile.specialty) { specialtyInput.value = currentProfile.specialty; }
    if (locationInput && currentProfile && currentProfile.location) { locationInput.value = currentProfile.location; }
    if (portfolioInput && currentProfile && currentProfile.portfolio_url) { portfolioInput.value = currentProfile.portfolio_url; }
  } else {
    f.style.display = 'none';
  }
}

async function doSaveBio() {
  if (!currentUser) { return; }
  var bio = document.getElementById('bio-input').value;
  var specialty = document.getElementById('specialty-input') ? document.getElementById('specialty-input').value : null;
  var location = document.getElementById('location-input') ? document.getElementById('location-input').value : null;
  var portfolio_url = document.getElementById('portfolio-input') ? document.getElementById('portfolio-input').value : null;
  var updates = { bio: bio };
  if (specialty !== null) { updates.specialty = specialty; }
  if (location !== null) { updates.location = location; }
  if (portfolio_url !== null) { updates.portfolio_url = portfolio_url; }
  var res = await sb.from('profiles').update(updates).eq('id', currentUser.id);
  if (res.error) { toast(res.error.message, 'error'); return; }
  if (currentProfile) {
    currentProfile.bio = bio;
    currentProfile.specialty = specialty;
    currentProfile.location = location;
    currentProfile.portfolio_url = portfolio_url;
  }
  toast('Profil mis a jour !');
  toggleBioForm();
}

function togglePasswordForm() {
  var f = document.getElementById('password-form');
  if (f) { f.style.display = f.style.display === 'none' ? 'block' : 'none'; }
}

async function doChangePassword() {
  if (!currentUser) { return; }
  var pwd = document.getElementById('new-password').value;
  var pwd2 = document.getElementById('confirm-password').value;
  if (!pwd || pwd.length < 6) { toast('Minimum 6 caracteres.', 'error'); return; }
  if (pwd !== pwd2) { toast('Mots de passe differents.', 'error'); return; }
  var res = await sb.auth.updateUser({ password: pwd });
  if (res.error) { toast(res.error.message, 'error'); return; }
  toast('Mot de passe mis a jour !');
  document.getElementById('new-password').value = '';
  document.getElementById('confirm-password').value = '';
  togglePasswordForm();
}

function toggleNotif(enabled) {
  localStorage.setItem('notif', enabled ? '1' : '0');
  toast(enabled ? 'Notifications activees.' : 'Notifications desactivees.');
}



async function doDeleteAccount() {
  if (!currentUser) { return; }
  if (!confirm('Supprimer definitivement votre compte et tous vos contenus ?')) { return; }
  await sb.from('chambre_posts').delete().eq('author_id', currentUser.id);
  await sb.from('profiles').delete().eq('id', currentUser.id);
  await sb.auth.signOut();
  toast('Compte supprime.');
  showPage('home');
}
  


  async function loadAtelierPosts(type) {
  var grid = document.getElementById('atelier-post-grid');
  grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:2rem;color:var(--gris)">Chargement...</div>';
  try {
    var res = await sb.from('chambre_posts')
      .select('*, author:profiles(id, full_name, avatar_url)')
      .eq('chambre_type', type)
      .order('created_at', { ascending: false });    var posts = res.data || [];
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
  ? '<span class="atelier-post-author" onclick="openStudentGallery(\''+authorId+'\')">' + authorName + '</span>'
  : '<span class="atelier-post-author">' + authorName + '</span>';
var date = new Date(post.created_at).toLocaleDateString('fr-FR', { day:'numeric', month:'long', year:'numeric' });
var isOwner = currentUser && post.author_id === currentUser.id;
var isPdf = post.file_type === 'application/pdf' || (post.file_url && post.file_url.endsWith('.pdf'));

html += '<div class="atelier-post-card" id="apost-' + post.id + '">';
html += '<div class="atelier-post-card-header">';
var avatarHtml = (post.author && post.author.avatar_url)
  ? '<img src="' + post.author.avatar_url + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" onerror="this.style.display=\'none\';this.parentNode.innerText=\'' + authorName.charAt(0).toUpperCase() + '\'">'
  : authorName.charAt(0).toUpperCase();
html += '<div class="atelier-post-avatar">' + avatarHtml + '</div>';
html += '<div>';
html += '<div class="atelier-post-author" onclick="if(currentUser && \''+authorId+'\'){navigateTo(\'galerie\');}">' + authorName + '</div>';
html += '<div class="atelier-post-date">' + date + '</div>';
html += '</div></div>';

if (isPdf) {
  html += '<div class="atelier-post-pdf">';
  html += '<span style="font-size:2rem">📄</span>';
  html += '<a href="' + post.file_url + '" target="_blank" rel="noopener" download="document.pdf" class="atelier-post-pdf-link">Telecharger / Voir le PDF</a>';
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
  } catch(e) {
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
async function doAtelierUploadMultiple(input) {
  var files = Array.from(input.files);
  if (!files.length || !currentUser || !currentAtelierType) { return; }
  if (files.length > 10) { toast('Maximum 10 images a la fois.', 'error'); return; }

  // 1. Vérification taille totale avant tout envoi
  var totalSize = files.reduce(function(sum, f) { return sum + f.size; }, 0);
  if (totalSize > 20 * 1024 * 1024) {
    toast('Taille totale trop lourde. Maximum 20 MB pour le groupe.', 'error');
    return;
  }
  var oversized = files.filter(function(f) { return f.size > 10 * 1024 * 1024; });
  if (oversized.length > 0) { toast('Un fichier depasse 10 MB.', 'error'); return; }

  toast('Upload en cours... (' + files.length + ' fichier' + (files.length > 1 ? 's' : '') + ')');

  // 2. Upload sécurisé avec try/catch — succès seulement si tout est stocké
  var urls = [];
  try {
    for (var i = 0; i < files.length; i++) {
      var file = files[i];
      var ext = file.name.split('.').pop().toLowerCase();
      var path = 'ateliers/' + currentAtelierType + '/' + currentUser.id + '-' + Date.now() + '-' + i + '.' + ext;
      var up = await sb.storage.from('project-images').upload(path, file, { upsert: true });
      if (up.error) { throw new Error('Echec fichier ' + (i+1) + ': ' + up.error.message); }
      var url = sb.storage.from('project-images').getPublicUrl(path).data.publicUrl;
      urls.push(url);
    }
  } catch(e) {
    toast('Erreur upload: ' + e.message, 'error');
    return;
  }

  if (urls.length === 0) { toast('Aucun fichier uploade.', 'error'); return; }

  // 3. Insertion avec vrai tableau JSON pour file_urls
  try {
    var res = await sb.from('chambre_posts').insert({
      chambre_type: currentAtelierType || 'sketches',
      author_id: currentUser.id,
      file_url: urls[0],
      file_urls: urls, // tableau JSON réel — lu par le carrousel via post.file_urls
      file_type: files[0].type,
      caption: null,
      like_count: 0
    });
    if (res.error) { throw new Error(res.error.message); }
  } catch(e) {
    toast('Erreur sauvegarde: ' + e.message, 'error');
    return;
  }

  input.value = '';
  // Succès affiché SEULEMENT ici — après confirmation Supabase
  toast('' + urls.length + ' image' + (urls.length > 1 ? 's' : '') + ' publiee' + (urls.length > 1 ? 's' : '') + ' !');
  await loadAtelierPosts(currentAtelierType);
}

async function doAtelierUpload(input) {
  var file = input.files[0];
  if (!file || !currentUser) { return; }
  if (!currentAtelierType) { currentAtelierType = 'sketches'; }
  if (file.size > 10 * 1024 * 1024) { toast('Fichier trop lourd. Maximum 10 MB.', 'error'); return; }
  toast('Upload en cours...');
  var ext = file.name.split('.').pop();
  var path = 'ateliers/' + currentAtelierType + '/' + currentUser.id + '-' + Date.now() + '.' + ext;
  var up = await sb.storage.from('project-images').upload(path, file);
  if (up.error) { toast(up.error.message, 'error'); return; }
  var url = sb.storage.from('project-images').getPublicUrl(path).data.publicUrl;
  var isPDF = file.type === 'application/pdf';
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
  toast('Publication ajoutee !');
  showNotif('Nouvelle publication dans l\'atelier ' + (ATELIER_LABELS[currentAtelierType] || currentAtelierType));
  await loadAtelierPosts(currentAtelierType);
}

async function doLikeAtelierPost(postId, btn) {
  if (!currentUser) { showPage('login'); return; }
  var num = btn.querySelector('.like-num');
  var current = parseInt(num.textContent) || 0;
  btn.classList.toggle('liked');
  var isLiked = btn.classList.contains('liked');
  var newVal = isLiked ? current + 1 : current - 1;
  num.textContent = newVal;
  btn.style.transform = isLiked ? 'scale(1.2)' : 'scale(1)';
  setTimeout(function() { btn.style.transform = 'scale(1)'; }, 200);
  await sb.from('chambre_posts').update({ like_count: newVal }).eq('id', postId);
  if (isLiked) { showNotif('Publication aimee dans cet atelier.'); }
}

async function doDeleteAtelierPost(postId, fileUrl) {
  if (!confirm('Supprimer cette publication ? Action irreversible.')) return;
  await sb.from('chambre_posts').delete().eq('id', postId);
  var path = fileUrl.split('/project-images/')[1];
  if (path) await sb.storage.from('project-images').remove([path]);
  toast('Publication supprimee.');
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

  // Intervenants (teacher/admin) en premier, reste en chronologique
  comments.sort(function(a, b) {
    var aIsTeacher = (a.author && (a.author.role === 'teacher' || a.author.role === 'admin')) ? 0 : 1;
    var bIsTeacher = (b.author && (b.author.role === 'teacher' || b.author.role === 'admin')) ? 0 : 1;
    return aIsTeacher - bIsTeacher;
  });

  // 3 premiers visibles, reste masqué
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

  // Bouton "Voir tous" si plus de 3 commentaires
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
  if (!currentUser) { showPage('login'); return; }
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
  var pageHistory = ['home'];

function navigateTo(name) {
  pageHistory.push(name);
  window.history.pushState({ page: name }, '', '#' + name);
  showPage(name);
}

window.addEventListener('popstate', function(e) {
  if (e.state && e.state.page) {
    showPage(e.state.page);
  } else if (pageHistory.length > 1) {
    pageHistory.pop();
    showPage(pageHistory[pageHistory.length - 1]);
  } else {
    showPage('home');
  }
});
    async function doResetPassword() {
  var pwd = document.getElementById('reset-password').value;
  var pwd2 = document.getElementById('reset-password-confirm').value;
  if (!pwd || pwd.length < 6) { showErr('reset-error', 'Minimum 6 caractères.'); return; }
  if (pwd !== pwd2) { showErr('reset-error', 'Les mots de passe ne correspondent pas.'); return; }
  var btn = document.getElementById('reset-btn');
  btn.disabled = true; btn.textContent = 'Enregistrement...';
  var res = await sb.auth.updateUser({ password: pwd });
  if (res.error) {
    showErr('reset-error', res.error.message);
    btn.disabled = false; btn.textContent = 'Enregistrer';
    return;
  }
  var s = document.getElementById('reset-success');
  s.textContent = 'Mot de passe mis à jour ! Vous pouvez vous connecter.';
  s.classList.remove('hidden');
  btn.disabled = false; btn.textContent = 'Enregistrer';
  setTimeout(function() { showPage('login'); }, 2000);
}
document.addEventListener('DOMContentLoaded', function() {

  sb.auth.onAuthStateChange(function(event, session) {
    if (event === 'PASSWORD_RECOVERY') {
      document.querySelectorAll('.page').forEach(function(p) { p.classList.add('hidden'); });
      var rp = document.getElementById('page-reset-password');
      if (rp) { rp.classList.remove('hidden'); window.scrollTo(0,0); }
      loadHomeProjects();
    }
  });

  sb.auth.getSession().then(async function(result) {
    if (result.data && result.data.session && result.data.session.user) {
      currentUser = result.data.session.user;
      currentProfile = { role:'student', full_name:currentUser.email, email:currentUser.email, id:currentUser.id };
      updateNavForUser();
      await loadProfileData();
  try { if (currentProfile) loadThemeFromProfile(currentProfile); } catch(e) {}
      updateAdminUI();
    }
  });
  loadLatestArticle(); // <- ici

});

  var ss = document.getElementById('slideshow');
  if (ss) {
    var slides = document.querySelectorAll('.slide');
    if (slides.length > 0) slides[0].classList.add('active');
    setTimeout(function() { startSlideshow(); }, 2500);
    ss.addEventListener('mouseenter', stopSlideshow);
    ss.addEventListener('mouseleave', startSlideshow);
  }
if (localStorage.getItem('darkmode') === '1') {
  document.body.classList.add('dark-mode');
  var dm = document.getElementById('set-darkmode');
  if (dm) dm.checked = true;
}
  var AUTH_BG = "https://qptnjgdfobznwmsguvyf.supabase.co/storage/v1/object/public/project-images/maison-reference-fullhd.png";
document.querySelectorAll('.auth-page').forEach(function(el) {
  el.style.backgroundImage = "url('" + AUTH_BG + "')";
  el.style.backgroundSize = "cover";
  el.style.backgroundPosition = "center";
});
  loadStats();
loadVivante();
;
    function toggleDarkMode(on){
  document.body.classList.toggle('dark', on);
  localStorage.setItem('darkMode', on ? '1' : '0');
}
function toggleNotif(on){ localStorage.setItem('notif', on?'1':'0'); toast(on?'Notifications activées':'Notifications désactivées'); }
function changeLang(l){ localStorage.setItem('lang', l); toast('Langue : '+l); }
function openSettingsModal(type){
  if (type==='bio'){
    var b = prompt('Votre bio :', currentProfile?.bio || '');
    if (b!==null) sb.from('profiles').update({bio:b}).eq('id', currentUser.id).then(()=>toast('Bio mise à jour'));
  } else if (type==='password'){
    var p = prompt('Nouveau mot de passe (min 6 caractères) :');
    if (p && p.length>=6) sb.auth.updateUser({password:p}).then(r=>toast(r.error?r.error.message:'Mot de passe modifié'));
  } else if (type==='privacy'){
    alert('Profil public : visible par tous les utilisateurs connectés.');
  }
}


// Restaurer thème au chargement
if (localStorage.getItem('darkMode')==='1'){ document.body.classList.add('dark'); }
window.addEventListener('scroll', function() {
  var doc = document.documentElement;
  var scrolled = doc.scrollTop || document.body.scrollTop;
  var total = doc.scrollHeight - doc.clientHeight;
  var pct = total > 0 ? (scrolled / total) * 100 : 0;
  var bar = document.getElementById('scroll-bar');
  if (bar) bar.style.width = pct + '%';
});
function animateCounter(el, target) {
  if (!el || isNaN(target) || target === 0) return;
  var start = 0;
  var duration = 1200;
  var step = Math.ceil(target / (duration / 16));
  var timer = setInterval(function() {
    start += step;
    if (start >= target) { start = target; clearInterval(timer); }
    el.textContent = start;
  }, 16);
}

function checkCounters() {
  var ids = ['stat-projets', 'stat-etudiants', 'stat-ateliers'];
  ids.forEach(function(id) {
    var el = document.getElementById(id);
    if (!el || el.dataset.animated) return;
    var val = parseInt(el.textContent);
    if (!isNaN(val) && val > 0) {
      el.dataset.animated = 'true';
      animateCounter(el, val);
    }
  });
}
setInterval(checkCounters, 800);

var revealObserver = new IntersectionObserver(function(entries) {
  entries.forEach(function(entry) {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.08 });

document.querySelectorAll('.reveal').forEach(function(el) {
  revealObserver.observe(el);
});
async function doUploadCover(input) {
  var file = input.files[0];
  if (!file || !currentProjectId) return;
  toast('Upload cover...');
  var ext = file.name.split('.').pop();
  var path = 'covers/' + currentProjectId + '/cover.' + ext;
  var up = await sb.storage.from('project-images').upload(path, file, { upsert: true });
  if (up.error) { toast(up.error.message, 'error'); return; }
  var url = sb.storage.from('project-images').getPublicUrl(path).data.publicUrl;
  await sb.from('projects').update({ cover_image_url: url }).eq('id', currentProjectId);
  var preview = document.getElementById('cover-preview');
  var placeholder = document.getElementById('cover-placeholder');
  if (preview) { preview.src = url; preview.style.display = 'block'; }
  if (placeholder) placeholder.style.display = 'none';
  toast('Cover mise à jour !');
}
async function doUploadCoverMultiple(input) {
  var files = Array.from(input.files);
  if (!files.length || !currentProjectId) return;
  toast('Upload cover' + (files.length > 1 ? 's' : '') + '... ⏳');
  var firstUrl = null;
  for (var i = 0; i < files.length; i++) {
    var file = files[i];
    var ext = file.name.split('.').pop();
    var path = 'covers/' + currentProjectId + '/cover-' + i + '.' + ext;
    var up = await sb.storage.from('project-images').upload(path, file, { upsert: true });
    if (up.error) { toast(up.error.message, 'error'); continue; }
    var url = sb.storage.from('project-images').getPublicUrl(path).data.publicUrl;
    if (i === 0) firstUrl = url;
  }
  if (firstUrl) {
    await sb.from('projects').update({ cover_image_url: firstUrl }).eq('id', currentProjectId);
    var preview = document.getElementById('cover-preview');
    var placeholder = document.getElementById('cover-placeholder');
    if (preview) { preview.src = firstUrl; preview.style.display = 'block'; }
    if (placeholder) placeholder.style.display = 'none';
  }
  toast('✅ ' + files.length + ' image' + (files.length > 1 ? 's' : '') + ' uploadée' + (files.length > 1 ? 's' : '') + ' !');
}
    async function doUploadImageMultiple(stageId, input) {
  var files = Array.from(input.files);
  if (!files.length) return;
  toast('Upload en cours... (' + files.length + ' fichier' + (files.length > 1 ? 's' : '') + ')');
  for (var i = 0; i < files.length; i++) {
    var file = files[i];
    if (file.size > 10 * 1024 * 1024) { toast('Fichier ' + (i+1) + ' trop lourd.', 'error'); continue; }
    var ext = file.name.split('.').pop();
    var path = 'stages/' + stageId + '/' + Date.now() + '-' + i + '.' + ext;
    var up = await sb.storage.from('project-images').upload(path, file);
    if (up.error) { toast(up.error.message, 'error'); continue; }
    var url = sb.storage.from('project-images').getPublicUrl(path).data.publicUrl;
    await sb.from('stage_images').insert({
      stage_id: stageId,
      url: url,
      file_type: file.type,
      file_size: file.size,
      order_index: i
    });
  }
  input.value = '';
  toast('✅ ' + files.length + ' fichier' + (files.length > 1 ? 's' : '') + ' uploadé' + (files.length > 1 ? 's' : '') + ' !');
  await loadStages();
}
// Désactiver clic droit
document.addEventListener('contextmenu', function(e) {
  var tag = e.target.tagName.toLowerCase();
  if (tag === 'img' || tag === 'a') {
    e.preventDefault();
  }
});

// Désactiver drag des images
document.addEventListener('dragstart', function(e) {
  if (e.target.tagName.toLowerCase() === 'img') {
    e.preventDefault();
  }
});
function getWatermarkedUrl(originalUrl, studentName) {
  return originalUrl || '';
}
  
    var BASE_ATELIER = 'https://qptnjgdfobznwmsguvyf.supabase.co/storage/v1/object/public/project-images/ateliers/ui/';
var ATELIER_IMGS = [
  '8ff60364c4bac5bebad371846afe493a.jpg',
  'b2c4b9f92e436fb0090912be9df3a009.jpg',
  '61aa0e154113383eee60920940e4e3e9.jpg',
  '23bddbd5177112427809eab5a7eab065.jpg',
  'e15fd9d0a4981e780412373579c416c5.jpg',
  '83967c9222c9b037c7092aee8a522df1.jpg',
  '89864927c82d2a0761be2a3986407199.jpg'
];

    window.addEventListener('load', function() {
  for (var i = 1; i <= 7; i++) {
    var el = document.getElementById('img-atelier-0' + i);
    if (el) el.src = BASE_ATELIER + ATELIER_IMGS[i - 1];
  }
});
    function goToAteliers(type) {
  type = type || 'sketches';
  requireAuth(function() {
    var role = currentProfile ? currentProfile.role : 'student';
    if (role === 'visitor') {
      toast('Les ateliers privés sont réservés aux membres académiques.');
      return;
    }
    navigateTo('ateliers');
    setTimeout(function() {
      selectAtelierType(type, null);
    }, 150);
  }, false);
}
    function openStudentProfile(studentId) {
  if (!studentId) return;
  showPage('explorer');
}
    async function loadTeachersHome() {
  try {
    var res = await sb.from('profiles')
      .select('id, full_name, avatar_url, bio, role, specialty, location, portfolio_url')
      .eq('role', 'teacher')
      .limit(20);
    var teachers = res.data || [];
    if (teachers.length === 0) {
  document.getElementById('teachers-grid-main').innerHTML =
    '<p style="text-align:center;color:#9a7a5a;font-family:sans-serif;padding:2rem">Aucun intervenant pour le moment.</p>';
  return;
}
    // Mélange aléatoire — 4 max
    teachers.sort(function() { return Math.random() - 0.5; });
    teachers = teachers.slice(0, 4);
    var html = '';
    for (var i = 0; i < teachers.length; i++) {
      var t = teachers[i];
      var initials = (t.full_name || 'IN').split(' ').map(function(w) { return w[0]; }).join('').substring(0, 2).toUpperCase();
      var avatarHtml = t.avatar_url
        ? '<img src="' + t.avatar_url + '" alt="' + (t.full_name || '') + '">'
        : '<div class="teacher-card-initials">' + initials + '</div>';
      var portfolioLink = t.portfolio_url
  ? '<a href="' + t.portfolio_url + '" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()" class="teacher-card-link">Voir le portfolio →</a>'
  : '';
      var profileLink = '<button onclick="showMiseEnRelation(this)" data-name="'+(t.full_name||'cet intervenant')+'" style="margin-top:0.8rem;width:100%;padding:0.7rem;background:none;border:1px solid rgba(160,120,70,0.25);border-radius:0.5rem;color:var(--terre);font-family:sans-serif;font-size:0.82rem;cursor:pointer;text-align:left">🤝 Demander une mise en relation professionnelle</button>';
      html += '<div class="teacher-card reveal">';
      html += '<div class="teacher-card-avatar">' + avatarHtml + '</div>';
      html += '<div class="teacher-card-info">';
      html += '<h3 class="teacher-card-name">' + (t.full_name || 'Intervenant') + '</h3>';
      if (t.specialty) html += '<p class="teacher-card-specialty">' + t.specialty + '</p>';
      if (t.location) html += '<p class="teacher-card-location">📍 ' + t.location + '</p>';
      if (t.bio) html += '<p class="teacher-card-bio">' + t.bio + '</p>';
      html += '<div class="teacher-card-links">' + profileLink + portfolioLink + '</div>';
      html += '</div></div>';
    }
    var grid = document.getElementById('teachers-grid-main');
    grid.innerHTML = html;
    // Réactiver reveal sur les nouvelles cartes
    grid.querySelectorAll('.reveal').forEach(function(el) {
      revealObserver.observe(el);
    });
  } catch(e) {
    console.warn('loadTeachersHome:', e);
  }
}

    function goToTeacherProfile(teacherId) {
  if (!currentUser) {
    showPage('login');
    return;
  }
  toast('Profil intervenant bientôt disponible !');
}
    

loadVivante();
window.addEventListener('load', function() {
  for (var i = 1; i <= 7; i++) {
    var el = document.getElementById('img-atelier-0' + i);
    if (el) el.src = BASE_ATELIER + ATELIER_IMGS[i - 1];
  }
});
    async function loadHomeRecentProjects() {
  try {
    var query = sb.from('projects')
  .select('id, title, cover_image_url, level, academic_year, like_count, view_count, created_at, student_id, student:profiles!student_id(id, full_name, avatar_url)')
  .eq('status', 'approved')
  .order('created_at', { ascending: false })
  .limit(5);
if (!currentUser) {
  query = query.eq('is_public', true);
}
var res = await query;
    var projects = res.data || [];
    var grid = document.getElementById('home-projects-grid');
    if (!grid) return;
    if (projects.length === 0) {
      grid.innerHTML = '<div style="text-align:center;padding:3rem;color:var(--gris);font-size:0.85rem">Aucun projet disponible.</div>';
      return;
    }
    var html = '';
    for (var i = 0; i < projects.length; i++) {
      var p = projects[i];
      var student = p.student ? p.student.full_name : '—';
      var studentId = p.student ? p.student.id : null;
      var avatarUrl = p.student ? p.student.avatar_url : null;
      var initial = student.charAt(0).toUpperCase();
      var avatarHtml = avatarUrl
        ? '<img src="' + avatarUrl + '" alt="' + student + '">'
        : initial;
      var date = new Date(p.created_at).toLocaleDateString('fr-FR', { day:'numeric', month:'long' });
      var imgHtml = p.cover_image_url
        ? '<img class="home-project-img" src="' + p.cover_image_url + '" draggable="false">'
        : '<div class="home-project-placeholder">' + p.title.charAt(0) + '</div>';
      html += '<div class="home-project-card" onclick="openProjectDetail(\''+p.id+'\')">';
      html += '<div class="home-project-card-header">';
      html += '<div class="home-project-avatar">' + avatarHtml + '</div>';
      html += '<div>';
      html += '<div class="home-project-author" onclick="event.stopPropagation();' + (studentId ? 'openStudentGallery(\''+studentId+'\')' : '') + '">' + student + '</div>';
      html += '<div class="home-project-date">' + date + '</div>';
      html += '</div>';
      if (p.level) html += '<span class="home-project-badge">' + p.level + '</span>';
      html += '</div>';
      html += '<h3 class="home-project-title">' + p.title + '</h3>';
      html += imgHtml;
      html += '<div class="home-project-footer">';
      html += '<span class="home-project-stat">👁 ' + (p.view_count || 0) + '</span>';
      html += '<span class="home-project-stat">♥ ' + (p.like_count || 0) + '</span>';
      html += '</div>';
      html += '</div>';
    }
    grid.innerHTML = html;
  } catch(e) {
    console.warn('loadHomeRecentProjects:', e);
  }
}
loadHomeRecentProjects();
async function loadGalerie() {
  var targetId = currentGalerieUserId || currentUser.id;
  var isOwnGallery = targetId === currentUser.id;

  // Titre dynamique
  var titleEl = document.querySelector('#page-galerie h1');
  var subtitleEl = document.querySelector('#page-galerie p');

  var grid = document.getElementById('galerie-grid');
  if (grid) grid.innerHTML = '<p style="color:var(--gris);font-family:sans-serif;font-size:0.85rem">Chargement...</p>';

 // Charger le profil de l'étudiant ciblé
var profileRes = await sb.from('profiles')
  .select('full_name, avatar_url, bio, specialty, location')
  .eq('id', targetId)
  .single();

var profile = profileRes.data;

// Éléments DOM
var avatarEl = document.getElementById('galerie-avatar');
var titleEl = document.getElementById('galerie-title');
var subtitleEl = document.getElementById('galerie-subtitle');

// Avatar
if (avatarEl && profile) {
  if (profile.avatar_url) {
    avatarEl.innerHTML = '<img src="' + profile.avatar_url + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">';
  } else {
    avatarEl.textContent = (profile.full_name || 'E').charAt(0).toUpperCase();
  }
}

// Titre et sous-titre
if (titleEl) {
  titleEl.textContent = isOwnGallery ? 'Ma Galerie' : (profile ? profile.full_name : 'Galerie');
}
if (subtitleEl) {
  subtitleEl.textContent = isOwnGallery
    ? 'Tous vos projets archives sur Lakou Archi.'
    : (profile && profile.specialty ? profile.specialty : 'Etudiant en architecture');
}

  // Charger les projets de cet étudiant
  var query = sb.from('projects')
    .select('*, student:profiles!student_id(id, full_name)')
    .eq('student_id', targetId)
    .order('created_at', { ascending: false });

  // Visiteurs et autres étudiants ne voient que les projets approuvés
  if (!isOwnGallery) {
    query = query.eq('status', 'approved');
  }

  var res = await query;
  var projects = res.data || [];

  if (!grid) { return; }

  if (projects.length === 0) {
    grid.innerHTML = '<div style="text-align:center;padding:3rem;color:var(--gris);font-family:sans-serif;font-size:0.85rem">' +
      (isOwnGallery ? 'Aucun projet pour le moment.' : 'Cet etudiant n\'a pas encore de projet publie.') +
      '</div>';
    return;
  }

  renderGrid('galerie-grid', projects);
}
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
function openStudentGallery(userId) {
  if (!currentUser) { showAccessModal(); return; }
  var role = currentProfile ? currentProfile.role : 'visitor';
  if (role === 'visitor') { showMiseEnRelation(null); return; }
  currentGalerieUserId = userId || currentUser.id;
  navigateTo('galerie');
  loadGalerie();
}
    
    async function deleteProject(id) {
  if (!confirm('Supprimer ce projet définitivement ?')) return;
  var res = await sb.from('projects').delete().eq('id', id);
  if (res.error) { toast(res.error.message, 'error'); return; }
  toast('Projet supprimé.');
  loadPublicProjects && loadPublicProjects();
  loadHomeRecentProjects && loadHomeRecentProjects();
}
    
    var currentYearFilter = 'all';
function filterByYear(year) {
  currentYearFilter = year;
  document.querySelectorAll('.filter-group .filter-btn').forEach(function(b) {
    b.classList.remove('active');
  });
  event.target.classList.add('active');
  var filtered = allPublicProjects;
  if (year !== 'all') {
    filtered = filtered.filter(function(p) {
      return p.academic_year && p.academic_year.toString().startsWith(year);
    });
  }
  renderGrid('public-projects-grid', filtered);
}
    
    async function loadExplorerAteliers() {
  if (!currentUser) { navigateTo('login'); return; }
  var container = document.getElementById('explorer-ateliers-container');
  if (!container) return;
  container.innerHTML = '<p style="text-align:center;color:var(--gris);padding:2rem;font-family:sans-serif">Chargement...</p>';

  var types = [
    { key: 'sketches', label: 'Carnets de croquis' },
    { key: 'conceptual', label: 'Maquettes conceptuelles' },
    { key: 'plans', label: 'Plans en cours' },
    { key: 'evolution', label: 'Évolutions du projet' },
    { key: 'validated', label: 'Plans définitifs validés' },
    { key: 'final', label: 'Maquettes finales' },
    { key: 'artistic', label: 'Travaux artistiques' }
  ];

  var html = '';
  for (var t = 0; t < types.length; t++) {
    var type = types[t];
    var res = await sb.from('chambre_posts')
      .select('id, file_url, file_type, caption, author:profiles!author_id(full_name)')
      .eq('chambre_type', type.key)
      .order('created_at', { ascending: false })
      .limit(4);
    var posts = res.data || [];
    if (posts.length === 0) continue;

    html += '<div class="explorer-atelier-block">';
    html += '<div class="explorer-atelier-header">';
    html += '<span class="explorer-atelier-title">' + type.label + '</span>';
    html += '<span class="explorer-atelier-count">' + posts.length + ' publication' + (posts.length > 1 ? 's' : '') + '</span>';
    html += '</div>';
    html += '<div class="explorer-atelier-scroll">';

    for (var i = 0; i < posts.length; i++) {
      var post = posts[i];
      var author = (post.author && post.author.full_name) ? post.author.full_name : 'Anonyme';
      var isPdf = post.file_type && post.file_type.includes('pdf');
      var imgHtml = isPdf
        ? '<div class="explorer-atelier-card-img-placeholder">📄</div>'
        : '<img class="explorer-atelier-card-img" src="' + (post.file_url || '') + '" draggable="false">';
      var caption = post.caption || author;
      html += '<div class="explorer-atelier-card" onclick="goToAteliers(\'' + type.key + '\')">';
      html += imgHtml;
      html += '<div class="explorer-atelier-card-body">';
      html += '<div class="explorer-atelier-card-author">' + author + '</div>';
      html += '<div class="explorer-atelier-card-caption">' + caption + '</div>';
      html += '</div></div>';
    }

    html += '</div>';
    html += '<button class="explorer-atelier-btn" onclick="goToAteliers(\'' + type.key + '\')">';
    html += 'Voir tout l\'atelier →';
    html += '</button>';
    html += '</div>';
  }

  if (!html) {
    container.innerHTML = '<p style="text-align:center;color:var(--gris);padding:3rem;font-family:sans-serif">Aucune publication pour le moment.</p>';
    return;
  }
  container.innerHTML = html;
}
    
    function toggleSearch() {
  var overlay = document.getElementById('search-overlay');
  if (!overlay) return;
  var isOpen = overlay.style.display !== 'none';
  overlay.style.display = isOpen ? 'none' : 'block';
  if (!isOpen) {
    setTimeout(function() {
      var input = document.getElementById('search-input');
      if (input) { input.value = ''; input.focus(); }
      document.getElementById('search-results').innerHTML = '';
    }, 100);
  }
}
var searchTimer = null;
async function doSearch(query) {
  var results = document.getElementById('search-results');
  if (!query || query.length < 2) { results.innerHTML = ''; return; }
  results.innerHTML = '<p style="color:var(--gris);font-family:sans-serif;font-size:0.85rem;padding:1rem 0">Recherche...</p>';
  clearTimeout(searchTimer);
  searchTimer = setTimeout(async function() {
    try {
      var q = '%' + query.trim() + '%';
      var html = '';

      var pRes = await sb.from('projects')
        .select('id, title, level, student:profiles!student_id(full_name)')
        .eq('status', 'approved')
        .ilike('title', q)
        .limit(5);

      if (pRes.data && pRes.data.length > 0) {
        html += '<p style="font-size:0.7rem;letter-spacing:0.15em;text-transform:uppercase;color:var(--gris);font-family:sans-serif;margin-bottom:0.75rem">Projets</p>';
        pRes.data.forEach(function(p) {
          var student = (p.student && p.student.full_name) ? p.student.full_name : '—';
          html += '<div onclick="toggleSearch();openProjectDetail(\''+p.id+'\')" style="display:flex;align-items:center;gap:0.75rem;padding:0.75rem;background:#fff;border-radius:0.5rem;margin-bottom:0.5rem;cursor:pointer;border:1px solid rgba(160,120,70,0.15)">';
          html += '<span style="font-size:1.2rem">📐</span>';
          html += '<div><div style="font-size:0.9rem;font-weight:700;color:#2c1a0e;font-family:Georgia,serif">'+p.title+'</div>';
          html += '<div style="font-size:0.72rem;color:#9a7a5a;font-family:sans-serif">'+student+'</div></div></div>';
        });
      }

      var uRes = await sb.from('profiles')
        .select('id, full_name, role, specialty')
        .ilike('full_name', q)
        .limit(5);

      if (uRes.data && uRes.data.length > 0) {
        html += '<p style="font-size:0.7rem;letter-spacing:0.15em;text-transform:uppercase;color:var(--gris);font-family:sans-serif;margin:1rem 0 0.75rem">Utilisateurs</p>';
        uRes.data.forEach(function(u) {
          var initial = (u.full_name || 'U').charAt(0).toUpperCase();
          html += '<div onclick="toggleSearch();openStudentGallery(\''+u.id+'\')" style="display:flex;align-items:center;gap:0.75rem;padding:0.75rem;background:#fff;border-radius:0.5rem;margin-bottom:0.5rem;cursor:pointer;border:1px solid rgba(160,120,70,0.15)">';
          html += '<div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#4a2c1a,#e0b978);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:0.9rem;flex-shrink:0">'+initial+'</div>';
          html += '<div><div style="font-size:0.9rem;font-weight:700;color:#2c1a0e;font-family:sans-serif">'+(u.full_name||'—')+'</div>';
          html += '<div style="font-size:0.72rem;color:#9a7a5a;font-family:sans-serif">'+(u.specialty||u.role||'')+'</div></div></div>';
        });
      }

      if (!html) {
        html = '<p style="text-align:center;color:var(--gris);font-family:sans-serif;padding:2rem">Aucun résultat pour "'+query+'"</p>';
      }
      results.innerHTML = html;
    } catch(e) {
      console.log('search error:', e);
      results.innerHTML = '<p style="color:red;font-family:sans-serif;font-size:0.82rem">Erreur: '+e.message+'</p>';
    }
  }, 400);
}
    async function doSaveProjectInfo() {
  if (!currentProjectId) { return; }

  var level = document.getElementById('edit-level') ? document.getElementById('edit-level').value : null;
  if (!level) { toast('Veuillez selectionner un niveau.', 'error'); return; }

  var updates = {
    architects: document.getElementById('edit-architects') ? document.getElementById('edit-architects').value : null,
    area: document.getElementById('edit-area') ? parseInt(document.getElementById('edit-area').value) || null : null,
    academic_year: document.getElementById('edit-year') ? document.getElementById('edit-year').value : null,
    level: level,
    program_type: document.getElementById('edit-program') ? document.getElementById('edit-program').value : null,
    location: document.getElementById('edit-location') ? document.getElementById('edit-location').value : null,
    description: document.getElementById('edit-description') ? document.getElementById('edit-description').value : null
  };

  var res = await sb.from('projects').update(updates).eq('id', currentProjectId);
  if (res.error) { toast(res.error.message, 'error'); return; }

  toast('Informations sauvegardees !');
  setTimeout(function() { showPage('dashboard'); }, 1200);
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
    
    function showAccessModal() {
  var modal = document.getElementById('access-modal');
  if (modal) modal.style.display = 'flex';
}

function closeAccessModal() {
  var modal = document.getElementById('access-modal');
  if (modal) modal.style.display = 'none';
}

function requireAuth(callback, visitorAllowed) {
  if (currentUser) {
    var role = currentProfile ? currentProfile.role : 'student';
    if (!visitorAllowed && role === 'visitor') {
      toast('Cette section est réservée aux membres académiques.');
      return;
    }
    if (callback) callback();
    return;
  }
  showAccessModal();
}
    async function doSendContact() {
  var name = document.getElementById('contact-name').value.trim();
  var email = document.getElementById('contact-email').value.trim();
  var subject = document.getElementById('contact-subject').value;
  var message = document.getElementById('contact-message').value.trim();

  if (!name || !email || !message) {
    toast('Veuillez remplir tous les champs.', 'error');
    return;
  }
  if (!email.includes('@')) {
    toast('Email invalide.', 'error');
    return;
  }

  var res = await sb.from('contact_messages').insert({
    name: name,
    email: email,
    subject: subject,
    message: message,
    created_at: new Date().toISOString()
  });

  if (res.error) {
    toast(res.error.message, 'error');
    return;
  }

  document.getElementById('contact-name').value = '';
  document.getElementById('contact-email').value = '';
  document.getElementById('contact-message').value = '';
  document.getElementById('contact-success').classList.remove('hidden');
  toast('✅ Message envoyé !');
}
 function showMiseEnRelation(btn) {
  var name = btn ? (btn.dataset.name || 'cet intervenant') : 'cet intervenant';
  var msg = 'Securite Lakou Archi\n\nPour proteger nos etudiants et enseignants, leurs coordonnees ne sont pas publiques.\n\nPour proposer un projet, un stage ou un emploi a ' + name + ', contactez l\'administration a :\n\ncontact@lakouarchi.com\n\nEn precisant le nom de l\'intervenant. Nous ferons le suivi sous 48h.';
  alert(msg);
}
    function openUserProfile(userId) {
  if (!currentUser) { showAccessModal(); return; }
  openStudentGallery(userId);
}
    async function loadLatestArticle() {
  var res = await sb
    .from('articles')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (res.error || !res.data) { return; }

  var article = res.data;

  var img = document.getElementById('article-image');
  var title = document.getElementById('article-title');
  var summary = document.getElementById('article-summary');
  var author = document.getElementById('article-author');
  var link = document.getElementById('article-link');

  if (img) { img.src = article.image_url || ''; }
  if (title) { title.textContent = article.title || ''; }
  if (summary) { summary.textContent = article.summary || ''; }
  if (author) { author.textContent = article.author || ''; }
  if (link) { link.href = article.url || '#'; }
}
    function loadThemeFromProfile(profile) {
  // Reserve pour theme futur
}
