// ─────────────────────────────────────────────────────────────
// KCP — Configuration GLOBALE (partagée par tous les clients)
// Une seule app, un seul repo. Le client est résolu au login :
// le webhook `auth` renvoie client_id, nom et liens Notion, qui
// sont stockés en session (localStorage). Aucun identifiant client
// n'est codé en dur ici.
// ─────────────────────────────────────────────────────────────

const KCP_WEBHOOKS = {
  auth:         'https://hook.eu2.make.com/8j3iyx5tob56ppw63nffemqii2nqjs8w', // Make: KCP - Auth - Login
  chat:         'https://hook.eu2.make.com/8rh94l9v2lk87hr6g1jredxban13ftqu',
  history:      'https://hook.eu2.make.com/26bhrahrq5xipqcem9hpq3jvdgrmd1si',
  tiroirs:      'https://hook.eu2.make.com/4kskheb6ie4q6nupygterd84uj5kok2g',
  prompt:       'https://hook.eu2.make.com/q86mcoelj49v49gcobam9tbixur6xvm5',
  creer_tiroir: 'https://hook.eu2.make.com/eb7lvgopight6cd56vw2hyclimy8mu7x', // Make: KCP - Nouveau Tiroir
  creer_ensemble: 'https://hook.eu2.make.com/rhqo1uy3ylfj2szvpxkrynr39y98bir1', // Make: KCP - Nouvel Ensemble
  update_perimetre: 'https://hook.eu2.make.com/mrtjwmxnmnhy9vus3vlmn6ps99oowa15', // Make: KCP - Update Perimetre
  renommer: 'https://hook.eu2.make.com/axaxpk4nlkfrxodl8h1rce5htkpgwlzp', // Make: KCP - Renommer Sujet
  creer_bot: 'https://hook.eu2.make.com/v3wdi25sob508x5gzvr11o0wwfg363vy', // Make: KCP - Meeting BaaS - Creer Bot
  reset_password: 'https://hook.eu2.make.com/baacr4sl603f8jif2htezl4tbttp857p', // Make: KCP - Reset Password
  captures: 'https://hook.eu2.make.com/r50v5k4dwhgb1i51pj1rfwvsz231t9e8', // Make: KCP - WebApp - Informations Capturées
  points_a_clarifier: 'https://hook.eu2.make.com/qkvmr8udjdy5kr6ptm620b3wb2cl47xh', // Make: KCP - WebApp - Points a clarifier
  reponse_clarification: 'https://hook.eu2.make.com/c29ze7t8b9ql9qf3mjcud8e4f8vc6tpr', // Make: KCP - WebApp - Reponse Clarification
  carte: 'https://hook.eu2.make.com/5ewsvcp5me3femarcgozfpwvh02glfmy', // Make: KCP - WebApp - Carte
  deplacer: 'https://hook.eu2.make.com/mmjhid1rmuralwj4cqgott05jgnjj3ux', // Make: KCP - Deplacer Sujet
  restructurer: 'https://hook.eu2.make.com/0mwtqehwa8c85n4don6hqt1cxkluiggp', // Make: KCP - Restructurer
  propositions: 'https://hook.eu2.make.com/w7a7cjlruolk1l6lecayiy5k8c8rqt6t', // Make: KCP - WebApp - Propositions
  reponse_proposition: 'https://hook.eu2.make.com/lp4hd6igjskrirfp29ma2fsuv58c43fo', // Make: KCP - WebApp - Reponse Proposition
  parametres: 'https://hook.eu2.make.com/vch7qngui955s1ux6kfu5h6u26h39hx3', // Make: KCP - WebApp - Parametres
  completer_perimetre: 'https://hook.eu2.make.com/dk8ww888lghieii868ttg6hc4u99jmuy', // Make: KCP - Perimetre Completer
  signaux: 'https://hook.eu2.make.com/w2h121ktmb0nrrrshh982w17chte1k4o', // Make: KCP - WebApp - Signaux
  rediger_signal: 'https://hook.eu2.make.com/m5mgc1tuzlsrdth7iz4hiisp2z96t5q2', // Make: KCP - WebApp - Reponse Signal
};

// Guide d'utilisation, Google Doc partage en lecture. L'identifiant d'un
// document Drive ne change pas quand on le modifie : le lien est donc stable,
// il suffit d'editer le document pour que tout le monde voie la mise a jour.
const KCP_GUIDE_URL = 'https://docs.google.com/document/d/1iDpCeGGRI2g-ekKcszG5GeayUDRstWP1FPtsU9ziqnA/view';

// ── URL Notion : app.notion.com exige désormais l'identifiant SANS tirets ──
// L'UUID du référentiel garde ses tirets (format canonique de l'API) ;
// seule l'URL de consultation est normalisée, au moment de l'affichage.
// Couvre aussi les sessions déjà stockées avec l'ancien format.
function kcpNotionHref(u) {
  return String(u || '').replace(/(app\.notion\.com\/p\/)([0-9a-fA-F-]+)/, function(_, p, id) { return p + id.replace(/-/g, ''); });
}

// ── Libellé d'affichage d'un document, commun à toutes les pages ──
// Annexe → anx_x ; sujet → #x ; nœud → label nu ; la racine porte le prénom.
// Entrée : un item de la liste tiroirs {nom_tiroir, type, parent?, doc_int_id?}.
function kcpDocLabel(t) {
  var nom = (t && t.nom_tiroir) || '';
  var type = String((t && t.type) || '').toUpperCase();
  if (type === 'ANX') {
    if (nom.indexOf('anx_') === 0) return nom;
    if (nom.indexOf('nx_') === 0) return 'a' + nom;
    return 'anx_' + nom;
  }
  if (type === 'GCP') {
    if ((t.parent || '') === 'N/A' || t.doc_int_id === 'GCP001') {
      return (KCP_CONFIG.client_name || '').trim() || nom || 'Head';
    }
    return nom;
  }
  return '#' + nom;
}

// ── Œil « maintenir pour afficher » des champs mot de passe ──
// Presser affiche, relâcher (ou glisser hors du bouton) masque :
// impossible de laisser un mot de passe affiché par oubli.
function kcpEye(btnId, inputId) {
  const b = document.getElementById(btnId), i = document.getElementById(inputId);
  if (!b || !i) return;
  b.addEventListener('pointerdown', function (e) { e.preventDefault(); i.type = 'text'; });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (ev) {
    b.addEventListener(ev, function () { i.type = 'password'; });
  });
  b.addEventListener('contextmenu', function (e) { e.preventDefault(); });
}

const KCP_SESSION_KEY = 'kcp_session';

function kcpGetSession() {
  try { return JSON.parse(localStorage.getItem(KCP_SESSION_KEY) || 'null'); }
  catch (e) { return null; }
}
function kcpSetSession(s) { localStorage.setItem(KCP_SESSION_KEY, JSON.stringify(s)); }
function kcpLogout() { localStorage.removeItem(KCP_SESSION_KEY); location.replace('./login.html'); }

const _kcpSession = kcpGetSession();

// Config exposée aux pages. client_id / client_name / notion viennent
// de la session ; les webhooks sont globaux.
const KCP_CONFIG = {
  client_id:   _kcpSession ? _kcpSession.client_id   : null,
  client_name: _kcpSession ? _kcpSession.client_name : null,
  notion:      (_kcpSession && _kcpSession.notion) ? _kcpSession.notion : {},
  webhooks:    KCP_WEBHOOKS,
  guide:       KCP_GUIDE_URL,
};

// ── Garde d'accès : pas de session → redirection vers le login ──
// Pages publiques : la connexion, et la définition de mot de passe
// (atteinte par un lien reçu par email, donc forcément déconnecté).
const KCP_PUBLIC_PAGES = ['login.html', 'reset-password.html'];

