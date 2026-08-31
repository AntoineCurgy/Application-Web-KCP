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
    sub.textContent = '— y répondre met ce document à jour au cycle suivant.';
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
        ' — aller au bloc de réponse';
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
    }); else c.appendChild(rien('Pas encore de synthèse — elle s’écrira au prochain cycle.'));

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
