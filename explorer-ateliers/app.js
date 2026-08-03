/* ============================================================
   explorer-ateliers/app.js — Lakou Archi
   Logique propre à la page "Tous les ateliers" (vue d'ensemble).
   Dépend des fonctions partagées de /app.js : sb, goToAteliers.
   ============================================================ */

async function loadExplorerAteliers() {
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

document.addEventListener('DOMContentLoaded', loadExplorerAteliers);
