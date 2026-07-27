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
};

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
};

// ── Garde d'accès : pas de session → redirection vers le login ──
// (la page login.html est la seule exemptée)
(function kcpGuard() {
  var page = location.pathname.split('/').pop();
  if (!_kcpSession && page !== 'login.html') {
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
