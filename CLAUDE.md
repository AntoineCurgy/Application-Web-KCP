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
du scénario correspondant). Vingt-trois webhooks, tous appelés par au moins une page.

**L'analyse des périmètres ne se lance pas depuis la page.** `KCP - Analyse
Perimetres - Trigger` la déclenche le dimanche à 3 h. La page lit le résultat dans
`carte.perimetre_niveau` et dans les propositions de type `perimetre` — deux
webhooks qui répondent en moins de deux secondes, là où le balayage met quatre
minutes.

Les pages, depuis la refonte du 31/08 :

| Page | Rôle | Webhooks |
| --- | --- | --- |
| `index.html` | accueil, carte dépliable | `carte`, `points_a_clarifier`, `propositions` |
| `ensemble.html`, `sujet.html` | fiches (`?doc=GCPxxx` / `?doc=PCPxxx`) | `carte`, `points_a_clarifier`, `captures`, `reponse_clarification` |
| `deposer.html`, `interroger.html` | les deux moitiés de l'ancien chat | `chat`, `captures` / `chat`, `history` |
| `a-clarifier.html` | questions du cycle | `points_a_clarifier`, `reponse_clarification` |
| `reorganiser.html` | **Améliorer** : trois onglets, Confirmées / Potentielles / Périmètres | `propositions`, `reponse_proposition`, `signaux`, `rediger_signal`, `carte`, `update_perimetre`, `renommer`, `deplacer`, `restructurer`, `creer_tiroir` |
| `modifier-sujet.html` | six onglets (`?doc=&mode=perim|nom|depl|scinder|fusionner|archiver`) | `update_perimetre`, `renommer`, `deplacer`, `restructurer` |
| `nouveau-sujet.html`, `nouvel-ensemble.html` | créations (`?nom=&perimetre=` pré-remplit) | `creer_tiroir`, `creer_ensemble` |
| `initialiser-ia.html` | prompt vers Claude, Claude MCP, Claude Code ou ChatGPT | `prompt` |
| `enregistrer-reunion.html` | robot de réunion | `creer_bot` |
| `informations-capturees(-tout).html` | journal des dépôts | `captures` |
| `parametres.html` | fenêtre de réglages | `parametres`, `reset_password` |
| `login.html`, `reset-password.html` | pages publiques | `auth`, `reset_password` |

Ajouter une fonctionnalité back = créer le scénario côté Make, puis ajouter son URL dans
`KCP_WEBHOOKS` — jamais d'URL de webhook en dur dans une page.

### Le périmètre — une phrase, puis une question à la fois

L'humain n'écrit **qu'une phrase**. `completer_perimetre` lit toute la carte et les résumés des
fiches, puis rend une reformulation et une dizaine de candidats ; l'humain répond Oui ou Non,
une question à la fois. Comptez **huit secondes** de latence, mesurées sur quarante et un sujets :
l'attente doit rester visible.

`KCP_PERIMETRE.champ(hôte, opts)` pose le résumé et le bouton ; `ouvrirFenetre` ouvre **la seule
et même fenêtre partout**, pré-remplie avec le texte stocké quand il existe. Six emplacements :
nouveau sujet, nouvel ensemble, l'onglet Périmètre de Modifier un sujet, chaque cible d'une
scission, l'ensemble d'une scission, et le sujet d'arrivée d'une fusion.

**`vit_dans` s'affiche, il ne s'écrit jamais.** Le CODEX interdit qu'un périmètre nomme un autre
document, et le moteur qui note retire un point pour ça. Le champ sert d'avertissement de
recouvrement à l'écran de la question, et disparaît du texte enregistré.

Au stockage : **un seul texte**, deux ancres — `Y entrent : ` et `N'y ont pas leur place : `.
Aucune colonne ajoutée. Un périmètre ancien sans ancres se charge entièrement dans la phrase.

### Trois pièces partagées de `config.js`