(function kcpGuard() {
  var page = location.pathname.split('/').pop();
  if (!_kcpSession && KCP_PUBLIC_PAGES.indexOf(page) === -1) {
    location.replace('./login.html');
  }
})();

// ─────────────────────────────────────────────────────────────
// Délai d'attente sur tout appel réseau.
// Sans lui, un webhook qui ne répond jamais fige la page sans un mot :
// le spinner tourne, aucun message n'arrive, l'utilisateur ne sait pas
// si ça travaille ou si c'est mort. Le plafond transforme ce gel en
// l'erreur que chaque page sait déjà afficher.
// 60 s est calibré sur les durées réelles relevées côté Make : le plus
// lent des dix-neuf scénarios du site (le chat) plafonne à 20 s.
// ─────────────────────────────────────────────────────────────
const KCP_TIMEOUT_MS = 60000;

function kcpFetch(url, options) {
  const ctl = new AbortController();
  const t = setTimeout(function () { ctl.abort(); }, KCP_TIMEOUT_MS);
  return fetch(url, Object.assign({}, options, { signal: ctl.signal }))
    .finally(function () { clearTimeout(t); });
}

// ─────────────────────────────────────────────────────────────
// Cache local de la liste des tiroirs (stale-while-revalidate).
// La liste change rarement (création / modif de périmètre) : on la
// sert instantanément depuis localStorage et on rafraîchit en fond.
// Invalidation explicite après création ou modification.
// ─────────────────────────────────────────────────────────────
const KCP_TIROIRS_TTL = 10 * 60 * 1000; // 10 min

function _kcpTiroirsKey() { return 'kcp_tiroirs_' + (KCP_CONFIG.client_id || 'anon'); }

function _kcpReadTiroirsCache() {
  try { return JSON.parse(localStorage.getItem(_kcpTiroirsKey()) || 'null'); }
  catch (e) { return null; }
}

function kcpInvalidateTiroirs() {
  try { localStorage.removeItem(_kcpTiroirsKey()); } catch (e) {}
}

async function _kcpFetchTiroirs() {
  const r = await kcpFetch(KCP_WEBHOOKS.tiroirs, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: KCP_CONFIG.client_id })
  });
  const data = await r.json();
  try { localStorage.setItem(_kcpTiroirsKey(), JSON.stringify({ ts: Date.now(), data })); } catch (e) {}
  return data;
}

// Renvoie une Promise résolue avec la liste. Cache présent → résolution
// immédiate + rafraîchissement en fond si périmé. Sinon appel réseau.
function kcpLoadTiroirs() {
  const cached = _kcpReadTiroirsCache();
  if (cached && cached.data) {
    if (Date.now() - (cached.ts || 0) >= KCP_TIROIRS_TTL) { _kcpFetchTiroirs().catch(function(){}); }
    return Promise.resolve(cached.data);
  }
  return _kcpFetchTiroirs();
}

// ── Cache de l'historique du chat (même logique stale-while-revalidate) ──
// L'historique change à chaque message : on affiche le cache tout de suite
// puis on revalide en réseau (l'appel se fait en parallèle du reste).
function _kcpHistKey() { return 'kcp_history_' + (KCP_CONFIG.client_id || 'anon'); }
function kcpReadHistoryCache() {
  try { const c = JSON.parse(localStorage.getItem(_kcpHistKey()) || 'null'); return c && c.data ? c.data : null; }
  catch (e) { return null; }
}
function kcpCacheHistory(data) {
  try { localStorage.setItem(_kcpHistKey(), JSON.stringify({ ts: Date.now(), data: data })); } catch (e) {}
}

// ── Cache des informations capturées (même logique que l'historique) ──
// La liste s'allonge à chaque capture : on affiche le cache tout de suite
// puis on revalide en réseau.
function _kcpCapturesKey() { return 'kcp_captures_' + (KCP_CONFIG.client_id || 'anon'); }
function kcpReadCapturesCache() {
  try { const c = JSON.parse(localStorage.getItem(_kcpCapturesKey()) || 'null'); return c && c.data ? c.data : null; }
  catch (e) { return null; }
}
function kcpCacheCaptures(data) {
  try { localStorage.setItem(_kcpCapturesKey(), JSON.stringify({ ts: Date.now(), data: data })); } catch (e) {}
}

// ── Cache de la carte des sujets (même logique que les captures) ──
function _kcpCarteKey() { return 'kcp_carte_' + (KCP_CONFIG.client_id || 'anon'); }
function kcpReadCarteCache() {
  try { const c = JSON.parse(localStorage.getItem(_kcpCarteKey()) || 'null'); return c && c.data ? c.data : null; }
  catch (e) { return null; }
}
function kcpCacheCarte(data) {
  try { localStorage.setItem(_kcpCarteKey(), JSON.stringify({ ts: Date.now(), data: data })); } catch (e) {}
}

// ── Cache des points à clarifier (même logique que les captures) ──
// La liste est renouvelée chaque nuit par le système : on affiche le
// cache tout de suite, et on revalide TOUJOURS en réseau. Répondre à
// un point le retire localement (la pastille de l'accueil suit).
function _kcpPointsKey() { return 'kcp_points_' + (KCP_CONFIG.client_id || 'anon'); }
function kcpReadPointsCache() {
  try { const c = JSON.parse(localStorage.getItem(_kcpPointsKey()) || 'null'); return c && c.data ? c.data : null; }
  catch (e) { return null; }
}
function kcpCachePoints(data) {
  try { localStorage.setItem(_kcpPointsKey(), JSON.stringify({ ts: Date.now(), data: data })); } catch (e) {}
}

// ── Cache des propositions de réorganisation (même logique que les points) ──
function _kcpPropsKey() { return 'kcp_props_' + (KCP_CONFIG.client_id || 'anon'); }
function kcpReadPropsCache() {
  try { const c = JSON.parse(localStorage.getItem(_kcpPropsKey()) || 'null'); return c && c.data ? c.data : null; }
  catch (e) { return null; }
}
function kcpCacheProps(data) {
  try { localStorage.setItem(_kcpPropsKey(), JSON.stringify({ ts: Date.now(), data: data })); } catch (e) {}
}

// ── Badges de la barre latérale : « À clarifier » et « Réorganiser » ──
// Chaque page les affiche depuis le cache ; seules les pages concernées
// (accueil, à clarifier, réorganiser) revalident en réseau et rappellent
// cette fonction. Aucun compte en cache → pas de badge, jamais un zéro.
function kcpNavBadges() {
  function pose(id, data, cle) {
    var el = document.getElementById(id);
    if (!el) return;
    var n = (data && data[cle] || []).length;
    if (n > 0) { el.textContent = n; el.hidden = false; } else { el.hidden = true; }
  }
  pose('nav-n-points', kcpReadPointsCache(), 'points');
  pose('nav-n-props', kcpReadPropsCache(), 'propositions');
}

// ─────────────────────────────────────────────────────────────
// Un bouton qui attend le dit, et refuse d'être recliqué.
// Le libellé n'est jamais touché : rien à restaurer, rien qui saute.
// Règle : on ne l'appelle QUE sur un bouton qui déclenche un appel
// réseau. Un geste qui se joue dans la page reste sec.
// ─────────────────────────────────────────────────────────────
function kcpOccupe(btn, oui) {
  if (!btn) return;
  btn.setAttribute('aria-busy', oui ? 'true' : 'false');
  btn.disabled = !!oui;
}

