# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Nature du projet

Application web KCP : site **statique multi-pages**, sans build, sans dépendances, sans tests.
Pas de `package.json`, pas de bundler, pas de framework. Chaque page est un fichier HTML autonome
qui charge `config.js` (dans le `<head>`, synchrone : la garde de session doit rediriger avant le
rendu) puis `base.css`. Interface et commentaires en français, **utilisateur vouvoyé partout**.

## Commandes

Il n'y a rien à compiler ni à installer.

```bash
python3 -m http.server 8000     # servir localement (ouvrir http://localhost:8000/login.html)
```

Ouvrir les fichiers en `file://` **ne marche pas** : la garde d'accès de `config.js` lit
`location.pathname`, et les webhooks exigent une origine HTTP.

Pour tester une session sans passer par le login, injecter la session dans la console :
```js
localStorage.setItem('kcp_session', JSON.stringify({client_id:'…', client_name:'…', notion:{}}))
```

## Déploiement

`main` **est la production**. GitHub Pages sert la racine de `main` sur http://kcp-app.88systems.io/
(cf. `CNAME`). Tout merge sur `main` est une mise en ligne immédiate : travailler en branche
`webapp-<sujet>` et passer par une PR.

## Architecture

**Il n'y a pas de backend dans ce repo.** Toute la logique métier vit dans des scénarios
**Make.com** appelés en `POST` JSON depuis le navigateur. `config.js` est le seul point de
couplage : il déclare `KCP_WEBHOOKS` (un webhook Make par fonctionnalité, commenté avec le nom
du scénario correspondant). Vingt webhooks, tous appelés par au moins une page.

Les pages, depuis la refonte du 31/08 :

| Page | Rôle | Webhooks |
| --- | --- | --- |
| `index.html` | accueil, carte dépliable | `carte`, `points_a_clarifier`, `propositions` |
| `ensemble.html`, `sujet.html` | fiches (`?doc=GCPxxx` / `?doc=PCPxxx`) | `carte`, `points_a_clarifier`, `captures`, `reponse_clarification` |
| `deposer.html`, `interroger.html` | les deux moitiés de l'ancien chat | `chat`, `captures` / `chat`, `history` |
| `a-clarifier.html` | questions du cycle | `points_a_clarifier`, `reponse_clarification` |
| `reorganiser.html` | propositions du cycle | `propositions`, `reponse_proposition` |
| `modifier-sujet.html` | six onglets (`?doc=&mode=perim|nom|depl|scinder|fusionner|archiver`) | `update_perimetre`, `renommer`, `deplacer`, `restructurer` |
| `nouveau-sujet.html`, `nouvel-ensemble.html` | créations (`?nom=&perimetre=` pré-remplit) | `creer_tiroir`, `creer_ensemble` |
| `initialiser-ia.html` | prompt vers Claude/ChatGPT | `prompt` |
| `enregistrer-reunion.html` | robot de réunion | `creer_bot` |
| `informations-capturees(-tout).html` | journal des dépôts | `captures` |
| `parametres.html` | fenêtre de réglages | `parametres`, `reset_password` |
| `login.html`, `reset-password.html` | pages publiques | `auth`, `reset_password` |

Ajouter une fonctionnalité back = créer le scénario côté Make, puis ajouter son URL dans
`KCP_WEBHOOKS` — jamais d'URL de webhook en dur dans une page.

### Session et multi-tenant

Une seule app pour tous les clients. **Aucun identifiant client n'est codé en dur.** Le webhook
`auth` résout le client au login (`{username, password}`) et renvoie `client_id`, `client_name`
et deux UUID Notion ; le login pose `kcp_session` dans `localStorage` avec les URL reconstruites
(`notion.tiroirs`, `notion.reunions`). `config.js` en dérive `KCP_CONFIG`, lu par toutes les pages.

`config.js` exécute une **garde d'accès** au chargement : sans session, redirection vers
`login.html`. Les seules pages publiques sont listées dans `KCP_PUBLIC_PAGES`. Une nouvelle page
protégée n'a rien à faire : inclure `config.js` dans le `<head>` suffit.

Presque tout appel envoie l'identifiant client dans le corps ; **la clé varie selon le scénario**
(`client_id` ou `id_client`) — ne pas uniformiser, chaque scénario lit la sienne.

