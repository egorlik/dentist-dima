/* =========================================================
   script.js — вся логика страницы
   1) НАСТРОЙКИ   2) Вспомогательное   3) Telegram-запись
   4) Фото: заглушки и просмотр на весь экран   5) Слайдеры до/после
   6) Меню и FAQ  7) Анимации Anime.js
   ========================================================= */
(function () {
  'use strict';

  /* ---------------------------------------------------------
     1. НАСТРОЙКИ — заполните перед запуском
     --------------------------------------------------------- */
  var CONFIG = {
    TG_USERNAME: 'alphapnl' // ник врача в Telegram БЕЗ значка @, например: dr_ivanov
  };

  /* ---------------------------------------------------------
     2. ВСПОМОГАТЕЛЬНОЕ
     --------------------------------------------------------- */
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var canAnimate = typeof window.anime === 'function' && !reduceMotion;

  /* ---------------------------------------------------------
     3. TELEGRAM-ЗАПИСЬ
     Ссылка вида https://t.me/ник?text=... открывает чат с врачом
     и подставляет готовое сообщение. Токены и сервер не нужны.
     --------------------------------------------------------- */
  function tgLink(text) {
    var base = 'https://t.me/' + CONFIG.TG_USERNAME;
    return text ? base + '?text=' + encodeURIComponent(text) : base;
  }

  function initTelegramLinks() {
    $$('[data-tg]').forEach(function (a) {
      a.href = tgLink();
      a.target = '_blank';
      a.rel = 'noopener';
    });
  }

  function initBooking() {
    var preview = $('#msgPreview');
    var link = $('#tgBook');
    var nameInput = $('#f-name');
    if (!preview || !link) return;

    function checked(name) {
      var el = $('input[name="' + name + '"]:checked');
      return el ? el.value : '';
    }
    function build() {
      var lines = [
        '👋 Здравствуйте! Хочу записаться на прием.',
        '🦷 Услуга: ' + checked('proc'),
        '🕘 Удобное время: ' + checked('day') + ', ' + checked('part')
      ];
      var name = nameInput.value.trim();
      if (name) lines.push('Меня зовут: ' + name);
      var text = lines.join('\n');
      preview.textContent = text;
      link.href = tgLink(text);
    }

    $$('#booking input[type="radio"]').forEach(function (i) { i.addEventListener('change', build); });
    nameInput.addEventListener('input', build);

    // Кнопки «Записаться на эту услугу» в блоке услуг заранее выбирают услугу
    $$('[data-pick]').forEach(function (a) {
      a.addEventListener('click', function () {
        var radio = $$('input[name="proc"]').filter(function (i) { return i.value === a.dataset.pick; })[0];
        if (radio) { radio.checked = true; build(); }
      });
    });
    build();
  }

  /* ---------------------------------------------------------
     4. ФОТО: ЗАГЛУШКИ И ПРОСМОТР НА ВЕСЬ ЭКРАН
     --------------------------------------------------------- */
  /* Заглушка, если файла нет: показывает, как должен называться файл и в какой он папке */
  function svgPlaceholder(label, w, h, isBefore) {
    var c1 = isBefore ? '#e2e8f0' : '#dbeafe', c2 = isBefore ? '#cbd5e1' : '#bfdbfe';
    var ink = isBefore ? '#475569' : '#1e40af', line = isBefore ? '#64748b' : '#2563eb';
    var svg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '">' +
      '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + c1 + '"/><stop offset="1" stop-color="' + c2 + '"/></linearGradient></defs>' +
      '<rect width="100%" height="100%" fill="url(#g)"/>' +
      '<g fill="none" stroke="' + line + '" stroke-width="3" stroke-linecap="round" opacity=".55"><circle cx="' + w / 2 + '" cy="' + (h / 2 - 14) + '" r="26"/><path d="M' + (w / 2 - 52) + ' ' + (h / 2 + 56) + 'q52 -64 104 0"/></g>' +
      '<text x="50%" y="' + (h - 26) + '" text-anchor="middle" font-family="sans-serif" font-size="16" fill="' + ink + '" opacity=".85">' + label + '</text></svg>';
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  function initImageFallbacks() {
    function apply(img) {
      if (img.dataset.failed) return;
      img.dataset.failed = '1';
      var src = img.getAttribute('src') || '';
      var label = src.split('/').slice(-3).join('/');      // например: images/cases/case-1-after.jpg
      var tall = /\/(doctor|diplomas)\//.test(src);
      img.src = svgPlaceholder(label, tall ? 600 : 800, tall ? 800 : 600, /-before\./.test(src));
    }
    $$('img').forEach(function (img) {
      if (img.id === 'lbImg') return;
      img.addEventListener('error', function () { apply(img); });
      // ошибка могла произойти до того, как скрипт навесил обработчик
      if (img.complete && img.naturalWidth === 0 && img.getAttribute('src')) apply(img);
    });
  }

  function initLightbox() {
    var box = $('#lightbox'), big = $('#lbImg'), count = $('#lbCount');
    var prev = $('#lbPrev'), next = $('#lbNext'), closeBtn = $('#lbClose');
    var group = [], index = 0, opener = null;

    function show(i) {
      index = (i + group.length) % group.length;
      var src = group[index];
      big.classList.add('swap');
      setTimeout(function () {
        big.src = src.currentSrc || src.src;
        big.alt = src.alt;
        big.classList.remove('swap');
      }, 120);
      count.textContent = (index + 1) + ' / ' + group.length;
    }
    function open(img) {
      opener = img;
      group = $$('img[data-zoom="' + img.dataset.zoom + '"]');
      var many = group.length > 1;
      prev.style.display = next.style.display = many ? 'grid' : 'none';
      count.style.display = many ? 'block' : 'none';
      big.src = img.currentSrc || img.src;
      big.alt = img.alt;
      index = group.indexOf(img);
      count.textContent = (index + 1) + ' / ' + group.length;
      box.classList.add('open');
      box.setAttribute('aria-hidden', 'false');
      document.body.classList.add('lb-lock');
      closeBtn.focus();
    }
    function close() {
      box.classList.remove('open');
      box.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('lb-lock');
      if (opener) opener.focus();
    }

    $$('img[data-zoom]').forEach(function (img) {
      img.addEventListener('click', function () { open(img); });
      img.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(img); }
      });
    });

    closeBtn.addEventListener('click', close);
    prev.addEventListener('click', function (e) { e.stopPropagation(); show(index - 1); });
    next.addEventListener('click', function (e) { e.stopPropagation(); show(index + 1); });
    box.addEventListener('click', function (e) { if (e.target === box) close(); });
    big.addEventListener('click', close);

    document.addEventListener('keydown', function (e) {
      if (!box.classList.contains('open')) return;
      if (e.key === 'Escape') close();
      else if (group.length > 1 && e.key === 'ArrowLeft') show(index - 1);
      else if (group.length > 1 && e.key === 'ArrowRight') show(index + 1);
    });

    // свайп на телефоне
    var x0 = null;
    box.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    box.addEventListener('touchend', function (e) {
      if (x0 === null || group.length < 2) return;
      var dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 50) show(index + (dx < 0 ? 1 : -1));
      x0 = null;
    });

    // кнопки «развернуть» на слайдерах до/после открывают фото «после»
    $$('.ba__expand').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var after = $('.ba__after', btn.closest('.ba'));
        if (after) after.click();
      });
    });
  }

  /* ---------------------------------------------------------
     5. СЛАЙДЕРЫ «ДО / ПОСЛЕ»
     --------------------------------------------------------- */
  function initCompareSliders() {
    $$('.ba').forEach(function (ba) {
      var range = $('.ba__range', ba);
      function set(v) { ba.style.setProperty('--pos', v + '%'); }
      range.addEventListener('input', function () { set(range.value); });
    });
  }

  /* ---------------------------------------------------------
     6. МЕНЮ И FAQ
     --------------------------------------------------------- */
  function initMenu() {
    var burger = $('#burger'), nav = $('#mobileNav');
    if (!burger || !nav) return;
    burger.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    $$('a', nav).forEach(function (a) {
      a.addEventListener('click', function () {
        nav.classList.remove('open');
        burger.setAttribute('aria-expanded', 'false');
      });
    });
  }

  function initFaq() {
    var items = $$('.faq');
    items.forEach(function (d) {
      d.addEventListener('toggle', function () {
        if (!d.open) return;
        items.forEach(function (o) { if (o !== d) o.open = false; }); // открыт только один вопрос
        if (canAnimate) {
          window.anime({
            targets: $('.faq__body', d),
            opacity: [0, 1], translateY: [-8, 0],
            duration: 400, easing: 'easeOutCubic'
          });
        }
      });
    });
  }

  /* ---------------------------------------------------------
     7. АНИМАЦИИ (Anime.js)
     --------------------------------------------------------- */
  function clearTransform(anim) {
    anim.animatables.forEach(function (a) { a.target.style.transform = ''; });
  }

  /* 7.1 Счётчики (15 лет, 3000+): запускаются каждый раз, когда попадают в зону видимости */
  function countUp(el, delay) {
    var to = parseInt(el.dataset.count, 10);
    var suffix = el.dataset.suffix || '';
    var state = { v: 0 };
    if (el._count) el._count.pause();
    el.textContent = '0' + suffix;
    el._count = window.anime({
      targets: state, v: to, round: 1,
      duration: 1800, delay: delay || 0, easing: 'easeOutExpo',
      update: function () { el.textContent = state.v + suffix; }
    });
  }

  function restoreCounts() {
    $$('[data-count]').forEach(function (el) { el.textContent = el.dataset.count + (el.dataset.suffix || ''); });
  }

  function initCounters() {
    var els = $$('[data-count]');
    if (!('IntersectionObserver' in window)) { restoreCounts(); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var el = en.target;
        if (en.isIntersecting) {
          // плашки на первом экране появляются не сразу, поэтому ждём их
          countUp(el, el.closest('.badge-float') ? 900 : 150);
        } else {
          if (el._count) el._count.pause();
          el.textContent = '0' + (el.dataset.suffix || '');   // сброс, чтобы при возврате снова крутилось
        }
      });
    }, { threshold: 0.6 });
    els.forEach(function (el) { io.observe(el); });
  }

  /* 7.2 Блик, пробегающий по иконкам (эффект «эмали») */
  function sweepShine(shines, loop) {
    if (!shines.length) return;
    window.anime({
      targets: shines,
      translateX: ['-160%', '260%'],
      duration: 1100, easing: 'easeInOutQuad',
      delay: window.anime.stagger(170, { start: 600 }),
      loop: loop ? true : 1, endDelay: loop ? 3600 : 0
    });
  }

  /* 7.3 Появление блоков при скролле */
  function afterReveal(el) {
    // линия эмали под заголовком + бегущий блик по ней
    $$('.enamel-line', el).forEach(function (line) {
      window.anime({
        targets: line, scaleX: [0, 1], duration: 900, easing: 'easeOutCubic',
        complete: function () {
          window.anime({
            targets: $('i', line), translateX: ['-100%', '320%'],
            duration: 1400, easing: 'easeInOutSine', loop: true, endDelay: 2600
          });
        }
      });
    });

    // звёзды в отзывах
    var stars = $$('.stars svg', el);
    if (stars.length) {
      window.anime({
        targets: stars, opacity: [0, 1], scale: [0, 1], rotate: [-40, 0],
        duration: 650, easing: 'easeOutBack',
        delay: window.anime.stagger(80, { start: 300 })
      });
    }

    // иконки: блик (в блоке услуг — циклично) + искорки на зубе
    if (el.hasAttribute('data-shine')) {
      sweepShine($$('.shine', el), true);
      var sparks = $$('.spark', el);
      if (sparks.length) {
        window.anime({
          targets: sparks, opacity: [0, 1, 0], scale: [0, 1.2, 0], rotate: [0, 120],
          duration: 1600, easing: 'easeInOutSine',
          delay: window.anime.stagger(450, { start: 900 }),
          loop: true, endDelay: 1500
        });
      }
    } else {
      sweepShine($$('.icon-plate .shine', el), false);
    }

    // слайдеры до/после: короткая демонстрация, что их можно двигать
    $$('.ba', el).forEach(function (ba, i) {
      var range = $('.ba__range', ba);
      var state = { p: 50 };
      var demo = window.anime({
        targets: state, p: [50, 22, 78, 50],
        duration: 2000, delay: 500 + i * 250, easing: 'easeInOutSine',
        update: function () {
          ba.style.setProperty('--pos', state.p + '%');
          range.value = state.p;
        }
      });
      ['pointerdown', 'keydown'].forEach(function (ev) {
        range.addEventListener(ev, function () { demo.pause(); }, { once: true });
      });
    });
  }

  function reveal(el) {
    if (el.hasAttribute('data-stagger')) {
      window.anime({
        targets: Array.prototype.slice.call(el.children),
        opacity: [0, 1], translateY: [32, 0],
        duration: 800, easing: 'easeOutCubic',
        delay: window.anime.stagger(110),
        complete: clearTransform
      });
    } else {
      window.anime({
        targets: el, opacity: [0, 1], translateY: [28, 0],
        duration: 850, easing: 'easeOutCubic',
        complete: clearTransform
      });
    }
    afterReveal(el);
  }

  function initScrollReveal() {
    var targets = $$('[data-reveal], [data-stagger]');
    if (!('IntersectionObserver' in window)) {
      document.documentElement.classList.remove('anim');
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        io.unobserve(en.target);
        reveal(en.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    targets.forEach(function (t) { io.observe(t); });
  }

  /* 7.4 Первый экран */
  function initHeroIntro() {
    var a = window.anime;
    a.timeline({ easing: 'easeOutCubic' })
      .add({ targets: '[data-hero]', opacity: [0, 1], translateY: [24, 0], duration: 800, delay: a.stagger(120), complete: clearTransform })
      .add({ targets: '.hero-photo', opacity: [0, 1], translateY: [30, 0], scale: [0.95, 1], duration: 950, complete: clearTransform }, '-=900')
      .add({
        targets: '.badge-float', opacity: [0, 1], scale: [0.6, 1],
        duration: 650, delay: a.stagger(180), easing: 'easeOutBack',
        complete: function () {
          // лёгкое «парение» плашек
          a({ targets: '.badge-float', translateY: [0, -8], direction: 'alternate', loop: true, duration: 2400, easing: 'easeInOutSine', delay: a.stagger(500) });
        }
      }, '-=500');
  }

  /* 7.5 Кнопки: пульсация, притяжение к курсору, волна при клике */
  function initButtons() {
    var a = window.anime;

    // пульсирующее кольцо вокруг кнопок Telegram
    var rings = $$('.pulse-ring');
    if (rings.length) {
      a({
        targets: rings, opacity: [0.4, 0], scale: [1, 1.1],
        duration: 2600, easing: 'easeOutSine', loop: true, delay: a.stagger(500)
      });
    }

    // лёгкое притяжение к курсору: кнопка смещается всего на несколько пикселей
    if (finePointer) {
      var items = $$('[data-magnetic]').map(function (el) {
        return { el: el, shift: el.dataset.magnetic === 'strong' ? 7 : 5, pulled: false, x: 0, y: 0 };
      });
      var MARGIN = 24; // реагируем только в пределах кнопки и 24 px вокруг
      document.addEventListener('mousemove', function (e) {
        items.forEach(function (it) {
          var r = it.el.getBoundingClientRect();
          var inside = e.clientX >= r.left - MARGIN && e.clientX <= r.right + MARGIN &&
                       e.clientY >= r.top - MARGIN && e.clientY <= r.bottom + MARGIN;
          if (inside) {
            var nx = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (r.width / 2)));
            var ny = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / (r.height / 2)));
            var tx = nx * it.shift, ty = ny * it.shift * 0.7;
            if (Math.abs(tx - it.x) < 0.4 && Math.abs(ty - it.y) < 0.4) return;
            it.x = tx; it.y = ty; it.pulled = true;
            a.remove(it.el);
            a({ targets: it.el, translateX: tx, translateY: ty, duration: 450, easing: 'easeOutCubic' });
          } else if (it.pulled) {
            it.pulled = false; it.x = 0; it.y = 0;
            a.remove(it.el);
            a({ targets: it.el, translateX: 0, translateY: 0, duration: 700, easing: 'easeOutCubic' });
          }
        });
      }, { passive: true });
    }

    // волна при клике (сжатие кнопки делает CSS: .btn:active)
    document.addEventListener('pointerdown', function (e) {
      var btn = e.target.closest('.btn');
      if (!btn) return;
      var r = btn.getBoundingClientRect();
      var size = Math.max(r.width, r.height) * 2;
      var dot = document.createElement('span');
      dot.className = 'ripple';
      dot.style.cssText = 'width:' + size + 'px;height:' + size + 'px;left:' + (e.clientX - r.left - size / 2) + 'px;top:' + (e.clientY - r.top - size / 2) + 'px';
      btn.appendChild(dot);
      a({ targets: dot, scale: [0, 1], opacity: [0.55, 0], duration: 650, easing: 'easeOutQuad', complete: function () { dot.remove(); } });
    });
  }

  function initAnimations() {
    if (!canAnimate) return; // без anime.js или при «меньше анимации» всё просто показывается
    try {
      document.documentElement.classList.add('anim');
      $$('[data-count]').forEach(function (el) { el.textContent = '0' + (el.dataset.suffix || ''); });
      $$('.stars svg').forEach(function (s) { s.style.opacity = 0; });
      // каждой иконке добавляем блик, если его ещё нет
      $$('.icon-plate').forEach(function (p) {
        if (!$('.shine', p)) { var s = document.createElement('i'); s.className = 'shine'; p.insertBefore(s, p.firstChild); }
      });
      initHeroIntro();
      initScrollReveal();
      initCounters();
      initButtons();
    } catch (err) {
      console.error('Анимации отключены из-за ошибки:', err);
      document.documentElement.classList.remove('anim');
      restoreCounts();
    }
  }

  /* ---------------------------------------------------------
     ЗАПУСК
     --------------------------------------------------------- */
  initTelegramLinks();
  initBooking();
  initImageFallbacks();
  initLightbox();
  initCompareSliders();
  initMenu();
  initFaq();
  initAnimations();
})();
