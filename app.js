(function () {
  'use strict';
  var A = window.SifreAnaliz;
  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.documentElement.classList.add('js');

  // --- Şifre testi ---
  var input = $('#pw');
  var result = $('#result');
  var meter = $('#meter');
  var C = 2 * Math.PI * 52;
  var ICONS = ['😱', '😟', '😐', '🙂', '🛡️'];
  var lastLevel = null;
  meter.style.strokeDasharray = C;
  meter.style.strokeDashoffset = C;

  function li(text) {
    var el = document.createElement('li');
    el.textContent = text;
    return el;
  }

  function render() {
    var r = A.analyze(input.value);
    var tips = $('#tips');
    result.dataset.level = r ? r.level : 'empty';
    $$('#checks li').forEach(function (el) {
      el.classList.remove('ok', 'no');
      if (r) el.classList.add(r.checks[el.dataset.check] ? 'ok' : 'no');
    });
    tips.replaceChildren();

    if (!r) {
      meter.style.strokeDashoffset = C;
      $('#lvl-icon').textContent = '✍️';
      $('#lvl-name').textContent = 'Bekliyor';
      $('#time').textContent = 'Bir şifre yaz ve sonucu gör.';
      $('#compare').textContent = '';
      $('#stats').textContent = '';
      $('#live').textContent = '';
      tips.append(li('Şifreni yazdıkça burada sana özel ipuçları çıkacak.'));
      lastLevel = null;
      return;
    }

    var kinds = ['lower', 'upper', 'digit', 'symbol'].filter(function (k) { return r.has[k]; }).length;
    meter.style.strokeDashoffset = C * (1 - Math.max(0.05, Math.min(r.bits / 100, 1)));
    $('#lvl-icon').textContent = ICONS[r.level];
    $('#lvl-name').textContent = A.LEVELS[r.level];
    $('#time').textContent = A.formatTime(r.seconds);
    $('#compare').textContent = A.compare(r.seconds);
    $('#stats').textContent = r.length + ' karakter · ' + kinds + '/4 karakter türü';
    A.tips(r).forEach(function (t) { tips.append(li(t)); });
    if (r.level !== lastLevel) {
      // Ekran okuyucuya her tuşta değil, yalnızca seviye değişince haber ver.
      $('#live').textContent = 'Şifre gücü: ' + A.LEVELS[r.level] + '. Tahmini süre: ' + A.formatTime(r.seconds) + '.';
      lastLevel = r.level;
    }
  }

  input.addEventListener('input', render);

  $('#toggle').addEventListener('click', function () {
    var show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    this.textContent = show ? 'Gizle' : 'Göster';
    this.setAttribute('aria-pressed', String(show));
  });

  // Örnek kartlarındaki "Test et" düğmeleri
  $$('[data-try]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      input.value = btn.dataset.try;
      render();
      $('.tester').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
      input.focus({ preventScroll: true });
    });
  });

  // --- Doğru mu, yanlış mı? kartları ---
  $$('.flip').forEach(function (card) {
    card.addEventListener('click', function () {
      var on = card.classList.toggle('flipped');
      card.setAttribute('aria-pressed', String(on));
      card.querySelector('.front').setAttribute('aria-hidden', String(on));
      card.querySelector('.back').setAttribute('aria-hidden', String(!on));
    });
  });

  // --- Haftanın görevi (ilerleme bu cihazda saklanır) ---
  var KEY = 'sifrekalesi-gorev';
  var saved = [];
  try { saved = JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { /* gizli sekme vb. */ }
  var boxes = $$('[data-task]');
  function updateTasks() {
    var state = boxes.map(function (b) { return b.checked; });
    var done = state.filter(Boolean).length;
    $('#progress').style.width = (done / boxes.length * 100) + '%';
    $('#done').hidden = done !== boxes.length;
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* kaydedilemezse sorun değil */ }
  }
  boxes.forEach(function (b, i) {
    b.checked = !!saved[i];
    b.addEventListener('change', updateTasks);
  });
  updateTasks();

  // --- Kaydırınca beliren kartlar ve sayaç ---
  function countUp(el) {
    var target = Number(el.dataset.count);
    var t0 = performance.now();
    (function step(t) {
      var p = Math.min((t - t0) / 1600, 1);
      el.textContent = Math.floor(target * (1 - Math.pow(1 - p, 3))).toLocaleString('tr-TR');
      if (p < 1) requestAnimationFrame(step);
    })(t0);
  }
  var targets = $$('.reveal, [data-count]');
  if (reduceMotion || !('IntersectionObserver' in window)) {
    targets.forEach(function (el) { el.classList.add('in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('in');
        if (e.target.dataset.count) countUp(e.target);
        io.unobserve(e.target);
      });
    }, { threshold: 0.15 });
    targets.forEach(function (el) { io.observe(el); });
  }

  render();
})();
