/* Shared form handling for the TapeList web calculators. */
(function () {
  'use strict';
  var C = window.TapeCalc;
  var metric = false;

  function $(id) { return document.getElementById(id); }
  function fmt(x, d) { return (Math.round(x * Math.pow(10, d)) / Math.pow(10, d)).toLocaleString('en-US', { maximumFractionDigits: d }); }
  function area(ft2) { return metric ? fmt(ft2 * C.FT2, 1) + ' m²' : fmt(ft2, 0) + ' sq ft'; }
  function vol(L) { return metric ? fmt(L, 1) + ' L' : fmt(L, 1) + ' L (' + fmt(L / 3.785411784, 2) + ' US gal)'; }
  function litres(L) { return fmt(L, 1) + ' L'; }

  function readLen(id) {
    var el = $(id), v = C.parseLength(el.value, metric);
    var ok = isFinite(v) && v > 0 && v < (metric ? 100 : 330);
    el.classList.toggle('bad', !ok && el.value.trim() !== '');
    return ok ? (metric ? v / C.FT : v) : NaN;
  }
  function readInt(id, min, max) {
    var v = parseInt($(id).value, 10);
    return isFinite(v) ? Math.min(max, Math.max(min, v)) : min;
  }

  function setUnits(m) {
    metric = m;
    $('u-ft').setAttribute('aria-pressed', String(!m));
    $('u-m').setAttribute('aria-pressed', String(m));
    var ph = m ? ['4.2', '3.6', '2.44'] : ["14'", "12'", "8'"];
    ['len', 'wid', 'hgt'].forEach(function (id, i) { $(id).placeholder = ph[i]; $(id).value = ''; });
    document.querySelectorAll('.unit-hint').forEach(function (e) {
      e.textContent = m ? 'metres, e.g. 3.6' : "feet and inches, e.g. 12' 6\" or 12.5";
    });
    run();
  }

  function li(what, sub, qty) {
    return '<li><span class="what">' + what + (sub ? '<small>' + sub + '</small>' : '') + '</span><span class="qty">' + qty + '</span></li>';
  }

  function runPaint() {
    var L = readLen('len'), W = readLen('wid'), H = readLen('hgt');
    var out = $('out');
    if (!(L > 0 && W > 0 && H > 0)) { out.innerHTML = '<p class="why">Enter the length, width and wall height of the room.</p>'; return; }
    var r = C.paint({ lengthFt: L, widthFt: W, heightFt: H, doors: readInt('doors', 0, 20), windows: readInt('windows', 0, 30),
      coats: readInt('coats', 1, 4), ceiling: $('ceil').checked, primer: $('primer').checked });
    var coats = readInt('coats', 1, 4);
    var html = '<h3>What to buy</h3><ul class="buy">';
    html += li('Wall paint', area(r.walls) + ' of wall, ' + coats + (coats === 1 ? ' coat' : ' coats') + ', needs ' + vol(r.wallsL), C.cansText(r.wallsPack));
    if ($('ceil').checked) html += li('Ceiling paint', area(r.ceil) + ' of ceiling, ' + coats + (coats === 1 ? ' coat' : ' coats') + ', needs ' + vol(r.ceilL), C.cansText(r.ceilPack));
    if ($('primer').checked) html += li('Primer', 'one coat, needs ' + vol(r.primerL), C.cansText(r.primerPack));
    html += '</ul>';
    html += '<p class="why"><b>Why this amount?</b> Walls: perimeter ' + (metric ? fmt(r.perim * C.FT, 2) + ' m' : fmt(r.perim, 1) + ' ft') +
      ' × height = ' + area(r.gross) + ', minus doors and windows ' + area(r.openings) + ' = ' + area(r.walls) +
      '. Paint covers about 375 sq ft per gallon per coat (9.2 m² per litre, the average of popular paint labels), plus 10% for loss and cutting in. ' +
      'Cans are chosen to leave the least paint over: a quart is at least 0.887 L, a gallon 3.66 L, a 5-gallon pail 18 L.</p>';
    html += '<div class="promo"><p>Rooms with closets, an accent wall, drywall, baseboard and trim, and the whole house in one shopping list: that is what the app does, free and without ads.</p>' +
      '<a class="btn" href="' + window.PLAY_URL + '">Get TapeList on Google Play</a></div>';
    out.innerHTML = html;
  }

  function runDrywall() {
    var L = readLen('len'), W = readLen('wid'), H = readLen('hgt');
    var out = $('out');
    if (!(L > 0 && W > 0 && H > 0)) { out.innerHTML = '<p class="why">Enter the length, width and wall height of the room.</p>'; return; }
    var waste = parseFloat($('waste').value) / 100;
    var r = C.drywall({ lengthFt: L, widthFt: W, heightFt: H, doors: readInt('doors', 0, 20), windows: readInt('windows', 0, 30),
      ceiling: $('ceil').checked, waste: waste });
    var html = '<h3>What to buy</h3><ul class="buy">';
    html += li('Wall drywall, ' + r.sheet.name + ' sheets', '1/2 in, ' + r.sheet.note + ', ' + area(r.walls) + ' of wall', r.wallSheets + ' sheets');
    if ($('ceil').checked) html += li('Ceiling drywall, 4 x 8 ft sheets', '1/2 in sag-resistant ceiling board, ' + area(r.ceil), r.ceilSheets + ' sheets');
    var sp = r.screwPack, st = [];
    if (sp.big) st.push(sp.big + ' × 5 lb'); if (sp.small) st.push(sp.small + ' × 1 lb');
    html += li('Drywall screws, 1-1/4 in coarse', 'about ' + r.screws + ' screws', st.join(' + '));
    var mp = r.mudPack, mt = [];
    if (mp.big) mt.push(mp.big + ' × 17 L pail'); if (mp.small) mt.push(mp.small + ' × 2 L');
    html += li('Joint compound, premixed', 'needs ' + litres(r.mudL), mt.join(' + '));
    html += '</ul>';
    html += '<p class="why"><b>Why this amount?</b> Walls: perimeter × height = ' + area(r.gross) + ', minus half of the doors and windows (' + area(r.openings / 2) +
      '): the cut-outs rarely come back as usable pieces. Plus ' + Math.round(waste * 100) + '% for waste, then divided by the sheet: ' +
      fmt(r.wallSheetsExact, 2) + ' → ' + r.wallSheets + ' sheets. Screws: one per sq ft of board, 30% more on the ceiling, about 238 to a pound. ' +
      'Compound: about 0.45 L per m² of board for tape, two coats and loss.</p>';
    html += '<div class="promo"><p>The app adds the joint tape, corner bead, primer, paint and baseboard for the same room, and every line shows how it was counted. Free, no ads.</p>' +
      '<a class="btn" href="' + window.PLAY_URL + '">Get TapeList on Google Play</a></div>';
    out.innerHTML = html;
  }

  var run = function () { (window.CALC === 'drywall' ? runDrywall : runPaint)(); };
  document.addEventListener('DOMContentLoaded', function () {
    $('u-ft').addEventListener('click', function () { setUnits(false); });
    $('u-m').addEventListener('click', function () { setUnits(true); });
    document.querySelectorAll('#form input, #form select').forEach(function (el) {
      el.addEventListener('input', run); el.addEventListener('change', run);
    });
    run();
  });
})();
