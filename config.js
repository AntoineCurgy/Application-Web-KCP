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
  update_perimetre: 'https://hook.eu2.make.com/mrtjwmxnmnhy9vus3vlmn6ps99oowa15', // Make: KCP - Update Perimetre
  creer_bot: 'https://hook.eu2.make.com/v3wdi25sob508x5gzvr11o0wwfg363vy', // Make: KCP - Meeting BaaS - Creer Bot
  reset_password: 'https://hook.eu2.make.com/baacr4sl603f8jif2htezl4tbttp857p', // Make: KCP - Reset Password
  captures: 'https://hook.eu2.make.com/r50v5k4dwhgb1i51pj1rfwvsz231t9e8', // Make: KCP - WebApp - Informations Capturées
  points_a_clarifier: 'https://hook.eu2.make.com/qkvmr8udjdy5kr6ptm620b3wb2cl47xh', // Make: KCP - WebApp - Points a clarifier
  reponse_clarification: 'https://hook.eu2.make.com/c29ze7t8b9ql9qf3mjcud8e4f8vc6tpr', // Make: KCP - WebApp - Reponse Clarification
};

// Guide d'utilisation, Google Doc partage en lecture. L'identifiant d'un
// document Drive ne change pas quand on le modifie : le lien est donc stable,
// il suffit d'editer le document pour que tout le monde voie la mise a jour.
const KCP_GUIDE_URL = 'https://docs.google.com/document/d/1iDpCeGGRI2g-ekKcszG5GeayUDRstWP1FPtsU9ziqnA/view';

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
  const r = await fetch(KCP_WEBHOOKS.tiroirs, {
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