### Caches localStorage (stale-while-revalidate)

`config.js` porte un cache par domaine de données, **toujours suffixé par `client_id`**
(`kcp_tiroirs_<id>`, `kcp_history_<id>`, `kcp_captures_<id>`, `kcp_carte_<id>`, `kcp_points_<id>`,
`kcp_props_<id>`). Principe uniforme : afficher le cache immédiatement, revalider en réseau.

- **Tiroirs** — TTL de 10 min ; toute page qui crée, renomme, déplace, restructure ou modifie un
  périmètre appelle `kcpInvalidateTiroirs()`.
- **Les autres** — revalidation systématique. Les badges de la barre latérale (`kcpNavBadges()`)
  se servent des caches points et propositions ; seules les pages concernées revalident.

### Réponses des webhooks

Les scénarios Make passent parfois par des IA et renvoient du JSON **entouré de fences
markdown**. Toute lecture de réponse suit le même motif, dupliqué volontairement dans chaque
page :

```js
const raw = await r.text();
const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
let d = {}; try { d = JSON.parse(cleaned); } catch (e) { d = {}; }
```

Ne jamais faire `await r.json()` directement sur un webhook Make.

**Deux pièges de données mesurés au réel :**
- Les dates Make sortent en `2026-08-30 9:11:28` (heure sans zéro) : parser à la main
  (regex), jamais `new Date(chaîne)` seul — Safari le refuse.
- Une liste vide peut revenir comme **un élément aux champs vides** (`history` le fait) :
  filtrer sur le contenu réel, jamais sur la seule longueur.

**Les erreurs métier sortent en `409`** avec `{error, message}` (`label_exists`,
`creation_refusee`, `noeud_non_deplacable`, `racine_intouchable`, `source_indisponible`,
`question_indisponible`) : lire le corps, afficher `message`.

### UUID Notion

Le référentiel stocke les UUID au format canonique **avec tirets**, mais `app.notion.com` exige
l'identifiant **sans tirets** dans l'URL. La normalisation se fait uniquement à l'affichage, via
`kcpNotionHref()`. Ne pas dé-tiretiser l'UUID en session ni dans les payloads.

### Le chat et le sas

Le scénario `chat` reçoit `{id_client, nom_tiroir, mode, message}`. Le nom part **sans
croisillon** : le scénario préfixe `#` lui-même quand le nom commence par une minuscule — les
ensembles (`CDP`, `Head`) se résolvent donc aussi. Un nom vide ou introuvable fait partir le
dépôt au **SAS** ; la page affiche alors son propre message (« le système rangera… »), jamais le
« Noté dans # » du scénario.

## Conventions CSS

`base.css` porte la palette (`:root`), les trois polices à trois rôles (Syne = marque seule,
système = texte et titres, DM Mono = données), six tailles (12/14/16/20/24/32) et toutes les
classes partagées, sections v3 à v14. Il est chargé **avant** le `<style>` de chaque page.

Une page qui doit dévier **ne modifie pas `base.css`** — elle redéfinit la règle chez elle.
Ne toucher à `base.css` que pour un changement voulu sur toutes les pages. `[hidden]` y gagne
sur toute classe qui pose un `display` (règle `!important`) : basculer la visibilité par
`el.hidden`, jamais par `style.display`.

La barre latérale est dupliquée dans chaque page (motif assumé du site) : seule change l'entrée
`aria-current="page"`. Les badges et le pied (prénom, avatar) se remplissent en JS.

## Points d'attention

- **Le repo est public** et `config.js` expose en clair toutes les URL de webhooks Make, non
  authentifiées. C'est l'architecture actuelle ; en tenir compte avant d'y ajouter quoi que ce soit.
- Écrire les données serveur avec `textContent`, jamais `innerHTML` (réservé aux littéraux
  construits dans la page).
- Le code est en JS navigateur natif, style conservateur (`var`/`function`, pas de modules,
  pas d'import). Rester dans cet idiome.
- Valider avant PR : équilibre local des balises + `node --check` des scripts en ligne, puis le
  validateur W3C (`validator.w3.org/nu`, espacer les appels de 26 s — quota Cloudflare long).