| Fonction | Ce qu'elle fait |
| --- | --- |
| `KCP_GESTE(btn, pret, manque)` | **le geste principal n'est jamais `disabled`** — un bouton désactivé ne reçoit aucun clic, donc ne peut rien expliquer. Il porte `.eteint` et `aria-disabled`, reste cliquable, et allume ce qui manque |
| `KCP_CONFIRMER({titre, lignes, corps, pret, manque, valider, large, danger})` | une fenêtre, avec ou sans formulaire. Rend une promesse. Une fenêtre qui porte une saisie ne se ferme pas d'un clic à côté |
| `KCP_ENVOYE(mot)` | l'accusé de réception dans le coin haut droit. **Uniquement pour un simple accusé** : quand le message apprend quelque chose, il reste dans la page, là où l'on vient d'agir |

> **Une liste ne perd jamais un sujet.** `kcpRemplirHierarchie` groupe par parent ; un sujet
> dont le parent est inconnu se range dans **« Sans rattachement connu »** au lieu de
> disparaître. Le 2 septembre, `ListeTiroirs` ne servait `parent` que sur les nœuds : les
> trente-trois sujets s'évaporaient de six listes, sans un mot ni une erreur. La source est
> corrigée, le filet reste.

`KCP_SIGNALER(éléments)` allume ce qui reste à remplir : cadre rouge, deux clignotements, focus
sur le premier. Les deux premières fonctions s'en servent.

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
système = texte et titres, DM Mono = données), six tailles et toutes les classes partagées.

**Deux échelles typographiques**, et c'est voulu : `:root` porte celle du contenu
(11 / 12.5 / 14 / 17 / 21 / 27) et `.side` garde la précédente (12 / 14 / 16 / 20 / 24 / 32).
La barre latérale est un chrome de navigation, pas du contenu ; ses entrées valent alors
exactement la taille du texte courant, ce qui la rend lisible sans la faire peser.

**Le niveau** — `.n1` `.n2` `.n3` — dit l'urgence par la couleur, et `.j1` `.j2` `.j3` comptent
les barres de la jauge. **`.n0` est le quatrième état : l'absence de niveau**, gris, jauge
éteinte. Ce n'est pas un cran de l'échelle — le plus bas dit « solide », et l'afficher sur un
périmètre que personne n'a lu serait un compliment fabriqué. Un périmètre accepté redevient
`.n0` : `Update Perimètre Déclaré` efface le verdict en même temps qu'il écrit le nouveau texte. Les deux sont **indépendants** : une importance élevée allume trois
barres en rouge, un périmètre solide trois barres en vert. Chaque niveau expose `--niv`,
`--niv-bg` et `--niv-br`, que tout composant lit sans jamais nommer un rouge ou un vert.

**Des frères qui se masquent s'espacent par `gap`, jamais par `margin`** : `display:none` ne
retire pas un élément de la fratrie, et `.a + .a { margin-top }` mord quand même.

`background` en raccourci sur `:focus` efface le chevron d'un `<select>`, peint en
`background-image` : utiliser `background-color`. Il est chargé **avant** le `<style>` de chaque page.

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
- Valider avant PR : équilibre local des balises + `node --check` des scripts en ligne, croiser
  les `getElementById` avec les `id` réellement présents, puis le validateur W3C
  (`validator.w3.org/nu`, espacer les appels de 26 s — quota Cloudflare long).
- **Un faux positif connu du validateur**, sur `interroger.html` : *« CSS: height: The types
  are incompatible »* pour `calc(100vh - 2 * var(--s5))`. Son vérificateur CSS ne résout pas
  `var()`, donc ne peut pas typer l'opération. La règle réelle — MDN, `calc()` — autorise
  **un seul opérande porteur d'unité** dans une multiplication, et `2` n'en porte pas.
  Ne rien corriger.
- **Cinq pages portent des champs hors `<form>`** — `enregistrer-reunion`, `modifier-sujet`,
  `nouveau-sujet`, `nouvel-ensemble`, `parametres`. La touche Entrée n'y valide pas. Connu,
  pas corrigé.