// ─────────────────────────────────────────────────────────────
// Les comptes de questions, dérivés de ce que les pages ont déjà
// en cache : aucun appel réseau supplémentaire.
//   propres      — les questions du document lui-même
//   descendance  — leur total pour tout ce qui vit sous un nœud
// ─────────────────────────────────────────────────────────────
function kcpComptesQuestions(points, sujets) {
  var propres = {}, descendance = {}, parent = {};
  (points || []).forEach(function (p) {
    if (p && p.doc_id) propres[p.doc_id] = (propres[p.doc_id] || 0) + 1;
  });
  (sujets || []).forEach(function (s) { parent[s.doc_int_id] = s.parent; });
  Object.keys(propres).forEach(function (id) {
    var p = parent[id], garde = 0;
    // La garde borne une éventuelle boucle dans le référentiel : un cycle
    // parent-enfant ferait tourner cette remontée indéfiniment.
    while (p && p !== 'N/A' && garde++ < 32) {
      descendance[p] = (descendance[p] || 0) + propres[id];
      p = parent[p];
    }
  });
  return { propres: propres, descendance: descendance };
}

// ─────────────────────────────────────────────────────────────
// La fiche en fenêtre, ouverte depuis la carte. Partagée par l'accueil
// et la page d'un ensemble : le balisage est fabriqué une fois, à la
// première ouverture, puis réutilisé.
// ─────────────────────────────────────────────────────────────
var KCP_FICHE = (function () {
  var voile, fen, ouvreurPrecedent = null;

  function lignes(s) {
    return String(s || '').split('\n').map(function (x) { return x.trim(); }).filter(Boolean);
  }
  function parseDate(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2})/.exec(String(s || ''));
    return m ? new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]) : null;
  }
  function fmt(d) {
    return d ? ('0' + d.getDate()).slice(-2) + '/' + ('0' + (d.getMonth() + 1)).slice(-2) +
      ' ' + ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2) : '—';
  }
  function titre(txt) { var d = document.createElement('div'); d.className = 'sect-title'; d.textContent = txt; return d; }
  function rien(txt) { var p = document.createElement('p'); p.className = 'rien'; p.textContent = txt; return p; }
  function liste(items) {
    var ul = document.createElement('ul'); ul.className = 'fiche-ul';
    items.forEach(function (x) { var li = document.createElement('li'); li.textContent = x; ul.appendChild(li); });
    return ul;
  }
  function echeances(items) {
    var g = document.createElement('div'); g.className = 'ech';
    items.forEach(function (l) {
      var i = l.indexOf(';');
      var dd = document.createElement('span'); dd.className = 'd';
      var pd = parseDate((i > 0 ? l.slice(0, i).trim() : '') + ' 0:00');
      dd.textContent = pd ? ('0' + pd.getDate()).slice(-2) + '/' + ('0' + (pd.getMonth() + 1)).slice(-2) : (i > 0 ? l.slice(0, i) : '');
      var oo = document.createElement('span'); oo.className = 'o';
      oo.textContent = i > 0 ? l.slice(i + 1).trim() : l;
      g.appendChild(dd); g.appendChild(oo);
    });
    return g;
  }

  function batir() {
    if (fen) return;
    voile = document.createElement('div'); voile.className = 'f-voile';
    fen = document.createElement('div');
    fen.className = 'fiche-w'; fen.id = 'kcp-fiche';
    fen.setAttribute('role', 'dialog'); fen.setAttribute('aria-modal', 'true');
    fen.setAttribute('aria-labelledby', 'kcp-f-titre');
    fen.innerHTML =
      '<div class="f-tete">' +
        '<span class="eyebrow" id="kcp-f-nature"></span>' +
        '<div class="f-ligne" style="margin-top:.35rem">' +
          '<div id="kcp-f-titre"></div>' +
          '<button class="f-notif" id="kcp-f-notif" hidden>' +
            '<span class="ico" aria-hidden="true">⊙</span><span class="n" id="kcp-f-notif-n"></span>' +
          '</button>' +
        '</div>' +
      '</div>' +
      '<div class="f-corps" id="kcp-f-corps"></div>' +
      '<div class="f-pied">' +
        '<span class="meta" id="kcp-f-maj"></span>' +
        '<div style="display:flex;gap:var(--s2)">' +
          '<button class="btn" id="kcp-f-fermer">Fermer</button>' +
          '<a class="btn btn-1" id="kcp-f-ouvrir" href="#">Ouvrir la page →</a>' +
        '</div>' +
      '</div>';
    document.body.appendChild(voile);
    document.body.appendChild(fen);

    voile.addEventListener('click', fermer);
    document.getElementById('kcp-f-fermer').addEventListener('click', fermer);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && fen.classList.contains('on')) fermer();
    });
    document.getElementById('kcp-f-notif').addEventListener('click', function () {
      var b = document.getElementById('kcp-bloc-q');
      if (!b) return;
      b.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      b.classList.remove('vise');
      void b.offsetWidth;
      b.classList.add('vise');
    });
  }

  function blocQuestions(id, points) {
    var qs = (points || []).filter(function (p) { return p.doc_id === id; });
    if (!qs.length) return null;
    var b = document.createElement('div'); b.className = 'f-questions'; b.id = 'kcp-bloc-q';
    var t = document.createElement('div'); t.className = 'f-q-tete';
    var n = document.createElement('span'); n.className = 'f-q-n'; n.textContent = qs.length;
    var lab = document.createElement('span'); lab.className = 'f-q-t';
    lab.textContent = qs.length > 1 ? 'questions ouvertes' : 'question ouverte';
    var sub = document.createElement('span'); sub.className = 'sub';
    sub.textContent = 'Y répondre met ce document à jour au cycle suivant.';
    t.appendChild(n); t.appendChild(lab); t.appendChild(sub);
    b.appendChild(t);
    var ul = document.createElement('ul'); ul.className = 'f-q-liste';
    qs.slice(0, 2).forEach(function (p) {
      var li = document.createElement('li');
      li.textContent = (p.question || p.doute || '').trim();
      ul.appendChild(li);
    });
    if (qs.length > 2) {
      var li = document.createElement('li'); li.className = 'sub';
      li.textContent = 'et ' + (qs.length - 2) + ' autre' + (qs.length - 2 > 1 ? 's' : '') + '…';
      ul.appendChild(li);
    }
    b.appendChild(ul);
    var a = document.createElement('div'); a.className = 'f-q-a';
    var lien = document.createElement('a'); lien.className = 'btn btn-1 btn-s';
    lien.href = './a-clarifier.html';
    lien.textContent = 'Répondre ' + (qs.length > 1 ? 'aux ' + qs.length + ' questions' : 'à la question') + ' →';
    a.appendChild(lien);
    b.appendChild(a);
    return b;
  }

  // doc     : la ligne du document dans la réponse `carte`
  // points  : les questions ouvertes du client
  // racine  : le libellé à afficher pour GCP001 (le prénom)
  function ouvrir(doc, points, racine, ouvreur) {
    if (!doc) return;
    batir();
    ouvreurPrecedent = ouvreur || null;
    var id = doc.doc_int_id;
    var ens = String(id).indexOf('GCP') === 0;
    var nom = (id === 'GCP001' && racine) ? racine : doc.doc_label;

    document.getElementById('kcp-f-nature').textContent = ens ? 'Ensemble' : 'Sujet';
    var t = document.getElementById('kcp-f-titre');
    t.textContent = '';
    if (ens) {
      var h = document.createElement('h2'); h.textContent = nom; t.appendChild(h);
    } else {
      var bs = document.createElement('span'); bs.className = 'badge-sujet';
      var d = document.createElement('span'); d.className = 'h'; d.textContent = '#';
      bs.appendChild(d); bs.appendChild(document.createTextNode(String(nom).replace(/^#/, '')));
      t.appendChild(bs);
    }

    // La pastille n'apparaît que s'il y a des questions. Jamais un zéro.
    var qs = (points || []).filter(function (p) { return p.doc_id === id; });
    var notif = document.getElementById('kcp-f-notif');
    if (qs.length) {
      document.getElementById('kcp-f-notif-n').textContent = qs.length;
      var lbl = qs.length + (qs.length > 1 ? ' questions ouvertes' : ' question ouverte') +
        ', aller au bloc de réponse';
      notif.setAttribute('aria-label', lbl); notif.title = lbl;
      notif.hidden = false;
    } else { notif.hidden = true; }

    document.getElementById('kcp-f-maj').textContent =
      'Dernière mise à jour · ' + fmt(parseDate(doc.last_update_date));
    document.getElementById('kcp-f-ouvrir').href =
      (ens ? './ensemble.html' : './sujet.html') + '?doc=' + encodeURIComponent(id);

    var c = document.getElementById('kcp-f-corps');
    c.textContent = '';
    var t0 = titre(ens ? 'Où en est cet ensemble' : 'Où en est ce sujet');
    t0.style.marginTop = 'var(--s2)';
    c.appendChild(t0);
    var resume = lignes(doc.fiche_resume);
    if (resume.length) resume.forEach(function (l) {
      var p = document.createElement('p'); p.textContent = l; p.style.marginBottom = '.5rem'; c.appendChild(p);
    }); else c.appendChild(rien('Pas encore de synthèse : elle s’écrira au prochain cycle.'));

    var ech = lignes(doc.fiche_echeances);
    c.appendChild(titre('Échéances'));
    c.appendChild(ech.length ? echeances(ech) : rien('Aucune échéance.'));

    var pri = lignes(doc.fiche_priorites);
    c.appendChild(titre('Priorités'));
    c.appendChild(pri.length ? liste(pri) : rien('Aucune priorité.'));

    var ris = lignes(doc.fiche_risques);
    c.appendChild(titre('Risques'));
    c.appendChild(ris.length ? liste(ris) : rien('Aucun risque identifié.'));

    var q = blocQuestions(id, points);
    if (q) c.appendChild(q);

    voile.classList.add('on'); fen.classList.add('on');
    c.scrollTop = 0;
    document.getElementById('kcp-f-fermer').focus();
  }

  function fermer() {
    if (!fen) return;
    voile.classList.remove('on'); fen.classList.remove('on');
    if (ouvreurPrecedent && ouvreurPrecedent.focus) ouvreurPrecedent.focus();
  }

  return { ouvrir: ouvrir, fermer: fermer };
})();

// ─────────────────────────────────────────────────────────────
// Le périmètre en trois questions.
// Trois champs à la saisie, UN SEUL TEXTE au stockage : rien ne change
// au référentiel, aucun scénario n'est touché, le CODEX est inchangé.
// Les deux marqueurs servent d'ancres pour redécouper à la relecture.
// ─────────────────────────────────────────────────────────────
var KCP_PERIMETRE = (function () {
  // Cinq intitules, chacun seul sur sa ligne, un bloc separe par une ligne
  // vide. Trois d'entre eux portent une phrase et jamais une liste : une liste
  // ne tranche pas un cas qu'elle n'a pas prevu, et c'est tout leur objet.
  var A = {
    regle:  'Entre ici :',
    entre:  'Y entrent notamment :',
    refuse: "N'entrent pas :",
    doute:  'En cas de doute :',
    detail: 'Niveau de détail :',
    sous:   'Sujets sous cet ensemble :'
  };

  function majuscule(x) {
    var t = String(x || '').trim();
    return t ? t.charAt(0).toUpperCase() + t.slice(1) : '';
  }

  // L'intitule ouvre la phrase, qui la continue en minuscule : « Entre ici :
  // toute information … ». Seule la premiere ligne du perimetre porte une
  // capitale. Une phrase se termine par un point ; une puce, jamais.
  function phrase(x) {
    var t = String(x || '').trim();
    return t && !/[.!?]$/.test(t) ? t + '.' : t;
  }
  function puces(l) {
    return l.map(function (x) {
      return '- ' + String(x || '').trim().replace(/\.$/, '');
    }).join('\n');
  }
  function enListe(v) {
    return String(v || '').split('\n')
      .map(function (x) { return x.replace(/^\s*[-–•]\s*/, '').trim(); })
      .filter(Boolean);
  }

  function bloc(intitule, contenu) { return intitule + '\n' + contenu; }

  function assembler(v) {
    v = v || {};
    var t = [];
    if (v.objet) t.push(majuscule(v.objet));
    if (v.regle) t.push(bloc(A.regle, phrase(v.regle)));
    // Des exemples, jamais une regle : `Entre ici` tranche, ceux-ci illustrent.
    if (v.entre && v.entre.length) t.push(bloc(A.entre, puces(v.entre)));
    if (v.refuse && v.refuse.length) t.push(bloc(A.refuse, puces(v.refuse)));
    if (v.doute) t.push(bloc(A.doute, phrase(v.doute)));
    if (v.detail) t.push(bloc(A.detail, phrase(v.detail)));
    if (v.sousSujets && v.sousSujets.length) t.push(bloc(A.sous, puces(v.sousSujets)));
    return t.join('\n\n');
  }

  // Un perimetre ancien ne porte aucun de ces intitules : il se charge
  // entierement dans le champ 1. C'est le comportement correct, pas un repli.
  function redecouper(txt) {
    var s = String(txt || '').replace(/\r\n?/g, '\n');
    var vide = { objet: '', regle: '', entre: [], refuse: [], doute: '', detail: '', sousSujets: [] };
    // Les intitules sont cherches en debut de ligne : le meme mot au fil d'une
    // phrase ne doit pas ouvrir un bloc.
    var trouves = [];
    Object.keys(A).forEach(function (cle) {
      var m = new RegExp('^' + A[cle].replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[ \t]*$', 'm').exec(s);
      if (m) trouves.push({ cle: cle, i: m.index, l: m[0].length });
    });
    if (!trouves.length) { vide.objet = s.trim(); return vide; }
    trouves.sort(function (x, y) { return x.i - y.i; });
    vide.objet = s.slice(0, trouves[0].i).trim();
    trouves.forEach(function (o, k) {
      var fin = k + 1 < trouves.length ? trouves[k + 1].i : s.length;
      var v = s.slice(o.i + o.l, fin).trim();
      if (o.cle === 'entre') vide.entre = enListe(v);
      else if (o.cle === 'refuse') vide.refuse = enListe(v);
      else if (o.cle === 'sous') vide.sousSujets = enListe(v);
      else vide[o.cle] = v;
    });
    return vide;
  }

  // ── Une liste : un champ par entrée. La première ne se retire jamais ──
  return { assembler: assembler, redecouper: redecouper };
})();

// ─────────────────────────────────────────────────────────────
// Une liste de sujets qui montre la hiérarchie.
// Le nœud en titre de groupe, ses sujets dessous par ordre alphabétique.
// `optgroup` est le motif standard d'une liste hiérarchique : lu
// correctement par les lecteurs d'écran, aucun code de mise en page.
//
//   sel     — le <select> à remplir (il est vidé)
//   data    — la réponse du webhook `tiroirs`
//   opts.valeur    — ce que porte chaque option : 'id' (défaut) ou 'nom'
//   opts.vide      — le libellé d'une première option vide, s'il en faut une
//   opts.exclure   — un doc_int_id à ne pas proposer
//   opts.filtre    — un test supplémentaire sur chaque sujet
//   opts.tete      — des options libres avant les groupes, [{valeur, texte}]
// ─────────────────────────────────────────────────────────────
function kcpRemplirHierarchie(sel, data, opts) {
  opts = opts || {};
  sel.textContent = '';

  if (opts.vide) {
    var o0 = document.createElement('option');
    o0.value = ''; o0.textContent = opts.vide;
    sel.appendChild(o0);
  }
  (opts.tete || []).forEach(function (x) {
    var o = document.createElement('option');
    o.value = x.valeur; o.textContent = x.texte;
    sel.appendChild(o);
  });

  var pret = function (t) { return String(t.attente_cycle || '').toLowerCase() !== 'oui'; };
  var sujets = (data.pcp || []).filter(pret).filter(function (t) {
    if (opts.exclure && t.doc_int_id === opts.exclure) return false;
    return opts.filtre ? opts.filtre(t) : true;
  });
  var noeuds = (data.gcp || []).filter(pret);

  // Les nœuds dans l'ordre de la carte : la racine d'abord, puis les autres
  // par ordre alphabétique — le même ordre que l'arbre de l'accueil.
  var racine = noeuds.filter(function (n) { return (n.parent || '') === 'N/A'; });
  var autres = noeuds.filter(function (n) { return (n.parent || '') !== 'N/A'; })
    .sort(function (a, b) {
      return kcpDocLabel(a).localeCompare(kcpDocLabel(b), 'fr', { sensitivity: 'base' });
    });

  // Ce qui a ete range sous un noeud. On coche au passage : un sujet non
  // reclame par aucun noeud ne doit pas disparaitre pour autant.
  var reclames = {};

  function ajouter(n) {
    var dessous = sujets.filter(function (t) { return t.parent === n.doc_int_id; })
      .sort(function (a, b) {
        return kcpDocLabel(a).localeCompare(kcpDocLabel(b), 'fr', { sensitivity: 'base' });
      });
    // Un nœud proposable apparaît comme première entrée de son propre groupe.
    var noeudProposable = opts.avecNoeuds && (!opts.exclure || n.doc_int_id !== opts.exclure);
    if (!dessous.length && !noeudProposable) return;
    var g = document.createElement('optgroup');
    g.label = kcpDocLabel(n) + ((n.parent || '') === 'N/A' ? ' — la racine' : '');
    if (noeudProposable) {
      var on = document.createElement('option');
      on.value = opts.valeur === 'nom' ? n.nom_tiroir : n.doc_int_id;
      on.textContent = kcpDocLabel(n);
      g.appendChild(on);
    }
    dessous.forEach(function (t) {
      reclames[t.doc_int_id] = 1;
      var o = document.createElement('option');
      o.value = opts.valeur === 'nom' ? t.nom_tiroir : t.doc_int_id;
      o.textContent = kcpDocLabel(t);
      g.appendChild(o);
    });
    sel.appendChild(g);
  }
  racine.concat(autres).forEach(ajouter);

  // Ce que personne n'a reclame. Aujourd'hui c'est la totalite des sujets :
  // `ListeTiroirs` ne sert `parent` que sur les noeuds. Les omettre revenait
  // a vider six listes du site sans un mot. Le groupe le dit au lieu de le
  // taire ; il disparaitra de lui-meme quand le champ sera servi.
  var orphelins = sujets.filter(function (t) { return !reclames[t.doc_int_id]; })
    .sort(function (a, b) {
      return kcpDocLabel(a).localeCompare(kcpDocLabel(b), 'fr', { sensitivity: 'base' });
    });
  if (orphelins.length) {
    var go = document.createElement('optgroup');
    go.label = 'Sans rattachement connu';
    orphelins.forEach(function (t) {
      var o = document.createElement('option');
      o.value = opts.valeur === 'nom' ? t.nom_tiroir : t.doc_int_id;
      o.textContent = kcpDocLabel(t);
      go.appendChild(o);
    });
    sel.appendChild(go);
  }
}

// ─────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────
// Dit qu'un geste est parti, et rien de plus. Le mot s'affiche dans le coin
// haut droit, sur la ligne du titre, puis s'efface.
//
// À n'utiliser QUE pour un simple accusé de réception. Quand le message
// apprend quelque chose — « les cartes des deux ensembles seront à jour au
// prochain cycle » —, il reste dans la page, à l'endroit où l'on vient
// d'agir : c'est là qu'on le lit.
// ─────────────────────────────────────────────────────────────
function KCP_ENVOYE(mot) {
  var e = document.getElementById('kcp-envoye');
  if (!e) return;
  e.textContent = '';
  var c = document.createElement('span'); c.className = 'c'; c.textContent = '✓';
  e.appendChild(c);
  e.appendChild(document.createTextNode(mot || 'Envoyé'));
  e.hidden = false;
  // Le passage par un cadre d'animation laisse la transition s'accrocher :
  // poser la classe dans la même tâche que `hidden = false` ne montre rien.
  requestAnimationFrame(function () { e.classList.add('on'); });
  clearTimeout(e._t);
  e._t = setTimeout(function () {
    e.classList.remove('on');
    setTimeout(function () { e.hidden = true; }, 220);
  }, 2600);
}

// ─────────────────────────────────────────────────────────────
// Éteint un geste sans le rendre muet. `disabled` empêche le clic, donc
// empêche aussi d'expliquer : le bouton passe en `aria-disabled`, garde son
// clic, et va montrer ce qui manque. Standard du site.
//   btn      le geste principal
//   pret     () => bool
//   manque   () => [éléments à allumer]
// ─────────────────────────────────────────────────────────────
function KCP_GESTE(btn, pret, manque) {
  if (!btn) return function () {};
  btn.disabled = false;
  btn.addEventListener('click', function (e) {
    if (pret()) return;
    e.preventDefault(); e.stopImmediatePropagation();
    KCP_SIGNALER(manque ? manque() : []);
  }, true);
  return function () {
    var p = pret();
    btn.classList.toggle('eteint', !p);
    btn.setAttribute('aria-disabled', p ? 'false' : 'true');
  };
}

// ─────────────────────────────────────────────────────────────
// Signale ce qui reste à remplir. Le standard du site : un geste qui refuse
// de partir n'est jamais muet, il montre où ça coince — et il y emmène.
// ─────────────────────────────────────────────────────────────
function KCP_SIGNALER(elements) {
  var l = (elements || []).filter(Boolean);
  if (!l.length) return;
  l.forEach(function (e) {
    e.classList.remove('a-completer');
    // Relancer l'animation demande de la redéclencher : sans cette lecture,
    // le navigateur regroupe le retrait et l'ajout et rien ne clignote.
    void e.offsetWidth;
    e.classList.add('a-completer');
    setTimeout(function () { e.classList.remove('a-completer'); }, 2000);
  });
  var p = l[0];
  if (p.scrollIntoView) p.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  var f = p.matches('input, select, textarea') ? p : p.querySelector('input, select, textarea, button');
  if (f && f.focus) f.focus();
}

// ─────────────────────────────────────────────────────────────
// Une confirmation. Rend une promesse : true si l'utilisateur valide.
// Un geste irréversible se confirme ; un geste qui se défait, jamais —
// sinon la confirmation devient un réflexe et ne protège plus rien.
//   opts.titre    la question, à la deuxième personne
//   opts.lignes   ce que le geste fait vraiment, une idée par ligne
//   opts.corps    un élément à insérer sous les lignes (un formulaire)
//   opts.pret     () => bool, dit si le bouton d'action est actionnable
//   opts.manque   () => [éléments], ce qui reste à remplir. Cliquer le geste
//                 quand il n'est pas prêt les allume au lieu de ne rien faire
//   opts.valider  le libellé du bouton qui agit (défaut : Valider)
//   opts.large    élargit la fenêtre, pour un formulaire à deux colonnes
//   opts.danger   colore ce bouton en rouge
// ─────────────────────────────────────────────────────────────
function KCP_CONFIRMER(opts) {
  opts = opts || {};
  return new Promise(function (resoudre) {
    var voile = document.createElement('div'); voile.className = 'pop-voile on';
    var pop = document.createElement('div'); pop.className = 'pop on';
    pop.setAttribute('role', 'dialog');
    pop.setAttribute('aria-modal', 'true');

    var t = document.createElement('h2'); t.className = 'pop-t';
    t.id = 'kcp-conf-t'; t.textContent = opts.titre || 'Confirmer ?';
    pop.setAttribute('aria-labelledby', t.id);
    pop.appendChild(t);

    var c = document.createElement('div'); c.className = 'pop-c';
    (opts.lignes || []).forEach(function (x) {
      var l = document.createElement('p'); l.textContent = x; c.appendChild(l);
    });
    pop.appendChild(c);
    if (opts.large) pop.classList.add('large');
    if (opts.corps) pop.appendChild(opts.corps);

    var a = document.createElement('div'); a.className = 'pop-a';
    var annuler = document.createElement('button');
    annuler.type = 'button'; annuler.className = 'btn'; annuler.textContent = 'Annuler';
    var ok = document.createElement('button');
    ok.type = 'button';
    ok.className = 'btn ' + (opts.danger ? 'btn-danger-plein' : 'btn-1');
    ok.textContent = opts.valider || 'Valider';
    a.appendChild(annuler); a.appendChild(ok);
    pop.appendChild(a);

    // Le focus part dans la fenêtre et revient d'où il venait : sans cela,
    // une fenêtre modale est un cul-de-sac au clavier.
    var avant = document.activeElement;
    function fermer(reponse) {
      document.removeEventListener('keydown', clavier, true);
      voile.remove(); pop.remove();
      if (avant && avant.focus) avant.focus();
      resoudre(reponse);
    }
    function clavier(e) {
      // Une fenetre peut en ouvrir une autre (le perimetre, par exemple).
      // Celle qui ne porte pas le focus se tait : sans cela, la seconde est
      // inutilisable au clavier et Echap ferme la mauvaise.
      if (!pop.contains(document.activeElement)) return;
      if (e.key === 'Escape') { e.preventDefault(); fermer(false); return; }
      if (e.key !== 'Tab') return;
      var f = pop.querySelectorAll('button:not([disabled]), input, textarea, select');
      var premier = f[0], dernier = f[f.length - 1];
      if (e.shiftKey && document.activeElement === premier) { e.preventDefault(); dernier.focus(); }
      else if (!e.shiftKey && document.activeElement === dernier) { e.preventDefault(); premier.focus(); }
    }
    annuler.addEventListener('click', function () { fermer(false); });
    ok.addEventListener('click', function () {
      if (!ok.classList.contains('eteint')) return fermer(true);
      // Le geste ne part pas, mais il dit pourquoi : ce qui reste à remplir
      // s'allume. Un bouton qui ne répond rien fait chercher au mauvais endroit.
      KCP_SIGNALER(opts.manque ? opts.manque() : []);
    });
    // Un clic à côté ne ferme pas une fenêtre qui porte une saisie : ce qui
    // est tapé ne s'efface jamais par accident.
    if (!opts.corps) voile.addEventListener('click', function () { fermer(false); });
    document.addEventListener('keydown', clavier, true);

    // Le bouton d'action refuse le clic tant que le formulaire ne tient pas.
    if (opts.pret) {
      // Éteint, mais pas `disabled` : un bouton désactivé ne reçoit aucun
      // clic, donc ne peut rien expliquer.
      var jauger = function () {
        var pret = opts.pret();
        ok.classList.toggle('eteint', !pret);
        ok.setAttribute('aria-disabled', pret ? 'false' : 'true');
      };
      pop.addEventListener('input', jauger);
      pop.addEventListener('change', jauger);
      pop.addEventListener('kcp-maj', jauger);
      jauger();
    }

    document.body.appendChild(voile);
    document.body.appendChild(pop);
    if (opts.corps) {
      var premier = opts.corps.querySelector('input, textarea, select, button');
      (premier || annuler).focus();
    } else {
      annuler.focus();
    }
  });
}

// Le périmètre en fenêtre : la même pièce partout.
// Sur la page : ce qui est défini se lit, un bouton ouvre la fenêtre.
// Trois questions répétées trois fois sur un écran étaient illisibles ;
// et un périmètre se pense d'un bloc, pas en marge d'autre chose.
// ─────────────────────────────────────────────────────────────
KCP_PERIMETRE.champ = function (hote, opts) {
  opts = opts || {};
  var texte = opts.valeur || '';
  var relu = false;

  var c = document.createElement('div'); c.className = 'perim-champ';
  var vu = document.createElement('div'); vu.className = 'perim-vu';
  var act = document.createElement('div'); act.className = 'perim-a';
  var btn = document.createElement('button');
  btn.type = 'button'; btn.className = 'btn btn-s';
  act.appendChild(btn);
  c.appendChild(vu); c.appendChild(act);
  hote.appendChild(c);

  function peindre() {
    vu.classList.toggle('vide', !texte);
    vu.classList.toggle('relu', relu);
    vu.textContent = texte || 'Périmètre non défini';
    btn.textContent = texte ? 'Modifier le périmètre' : 'Définir le périmètre';
    if (opts.onChange) opts.onChange();
  }

  btn.addEventListener('click', function () {
    KCP_PERIMETRE.ouvrirFenetre({
      valeur: texte, ensemble: opts.ensemble,
      doc: typeof opts.doc === 'function' ? opts.doc() : opts.doc,
      titre: opts.titre || (opts.ensemble ? 'Périmètre de l’ensemble' : 'Périmètre du sujet'),
      voisins: opts.voisins ? opts.voisins() : null,
      libelle: opts.libelle || 'Valider ce périmètre',
      onValider: function (t, estRelu) { texte = t; relu = estRelu; peindre(); }
    }, btn);
  });

  peindre();
  return {
    texte: function () { return texte; },
    poser: function (t) { texte = t || ''; relu = false; peindre(); },
    valide: function () { return texte.trim().length > 0; }
  };
};

// ─────────────────────────────────────────────────────────────
// La fenêtre du périmètre. Une phrase, puis une question à la fois.
//
// L'ancienne version demandait trois champs et deux listes : c'était faire
// faire à l'humain le travail du système. Il n'écrit plus qu'une phrase ;
// le scénario lit toute la carte et les résumés des fiches, propose une
// reformulation et une dizaine de candidats déjà tranchés, et l'humain se
// contente de répondre oui ou non.
//
// Le contrat de stockage ne bouge pas : un seul texte, les deux ancres.
// ─────────────────────────────────────────────────────────────
KCP_PERIMETRE.MIN_PHRASE = 50;

KCP_PERIMETRE.ouvrirFenetre = function (opts, ouvreur) {
  var voile = document.getElementById('kcp-perim-voile');
  var fen = document.getElementById('kcp-perim-fen');
  if (!fen) {
    voile = document.createElement('div');
    voile.className = 'perim-fen-voile'; voile.id = 'kcp-perim-voile';
    fen = document.createElement('div');
    fen.className = 'perim-fen'; fen.id = 'kcp-perim-fen';
    fen.setAttribute('role', 'dialog'); fen.setAttribute('aria-modal', 'true');
    fen.setAttribute('aria-labelledby', 'kcp-perim-titre');
    fen.innerHTML =
      '<div class="perim-fen-tete">' +
        '<h2 id="kcp-perim-titre"></h2>' +
        '<p class="sub" id="kcp-perim-sous"></p>' +
      '</div>' +
      '<div class="perim-fen-corps" id="kcp-perim-corps"></div>' +
      '<div class="perim-fen-pied" id="kcp-perim-pied"></div>';
    document.body.appendChild(voile);
    document.body.appendChild(fen);
  }

  var titre = document.getElementById('kcp-perim-titre');
  var sous = document.getElementById('kcp-perim-sous');
  var corps = document.getElementById('kcp-perim-corps');
  var pied = document.getElementById('kcp-perim-pied');
  titre.textContent = opts.titre || 'Périmètre';

  function el(t, c, txt) {
    var e = document.createElement(t);
    if (c) e.className = c;
    if (txt !== undefined) e.textContent = txt;
    return e;
  }
  function tsec(x) { return el('div', 't-sec', x); }
  function vider() { corps.textContent = ''; pied.textContent = ''; corps.scrollTop = 0; }

  function fermer() {
    voile.classList.remove('on'); fen.classList.remove('on');
    document.removeEventListener('keydown', echap, true);
    if (ouvreur && ouvreur.focus) ouvreur.focus();
  }
  function echap(e) {
    if (e.key === 'Escape' && fen.classList.contains('on')) { e.preventDefault(); fermer(); }
  }
  // Une saisie en cours ne s'efface pas d'un clic à côté.
  voile.onclick = null;
  document.addEventListener('keydown', echap, true);

  // ── Étape 1 · la phrase ────────────────────────────────────
  function etapeGraine(depart) {
    vider();
    sous.textContent = 'Décrivez ce que ce sujet couvre. Plus vous êtes précis et '
      + 'complet, plus ce que le système vous proposera sera juste.';

    var z = el('textarea', 'perim-graine');
    z.value = depart || '';
    z.placeholder = opts.ensemble
      ? 'Cet ensemble regroupe tout ce qui touche à mes finances personnelles : le patrimoine, les placements, la fiscalité.'
      : 'Je veux un sujet qui suive mes investissements immobiliers : les biens, leur financement, leur rendement.';
    z.setAttribute('aria-label', 'Ce que ce sujet couvre');
    corps.appendChild(z);

    var att = el('div', 'perim-attente'); att.hidden = true;
    att.appendChild(el('span', 'perim-rond'));
    var msg = el('span', '', '');
    att.setAttribute('role', 'status'); att.setAttribute('aria-live', 'polite');
    att.appendChild(msg);
    corps.appendChild(att);

    var compteur = el('span', 'sub', '');
    var annuler = el('button', 'btn', 'Annuler');
    annuler.type = 'button'; annuler.addEventListener('click', fermer);
    var go = el('button', 'btn btn-1', '✦ Compléter');
    go.type = 'button';
    var droite = el('div', 'droite');
    droite.appendChild(annuler); droite.appendChild(go);
    pied.appendChild(compteur); pied.appendChild(droite);

    function etat() {
      var n = z.value.trim().length;
      var manque = KCP_PERIMETRE.MIN_PHRASE - n;
      go.disabled = manque > 0;
      compteur.textContent = manque > 0
        ? 'Encore ' + manque + ' caractère' + (manque > 1 ? 's' : '')
        : '';
    }
    z.addEventListener('input', etat);
    etat();

    go.addEventListener('click', function () {
      go.disabled = true; annuler.disabled = true; z.disabled = true;
      att.hidden = false;
      // Mesure sur quarante et un sujets : huit secondes, pas trois.
      var n = 9;
      function dire() {
        msg.textContent = n > 0
          ? 'Le système lit votre carte et les résumés de vos sujets… ' + n + ' s'
          : 'Presque…';
      }
      dire();
      var tic = setInterval(function () { n -= 1; dire(); }, 1000);
      completer(z.value.trim(), function (p) {
        clearInterval(tic);
        annuler.disabled = false;
        if (!p) {
          att.hidden = true; z.disabled = false; go.disabled = false;
          var e = el('div', 'alerte-err');
          e.appendChild(el('span', '', '›'));
          e.appendChild(el('span', '', 'Le système n’a pas répondu. Réessayez, '
            + 'ou écrivez le périmètre vous-même.'));
          corps.appendChild(e);
          // Un champ qui appartient à l'humain ne dépend jamais d'une
          // machine pour être écrit : la sortie manuelle reste ouverte.
          var manuel = el('button', 'btn btn-s', 'Écrire le périmètre moi-même');
          manuel.type = 'button';
          manuel.addEventListener('click', function () {
            etapeTexte(null, z.value.trim(), [], []);
          });
          corps.appendChild(manuel);
          return;
        }
        etapeQuestions(p);
      });
    });

    z.focus();
  }

  // ── L'appel au scénario ────────────────────────────────────
  function completer(phrase, suite) {
    var url = KCP_WEBHOOKS.completer_perimetre;
    if (!url) return suite(null);
    kcpFetch(url, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id_client: KCP_CONFIG.client_id, phrase: phrase,
        doc_int_id: opts.doc || '', ensemble: !!opts.ensemble
      })
    }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.text();
    }).then(function (raw) {
      var c = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      var d = JSON.parse(c);
      if (!d || !d.candidats || !d.candidats.length) throw new Error('vide');
      suite(d);
    }).catch(function () { suite(null); });
  }

  // ── Étape 2 · une question à la fois ───────────────────────
  function etapeQuestions(p) {
    vider();
    sous.textContent = '';
    var oui = [], non = [], i = 0;
    var reform = String(p.reformulation || '').trim();

    var annuler = el('button', 'btn', 'Annuler');
    annuler.type = 'button'; annuler.addEventListener('click', fermer);
    var droite = el('div', 'droite'); droite.appendChild(annuler);
    var etat = el('span', 'sub', '');
    pied.appendChild(etat); pied.appendChild(droite);

    function poser() {
      corps.textContent = '';
      if (i >= p.candidats.length) return etapeTexte(p, reform, oui, non);
      var it = p.candidats[i];
      etat.textContent = 'question ' + (i + 1) + ' sur ' + p.candidats.length;

      var c = el('div', 'perim-une');
      var pts = el('div', 'perim-points');
      p.candidats.forEach(function (x, k) {
        var d = el('i');
        d.className = k < i ? 'fait' : (k === i ? 'ici' : '');
        pts.appendChild(d);
      });
      c.appendChild(pts);
      c.appendChild(el('div', 'q', '« ' + it.texte + ' »'));
      // `vit_dans` est un AVERTISSEMENT, jamais une part du texte. Le CODEX
      // interdit qu'un périmètre nomme un autre document, et le moteur qui
      // note retire un point pour ça : le nom se montre, il ne s'enregistre pas.
      if (it.vit_dans) {
        var av = el('div', 'perim-recouvre');
        var ic = el('span', 'ic', '⚠'); ic.setAttribute('aria-hidden', 'true');
        av.appendChild(ic);
        var tx = el('div');
        var l1 = el('div', 'l1');
        l1.appendChild(document.createTextNode('Cette matière est déjà dans '));
        var b2 = document.createElement('b'); b2.textContent = it.vit_dans;
        l1.appendChild(b2); l1.appendChild(document.createTextNode('.'));
        tx.appendChild(l1);
        tx.appendChild(el('div', 'l2', 'La mettre ici aussi ferait se recouvrir les deux sujets.'));
        av.appendChild(tx);
        c.appendChild(av);
      }
      c.appendChild(el('div', 'aide', 'Est-ce que ça appartient à ce sujet ?'));

      var duo = el('div', 'perim-duo-b');
      [['oui', 'Oui', oui], ['non', 'Non', non]].forEach(function (x) {
        var b = el('button', 'btn ' + x[0], x[1]);
        b.type = 'button';
        b.addEventListener('click', function () { x[2].push(it.texte); i += 1; poser(); });
        duo.appendChild(b);
      });
      c.appendChild(duo);

      var sk = el('button', 'btn btn-s perim-passer', 'Passer');
      sk.type = 'button';
      sk.title = 'Ni dedans ni dehors : cet élément n’entrera pas dans le périmètre';
      sk.addEventListener('click', function () { i += 1; poser(); });
      c.appendChild(sk);

      corps.appendChild(c);
      duo.firstChild.focus();
    }
    poser();
  }

  // ── Étape 3 · le bilan, et le texte que l'on enregistre ────
  // `p` porte les trois phrases que le moteur redige en plus de la
  // reformulation : la regle d'entree, l'arbitrage et le niveau de detail.
  // Elles ne recoivent pas de champ a elles — elles arrivent dans le texte
  // final, qui est editable : c'est la qu'on les corrige, sans allonger la
  // fenetre de trois zones de plus.
  function etapeTexte(p, reform, oui, non) {
    vider();
    sous.textContent = 'Relisez, corrigez ce qui est faux, et enregistrez.';

    var bloc = el('div');
    bloc.appendChild(tsec('Votre description reformulée'));
    var w = el('div', 'perim-reform');
    var zr = el('textarea');
    zr.value = reform;
    zr.setAttribute('aria-label', 'Votre description reformulée');
    // La zone épouse son texte : une hauteur fixe laissait du blanc sous la
    // dernière ligne, et ce blanc-là ne vaut pas celui du dessus.
    zr.rows = 1;
    function ajuster() { zr.style.height = 'auto'; zr.style.height = zr.scrollHeight + 'px'; }
    zr.addEventListener('input', ajuster);
    w.appendChild(zr); bloc.appendChild(w);
    corps.appendChild(bloc);

    // Une seule liste, dans l'ordre où les questions ont été posées : une
    // ligne qui change de camp ne bouge pas de place, sinon on la perd.
    var lignes = oui.map(function (t) { return { t: t, v: 'oui' }; })
      .concat(non.map(function (t) { return { t: t, v: 'non' }; }));
    // La liste s'affiche toujours, meme vide : on peut desormais y ajouter.
    // Ajouter et retirer ici plutot que dans le texte du bas, c'est la meme
    // matiere sans jamais pouvoir casser la structure du perimetre.
    var bl = el('div');
    bl.appendChild(tsec('Vos réponses'));
    var lst = el('div', 'perim-bilan');
    bl.appendChild(lst);

    function rangee(l) {
      var g = el('div', 'rangee');
      var m = el('span', 'marq ' + l.v, l.v === 'oui' ? 'dedans' : 'dehors');
      g.appendChild(m);
      g.appendChild(el('span', 'nom', l.t));
      var b = el('button', 'btn btn-s', 'changer');
      b.type = 'button';
      b.setAttribute('aria-label', 'Changer de camp : ' + l.t);
      b.addEventListener('click', function () {
        l.v = l.v === 'oui' ? 'non' : 'oui';
        m.className = 'marq ' + l.v;
        m.textContent = l.v === 'oui' ? 'dedans' : 'dehors';
        poserTexte();
      });
      g.appendChild(b);
      // Une ligne dont on ne veut ni dedans ni dehors n'avait aucune sortie :
      // `changer` bascule entre deux etats qui la gardent tous les deux.
      var x = el('button', 'btn btn-s perim-x', '×');
      x.type = 'button';
      x.setAttribute('aria-label', 'Retirer : ' + l.t);
      x.title = 'Retirer cette ligne';
      x.addEventListener('click', function () {
        var i = lignes.indexOf(l);
        if (i >= 0) lignes.splice(i, 1);
        dessiner();
        poserTexte();
      });
      g.appendChild(x);
      return g;
    }

    function dessiner() {
      lst.textContent = '';
      lignes.forEach(function (l) { lst.appendChild(rangee(l)); });
    }
    dessiner();

    // ── Ajouter une ligne, en place ──
    var zoneAjout = el('div');
    bl.appendChild(zoneAjout);
    var plus = el('button', 'btn btn-s perim-plus', '+ Ajouter');
    plus.type = 'button';
    bl.appendChild(plus);

    plus.addEventListener('click', function () {
      plus.hidden = true;
      var g = el('div', 'rangee rangee-neuve');
      var sel = el('select', 'marq-sel');
      [['oui', 'dedans'], ['non', 'dehors']].forEach(function (o) {
        var op = el('option', null, o[1]); op.value = o[0]; sel.appendChild(op);
      });
      sel.setAttribute('aria-label', 'Dedans ou dehors');
      var z = el('input', 'nom-neuf');
      z.type = 'text';
      z.placeholder = 'écrivez la matière, une ligne…';
      z.setAttribute('aria-label', 'La matière à ajouter');
      var ok = el('button', 'btn btn-1 btn-s', '✓');
      ok.type = 'button';
      ok.setAttribute('aria-label', 'Valider cette ligne');
      function fermer() { g.remove(); plus.hidden = false; plus.focus(); }
      function valider() {
        var t = z.value.trim();
        if (!t) { KCP_SIGNALER([z]); return; }
        lignes.push({ t: t, v: sel.value });
        fermer(); dessiner(); poserTexte();
      }
      ok.addEventListener('click', valider);
      // Une ligne, pas un paragraphe : Entree valide, Echap renonce.
      z.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); valider(); }
        else if (e.key === 'Escape') { e.preventDefault(); fermer(); }
      });
      g.appendChild(sel); g.appendChild(z); g.appendChild(ok);
      zoneAjout.appendChild(g);
      z.focus();
    });

    corps.appendChild(bl);

    var fin = el('div');
    fin.appendChild(tsec('Le périmètre enregistré'));
    var zt = el('textarea', 'perim-assemble');
    zt.setAttribute('aria-label', 'Le périmètre enregistré');
    fin.appendChild(zt);
    corps.appendChild(fin);

    // Tant que l'humain n'a pas écrit dans le texte final, il suit ses
    // réponses. Dès qu'il y touche, c'est lui qui décide : on cesse de le
    // réécrire sous ses doigts.
    var mien = false;
    zt.addEventListener('input', function () { mien = true; });
    function poserTexte() {
      if (mien) return;
      // `Entre ici` tranche, `Y entrent notamment` illustre : les acceptes
      // sont des exemples, jamais la regle.
      zt.value = KCP_PERIMETRE.assembler({
        objet: zr.value.trim(),
        regle: (p && p.regle_entree) || '',
        entre: lignes.filter(function (l) { return l.v === 'oui'; }).map(function (l) { return l.t; }),
        refuse: lignes.filter(function (l) { return l.v === 'non'; }).map(function (l) { return l.t; }),
        doute: (p && p.arbitrage) || '',
        detail: (p && p.grain) || '',
        sousSujets: (p && p.sous_sujets) || []
      });
    }
    zr.addEventListener('input', poserTexte);
    poserTexte();
    ajuster();

    var annuler = el('button', 'btn', 'Annuler');
    annuler.type = 'button'; annuler.addEventListener('click', fermer);
    var ok = el('button', 'btn btn-1', opts.libelle || 'Enregistrer ce périmètre');
    ok.type = 'button';
    ok.addEventListener('click', function () {
      opts.onValider && opts.onValider(zt.value.trim(), true);
      fermer();
    });
    var droite = el('div', 'droite');
    droite.appendChild(annuler); droite.appendChild(ok);
    pied.appendChild(droite);

    function etatOk() { ok.disabled = !zt.value.trim(); }
    zt.addEventListener('input', etatOk);
    etatOk();
    zr.focus();
  }

  // Une seule fenêtre, un seul chemin. Un périmètre déjà écrit arrive
  // pré-rempli dans la phrase, tel qu'il est stocké : le système repart de
  // tout ce qu'on lui avait dit, exclusions comprises.
  etapeGraine(String(opts.valeur || '').trim());

  voile.classList.add('on'); fen.classList.add('on');
};
