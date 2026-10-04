/* LaafStyl Shuttle: hero video loader + route-map animation + mobile-nav a11y.
   Everything here is presentation only. The fare calculator and booking code
   live untouched in index.html. */
(function () {
  'use strict';

  var motionOK = window.matchMedia('(prefers-reduced-motion: no-preference)');

  /* ---------- mobile nav: aria-expanded + Escape ---------- */
  var ham = document.getElementById('navHam');
  var mob = document.getElementById('navMob');
  if (ham && mob) {
    var sync = function () {
      ham.setAttribute('aria-expanded', mob.classList.contains('open') ? 'true' : 'false');
    };
    sync();
    new MutationObserver(sync).observe(mob, { attributes: true, attributeFilter: ['class'] });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && mob.classList.contains('open')) {
        window.toggleMobNav();
        ham.focus();
      }
    });
  }

  /* ---------- hero video: lazy, only with motion allowed, paused off-screen ---------- */
  var vid = document.getElementById('heroVid');
  var conn = navigator.connection || {};
  var vidWanted = function () { return motionOK.matches && !conn.saveData; };
  var vidVisible = true;
  function vidSync() {
    if (!vid) return;
    if (vidWanted() && vidVisible && !document.hidden) {
      if (!vid.getAttribute('src')) vid.src = vid.getAttribute('data-src');
      var p = vid.play();
      if (p && p.catch) p.catch(function () {});
    } else if (vid.getAttribute('src')) {
      vid.pause();
    }
  }
  if (vid && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (en) {
      vidVisible = en[0].isIntersecting;
      vidSync();
    }, { threshold: 0.05 }).observe(vid);
  }
  document.addEventListener('visibilitychange', vidSync);
  if (motionOK.addEventListener) motionOK.addEventListener('change', vidSync);
  vidSync();

  /* ---------- route map ---------- */
  var svg = document.getElementById('routeMap');
  if (!svg) return;
  var route = svg.querySelector('#routePath');
  var glow = svg.querySelector('#routeGlow');
  var van = svg.querySelector('#van');
  var flip = van.querySelector('.van-flip');
  var towns = [].slice.call(svg.querySelectorAll('.town'));
  var total = route.getTotalLength();

  // path-length position of each town = nearest sampled point on the route
  var samples = 240, pts = [];
  for (var i = 0; i <= samples; i++) {
    var l = (total * i) / samples, q = route.getPointAtLength(l);
    pts.push([l, q.x, q.y]);
  }
  towns.forEach(function (t) {
    var c = t.querySelector('circle');
    var cx = +c.getAttribute('cx'), cy = +c.getAttribute('cy'), best = 1e9, at = 0;
    pts.forEach(function (p) {
      var d = (p[1] - cx) * (p[1] - cx) + (p[2] - cy) * (p[2] - cy);
      if (d < best) { best = d; at = p[0]; }
    });
    t._at = at;
  });
  var parkAt = svg.querySelector('[data-town="Langebaan"]')._at;

  function place(len) {
    var p = route.getPointAtLength(len);
    var q = route.getPointAtLength(Math.min(total, len + 2));
    van.setAttribute('transform', 'translate(' + p.x.toFixed(1) + ' ' + p.y.toFixed(1) + ')');
    var dx = q.x - p.x;
    if (Math.abs(dx) > 0.05) flip.setAttribute('transform', dx < 0 ? 'scale(-1 1)' : 'scale(1 1)');
  }
  function drawTo(len) {
    var v = Math.max(0, len);
    [route, glow].forEach(function (el) {
      el.style.strokeDasharray = total;
      el.style.strokeDashoffset = total - v;
    });
    towns.forEach(function (t) { t.classList.toggle('on', v >= t._at - 2); });
  }
  function ease(u) { return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; }

  function showStatic() {
    [route, glow].forEach(function (el) {
      el.style.strokeDasharray = 'none';
      el.style.strokeDashoffset = '0';
    });
    towns.forEach(function (t) { t.classList.add('on'); });
    van.classList.add('on');
    place(parkAt);
  }

  var DRAW = 4200, DWELL = 1600, TRAVEL = 11000;
  var CYCLE = DWELL + TRAVEL + DWELL + TRAVEL;
  var elapsed = 0, last = 0, raf = 0, mapVisible = false;

  function frame(now) {
    raf = 0;
    if (!motionOK.matches) { showStatic(); return; }
    if (!mapVisible || document.hidden) { last = 0; return; }
    var dt = last ? Math.min(now - last, 100) : 0;
    last = now;
    elapsed += dt;
    if (elapsed < DRAW) {
      var len = total * ease(elapsed / DRAW);
      drawTo(len);
      place(len);
    } else {
      drawTo(total);
      var c = (elapsed - DRAW) % CYCLE, pos;
      if (c < DWELL) pos = total;
      else if (c < DWELL + TRAVEL) pos = total * (1 - ease((c - DWELL) / TRAVEL));
      else if (c < 2 * DWELL + TRAVEL) pos = 0;
      else pos = total * ease((c - 2 * DWELL - TRAVEL) / TRAVEL);
      place(pos);
    }
    raf = requestAnimationFrame(frame);
  }
  function kick() { if (!raf) raf = requestAnimationFrame(frame); }

  if (!motionOK.matches) {
    showStatic();
  } else {
    drawTo(0);
    place(0);
    van.classList.add('on');
  }
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (en) {
      mapVisible = en[0].isIntersecting;
      if (mapVisible) kick();
    }, { threshold: 0.25 }).observe(svg);
  } else {
    mapVisible = true;
    kick();
  }
  document.addEventListener('visibilitychange', function () { last = 0; kick(); });
  if (motionOK.addEventListener) motionOK.addEventListener('change', function () { last = 0; if (motionOK.matches) { elapsed = 0; drawTo(0); } kick(); });
})();
