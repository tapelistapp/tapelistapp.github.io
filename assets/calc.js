/* TapeList web calculators. The rules and numbers are the app's own (docs-r75 data/norms.yaml, data/packages.yaml):
   paint coverage 9.2 m2/L per coat, primer 8.6 m2/L, +10% for loss; cans of 0.887 L (quart), 3.66 L (gallon), 18 L (pail),
   packed for the least paint left over; drywall: openings count half, waste 10%, 1 screw per ft2 (ceiling x1.3),
   238 screws per lb, joint compound 0.45 L per m2 of board. */
(function (root) {
  'use strict';
  var FT = 0.3048, FT2 = FT * FT;
  var N = {
    paintCov: 9.2, primerCov: 8.6, margin: 0.10,
    qt: 0.887, gal: 3.66, pail: 18.0, maxQt: 1, maxGal: 3,
    dwWaste: 0.10, dwOpenShare: 0.5, screwsPerFt2: 1, ceilScrew: 1.3, screwsPerLb: 238,
    mudRate: 0.45, mudBig: 17, mudSmall: 2, mudSmallMax: 2,
    door: { w: 32, h: 80 }, window: { w: 36, h: 48 }
  };

  /* "12' 6\"", "12'6", "12 6", "12.5", "12 6 1/2", "4 3/16" (inches only when the unit is in) */
  function parseLength(text, metric) {
    if (text == null) return NaN;
    var s = String(text).trim().replace(/[’′]/g, "'").replace(/[”″]/g, '"').replace(',', '.');
    if (!s) return NaN;
    if (metric) { var m = parseFloat(s); return /^\d*\.?\d+\s*(m)?$/.test(s) ? m : NaN; }
    var re = /^(\d+(?:\.\d+)?)\s*(?:'|ft)?\s*(?:(\d+(?:\.\d+)?)?\s*(?:(\d+)\s*\/\s*(\d+))?\s*(?:"|in)?)?$/;
    var r = s.match(re);
    if (!r) return NaN;
    var feet = parseFloat(r[1]);
    var inch = r[2] ? parseFloat(r[2]) : 0;
    if (r[3] && r[4]) { var d = parseFloat(r[4]); if (!d) return NaN; inch += parseFloat(r[3]) / d; }
    if (!/'|ft/.test(s) && !r[2] && !r[3] && /\./.test(r[1])) return feet; /* 12.5 = 12.5 ft */
    if (inch >= 12) return NaN;
    return feet + inch / 12;
  }

  /* least paint left over; ties: fewer cans, then fewer pails, then fewer gallons (N-PACK-PAINT) */
  function packPaint(needL, maxQt) {
    if (!(needL > 0)) return { qt: 0, gal: 0, pail: 0, total: 0 };
    var best = null, eps = 1e-9;
    for (var q = 0; q <= maxQt; q++) {
      for (var g = 0; g <= N.maxGal; g++) {
        var rest = needL - q * N.qt - g * N.gal;
        var p = rest > eps ? Math.ceil((rest - eps) / N.pail) : 0;
        var total = q * N.qt + g * N.gal + p * N.pail;
        var c = { qt: q, gal: g, pail: p, total: total, left: total - needL, n: q + g + p };
        if (!best || c.left < best.left - eps ||
            (Math.abs(c.left - best.left) <= eps && (c.n < best.n || (c.n === best.n && (c.pail < best.pail || (c.pail === best.pail && c.gal < best.gal)))))) best = c;
      }
    }
    return best;
  }

  /* least left over among packages of one product; small packages capped (N-PACK-GENERAL) */
  function packTwo(need, big, small, smallMax) {
    if (!(need > 0)) return { big: 0, small: 0 };
    var best = null, eps = 1e-9;
    for (var s = 0; s <= smallMax; s++) {
      var rest = need - s * small;
      var b = rest > eps ? Math.ceil((rest - eps) / big) : 0;
      var total = b * big + s * small, c = { big: b, small: s, left: total - need, n: b + s };
      if (!best || c.left < best.left - eps || (Math.abs(c.left - best.left) <= eps && c.n < best.n)) best = c;
    }
    return best;
  }

  function cansText(p) {
    var out = [];
    if (p.pail) out.push(p.pail + (p.pail === 1 ? ' pail (5 gal)' : ' pails (5 gal)'));
    if (p.gal) out.push(p.gal + (p.gal === 1 ? ' gallon' : ' gallons'));
    if (p.qt) out.push(p.qt + (p.qt === 1 ? ' quart' : ' quarts'));
    return out.join(' + ') || 'none';
  }

  function paint(o) {
    /* o: lengthFt, widthFt, heightFt, doors, windows, coats, ceiling, primer */
    var perim = 2 * (o.lengthFt + o.widthFt);
    var gross = perim * o.heightFt;
    var openings = o.doors * N.door.w * N.door.h / 144 + o.windows * N.window.w * N.window.h / 144;
    var walls = Math.max(0, gross - openings);
    var ceil = o.lengthFt * o.widthFt;
    var wallsL = walls * FT2 * o.coats / N.paintCov * (1 + N.margin);
    var ceilL = o.ceiling ? ceil * FT2 * o.coats / N.paintCov * (1 + N.margin) : 0;
    var primerArea = o.primer ? walls + (o.ceiling ? ceil : 0) : 0;
    var primerL = primerArea * FT2 / N.primerCov * (1 + N.margin);
    return {
      perim: perim, gross: gross, openings: openings, walls: walls, ceil: ceil,
      wallsL: wallsL, wallsPack: packPaint(wallsL, N.maxQt),
      ceilL: ceilL, ceilPack: packPaint(ceilL, N.maxQt),
      primerL: primerL, primerPack: packPaint(primerL, 0)
    };
  }

  function wallSheet(heightFt) {
    var hIn = heightFt * 12, tol = 1.5;
    if (hIn <= 96 + tol) return { name: '4 x 8 ft', ft2: 32, note: 'hung horizontally' };
    if (hIn <= 108 + tol) return { name: '54 in x 12 ft', ft2: 54, note: 'hung horizontally' };
    if (hIn <= 120 + tol) return { name: '4 x 10 ft', ft2: 40, note: 'hung vertically' };
    return { name: '4 x 12 ft', ft2: 48, note: 'walls over 10 ft: check what your store has' };
  }

  function drywall(o) {
    /* o: lengthFt, widthFt, heightFt, doors, windows, ceiling, waste */
    var perim = 2 * (o.lengthFt + o.widthFt);
    var gross = perim * o.heightFt;
    var openings = o.doors * N.door.w * N.door.h / 144 + o.windows * N.window.w * N.window.h / 144;
    var walls = Math.max(0, gross - N.dwOpenShare * openings);
    var ceil = o.ceiling ? o.lengthFt * o.widthFt : 0;
    var sheet = wallSheet(o.heightFt);
    var wallSheetsExact = walls * (1 + o.waste) / sheet.ft2;
    var ceilSheetsExact = ceil * (1 + o.waste) / 32;
    var screws = Math.ceil(walls * N.screwsPerFt2 + ceil * N.screwsPerFt2 * N.ceilScrew - 1e-9);
    var lb = screws / N.screwsPerLb;
    var screwPack = packTwo(lb, 5, 1, 1);
    var mudL = (walls + ceil) * FT2 * N.mudRate;
    var mudPack = packTwo(mudL, N.mudBig, N.mudSmall, N.mudSmallMax);
    return {
      perim: perim, gross: gross, openings: openings, walls: walls, ceil: ceil, sheet: sheet,
      wallSheetsExact: wallSheetsExact, wallSheets: Math.ceil(wallSheetsExact - 1e-9),
      ceilSheetsExact: ceilSheetsExact, ceilSheets: Math.ceil(ceilSheetsExact - 1e-9),
      screws: screws, lb: lb, screwPack: screwPack, mudL: mudL, mudPack: mudPack
    };
  }

  var api = { N: N, parseLength: parseLength, packPaint: packPaint, packTwo: packTwo, cansText: cansText,
              paint: paint, drywall: drywall, wallSheet: wallSheet, FT: FT, FT2: FT2 };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.TapeCalc = api;
})(this);
