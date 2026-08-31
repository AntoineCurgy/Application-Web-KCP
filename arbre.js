// ── La carte d'un niveau. Deux gestes distincts :
//    cliquer le NOM descend d'un niveau ; cliquer le CHEVRON deplie sur place.
//    Le depliage ne chevauche jamais : la hauteur de chaque rangee est celle de
//    sa colonne la plus haute, calculee avant de placer la rangee suivante.
var KCP_ARBRE = (function () {
  var NS = 'http://www.w3.org/2000/svg';
  var BW = 186, GAP = 20, H = 36, SPY = 52, Y0 = 82, RS = 40, SW = 162, GAPR = 32, PAD = 12;

  function el(n, a) { var e = document.createElementNS(NS, n); for (var k in a) e.setAttribute(k, a[k]); return e; }

  // Une pastille chiffree. `cx` est son centre horizontal, `cy` son centre
  // vertical : le chiffre est pose sur ce meme centre, jamais decale.
  function pastille(g, cx, cy, n, classe) {
    var txt = n > 9 ? '9+' : String(n);
    var lg = txt.length > 1 ? 21 : 16;
    g.appendChild(el('rect', { x: cx - lg / 2, y: cy - 8, width: lg, height: 16, rx: 8,
      class: 'q-pastille' + (classe ? ' ' + classe : '') }));
    var t = el('text', { x: cx, y: cy, class: 'q-chiffre' + (classe ? ' ' + classe : ''),
      'text-anchor': 'middle', 'dominant-baseline': 'central' });
    t.textContent = txt;
    g.appendChild(t);
  }

  // Les questions du document : a cheval sur la bordure droite, a mi-hauteur.
  function marqueBord(g, x, y, w, h, n) {
    if (!n) return;
    pastille(g, x + w, y + h / 2, n, null);
  }

  // Les questions de la descendance d'un noeud : dans la boite, calee a droite,
  // a la place ou s'affichait le compte d'enfants.
  function marqueInterne(g, x, y, w, h, n, creux) {
    if (!n) return;
    var lg = (n > 9 ? 21 : 16);
    pastille(g, x + w - 12 - lg / 2, y + h / 2, n, creux ? 'creuse' : null);
  }

  function dessine(svg, opts) {
    var racine = opts.racine, L = opts.donnees, ouverts = opts.ouverts || {};
    var onOuvrir = opts.onOuvrir, onSel = opts.onSel;
    // Questions ouvertes du document lui-meme, par identifiant.
    var questions = opts.questions || {};
    // Questions ouvertes de la descendance d'un noeud. Elles remplacent le
    // compte d'enfants, qui n'apprenait rien qu'on ne voie deja en depliant.
    var sousQuestions = opts.sousQuestions || {};
    var noeudCreux = !!opts.noeudCreux;
    while (svg.firstChild) svg.removeChild(svg.firstChild);

    var deux = L.length > 6;
    var n1 = deux ? Math.ceil(L.length / 2) : L.length;
    var COL = BW + GAP, W = n1 * COL - GAP;

    // hauteur de chaque entree, enfants deplies compris
    function haut(d) {
      var n = (ouverts[d.id] && d.enfants) ? d.enfants.length : 0;
      return H + (n ? 12 + n * RS : 0);
    }
    var h1 = 0;
    L.forEach(function (d, i) { if (!deux || i < n1) h1 = Math.max(h1, haut(d)); });
    var Y2 = Y0 + h1 + GAPR;

    var pos = L.map(function (d, i) {
      var c = deux ? (i % n1) : i;
      return { d: d, x: c * COL, y: (deux && i >= n1) ? Y2 : Y0 };
    });

    svg.appendChild(el('path', { class: 'lien', d: 'M' + (W / 2) + ' ' + H + ' V' + SPY }));
    svg.appendChild(el('path', { class: 'lien', d: 'M' + (BW / 2) + ' ' + SPY + ' H' + (W - BW / 2) }));
    pos.forEach(function (p) {
      svg.appendChild(el('path', { class: 'lien', d: 'M' + (p.x + BW / 2) + ' ' + SPY + ' V' + p.y }));
    });

    // La racine porte une fiche comme tout document : elle se clique.
    var rx = (W - BW) / 2;
    var g0 = el('g', { class: 'item', tabindex: '0', role: 'button' });
    g0.appendChild(el('rect', { x: rx, y: 0, width: BW, height: H, rx: 7, class: 'b-head' }));
    var t0 = el('text', { x: rx + BW / 2, y: 24, class: 'n-head', 'text-anchor': 'middle' });
    t0.textContent = racine; g0.appendChild(t0);
    // La racine ne porte pas de pastille : le badge « A clarifier » de la
    // barre laterale dit deja le total, ce serait redondant.
    var ah = function () { onSel({ id: 'GCP001', label: racine }, 'ens'); };
    g0.addEventListener('click', ah);
    g0.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ah(); }
    });
    svg.appendChild(g0);

    var bas = 0;
    pos.forEach(function (p) {
      var ens = p.d.id.indexOf('GCP') === 0, ouv = !!ouverts[p.d.id];
      var g = el('g', { class: 'item', tabindex: '0', role: 'button' });
      g.appendChild(el('rect', { x: p.x, y: p.y, width: BW, height: H, rx: 7, class: ens ? 'b-ens' : 'b-suj' }));
      var dx = ens ? 30 : 12;
      var t = el('text', { x: p.x + dx, y: p.y + 24, class: ens ? 'n-ens' : 'n-suj' });
      var lb = p.d.label; if (lb.length > 17) lb = lb.slice(0, 16) + '\u2026';
      t.textContent = lb; g.appendChild(t);
      marqueInterne(g, p.x, p.y, BW, H, sousQuestions[p.d.id], noeudCreux);
      marqueBord(g, p.x, p.y, BW, H, questions[p.d.id]);
      var act = function () { onSel(p.d, ens ? 'ens' : 'suj'); };
      g.addEventListener('click', act);
      g.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); act(); }
      });
      svg.appendChild(g);

      if (ens && p.d.enfants && p.d.enfants.length) {
        var ch = el('g', { class: 'chev', tabindex: '0', role: 'button' });
        ch.setAttribute('aria-label', (ouv ? 'Replier ' : 'Déplier ') + p.d.label);
        ch.appendChild(el('rect', { x: p.x + 1, y: p.y + 1, width: 28, height: H - 2, rx: 5 }));
        var ct = el('text', { x: p.x + 15, y: p.y + H / 2, class: 'chevron', 'text-anchor': 'middle', 'dominant-baseline': 'central' });
        ct.textContent = ouv ? '\u25be' : '\u25b8'; ch.appendChild(ct);
        var bas2 = function (e) { e.stopPropagation(); onOuvrir(p.d); };
        ch.addEventListener('click', bas2);
        ch.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOuvrir(p.d); }
        });
        svg.appendChild(ch);
      }

      var y = p.y + H;
      if (ouv && p.d.enfants) {
        y += 12;
        p.d.enfants.forEach(function (en) {
          svg.appendChild(el('path', { class: 'lien',
            d: 'M' + (p.x + 14) + ' ' + (p.y + H) + ' V' + (y + H / 2) + ' H' + (p.x + 22) }));
          var ge = el('g', { class: 'item', tabindex: '0', role: 'button' });
          ge.appendChild(el('rect', { x: p.x + 22, y: y, width: SW, height: H, rx: 7, class: 'b-suj' }));
          var te = el('text', { x: p.x + 34, y: y + 24, class: 'n-suj' });
          var l2 = en.label; if (l2.length > 18) l2 = l2.slice(0, 17) + '\u2026';
          te.textContent = l2; ge.appendChild(te);
          marqueBord(ge, p.x + 22, y, SW, H, questions[en.id]);
          var ae = function () { onSel(en, 'suj'); };
          ge.addEventListener('click', ae);
          ge.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); ae(); }
          });
          svg.appendChild(ge);
          y += RS;
        });
      }
      bas = Math.max(bas, y);
    });

    // Une marge dans la zone de dessin : sans elle, les bordures des boites
    // d'extremite tombent pile sur le bord et se font rogner.
    svg.setAttribute('viewBox', -PAD + ' ' + -PAD + ' ' + (W + 2 * PAD) + ' ' + (bas + 12 + 2 * PAD));
    svg.setAttribute('width', W + 2 * PAD); svg.setAttribute('height', bas + 12 + 2 * PAD);
  }
  return { dessine: dessine };
})();
