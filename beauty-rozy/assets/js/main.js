/* Beauty ROZY — progressive enhancement. Every page renders without this file; it adds filters, cart and forms. */
(() => {
  'use strict';
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
    const CART = document.body.dataset.cart || '/cart/';
  const BRANDS = document.body.dataset.brands || '/brands/';
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  /* ---------- Menu drawer ---------- */
  const drawer = $('#drawer');
  const opener = $('[data-menu-open]');
  const setMenu = (open) => {
    drawer.hidden = !open;
    opener.setAttribute('aria-expanded', String(open));
    document.body.classList.toggle('no-scroll', open);
    (open ? $('.drawer__close', drawer) : opener).focus();
  };
  opener.addEventListener('click', () => setMenu(true));
  $$('[data-menu-close]', drawer).forEach((el) => el.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !drawer.hidden) setMenu(false); });

  /* ---------- Logo fallback: show the wordmark until the logo files are added ---------- */
  $$('img[data-logo]').forEach((img) => {
    const fail = () => {
      const span = document.createElement('span');
      span.className = img.classList.contains('hero__logo') ? 'hero__fallback' : 'footer__fallback';
      span.textContent = 'Beauty ROZY';
      img.replaceWith(span);
    };
    if (img.complete && img.naturalWidth === 0) fail();
    else img.addEventListener('error', fail, { once: true });
  });

  /* ---------- Scroll reveal (skipped when the visitor prefers less motion) ---------- */
  if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const targets = $$('main .section__head, main .types__item, main .pcard, main .panel, main .trust__item, main .brandcard, main .bcard, main .howto__item, main .steps li');
    const io = new IntersectionObserver((entries) => entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
    }), { rootMargin: '0px 0px -8% 0px' });
    targets.forEach((el) => {
      const siblings = [...el.parentElement.children];
      el.style.setProperty('--i', Math.min(siblings.indexOf(el), 6));
      el.setAttribute('data-reveal', '');
      io.observe(el);
    });
    document.documentElement.classList.add('reveal-ready');
  }

  /* ---------- Search: a small index of brands and products, loaded on first open ---------- */
  const searchBox = $('#search');
  if (searchBox) {
    const input = $('#search-q', searchBox);
    const results = $('[data-search-results]', searchBox);
    const hint = $('[data-search-hint]', searchBox);
    const openers = $$('[data-search-open]');
    let index = null;
    let lastOpener = null;
    // Fold Arabic letter variants, diacritics and German umlauts so «ريتينول», «Retinol» and «Reinigungsöl» match loosely.
    const norm = (s) => String(s || '').toLowerCase()
      .replace(/[\u064B-\u065F\u0640]/g, '').replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي')
      .replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ß/g, 'ss');
    const load = () => index || (index = fetch(document.body.dataset.search).then((r) => r.json())
      .then((list) => list.map((x) => ({ ...x, hay: norm(`${x.title} ${x.sub} ${x.terms}`) })))
      .catch(() => []));
    const show = async () => {
      const q = norm(input.value).trim();
      if (!q) { results.innerHTML = ''; hint.hidden = false; return; }
      hint.hidden = true;
      const words = q.split(/\s+/);
      const hits = (await load()).filter((x) => words.every((w) => x.hay.includes(w)))
        .sort((a, b) => (a.kind === b.kind ? 0 : a.kind === 'brand' ? -1 : 1)).slice(0, 10);
      results.innerHTML = hits.length
        ? hits.map((x) => `<li><a class="search__hit" href="${x.url}">
            <span class="media search__img" aria-hidden="true">${x.image ? `<img src="${x.image}" alt="" loading="lazy">` : (x.kind === 'brand' ? '★' : '')}</span>
            <span class="search__text"><strong dir="auto">${esc(x.title)}</strong><span>${esc(x.kind === 'brand' ? `ماركة · ${x.sub}` : x.sub)}</span></span></a></li>`).join('')
        : `<li class="search__none">مفيش نتايج لـ «${esc(input.value.trim())}». <a href="${document.body.dataset.request}">اطلبيه مخصوص</a></li>`;
    };
    const setOpen = (open) => {
      searchBox.hidden = !open;
      document.body.classList.toggle('no-scroll', open);
      openers.forEach((b) => b.setAttribute('aria-expanded', String(open)));
      if (open) { load(); input.focus(); } else if (lastOpener) lastOpener.focus();
    };
    openers.forEach((b) => b.addEventListener('click', () => { lastOpener = b; setOpen(true); }));
    $$('[data-search-close]', searchBox).forEach((b) => b.addEventListener('click', () => setOpen(false)));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !searchBox.hidden) setOpen(false); });
    input.addEventListener('input', show);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { const first = $('.search__hit', results); if (first) location.href = first.href; }
    });
  }

  /* ---------- Storage (can be unavailable in private mode) ---------- */
  const KEY = 'ats-beauty-rozy-preview-cart-v1';
  const loadCart = () => {
    try { const v = JSON.parse(localStorage.getItem(KEY)); return Array.isArray(v) ? v : []; } catch { return []; }
  };
  const saveCart = (cart) => {
    try { localStorage.setItem(KEY, JSON.stringify(cart)); } catch { /* cart lives for this page only */ }
    updateCount(cart);
  };
  const updateCount = (cart = loadCart()) => {
    const n = cart.reduce((s, l) => s + l.qty, 0);
    $$('[data-cart-count]').forEach((el) => { el.textContent = n; el.hidden = n === 0; });
    const link = $('.cartlink');
    if (link) link.setAttribute('aria-label', n ? `السلة، فيها ${n}` : 'السلة');
  };
  updateCount();

  /* ---------- Toast ---------- */
  const toast = $('.toast');
  let toastTimer;
  const showToast = (msg) => {
    toast.innerHTML = `<span>${esc(msg)}</span><a href="${CART}">شوفي السلة</a>`;
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.hidden = true; }, 3500);
  };

  /* ---------- Add to cart ---------- */
  const addToCart = (items) => {
    const cart = loadCart();
    for (const { kind, id } of items) {
      const line = cart.find((l) => l.kind === kind && l.id === id);
      if (line) line.qty = Math.min(line.qty + 1, 99); else cart.push({ kind, id, qty: 1 });
    }
    saveCart(cart);
  };
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-add-to-cart]');
    if (!btn) return;
    const { kind, id } = btn.dataset;
    addToCart([{ kind, id }]);
    showToast(kind === 'bundle' ? 'الباكيج اتضاف للسلة' : 'اتضاف للسلة');
  });

  /* ---------- Brands filters ---------- */
  const filters = $('[data-brand-filters]');
  if (filters) {
    const state = { type: 'all' };
    const v = new URLSearchParams(location.search).get('type');
    if (v && $(`[data-filter="type"][data-value="${CSS.escape(v)}"]`, filters)) state.type = v;

    const heroPresets = {
      all: {
        eyebrow: 'BEAUTY ROZY / CURATED BEAUTY',
        title: 'ماركات عالمية، مختارة بهدوء.',
        subtitle: 'CURATED BEAUTY',
        copy: 'اختيارات من عالم الجمال في مكان واحد — اكتشفي البراند، شوفي مجموعته، واعرفي موعد التسليم قبل التأكيد.',
        section: 'اكتشفي الماركات المختارة',
        sectionCopy: 'بدّلي بين الأقسام واكتشفي البراندات المتاحة بدون زحمة أو تفاصيل زيادة.',
        code: 'BEAUTY / 00',
        countLabel: 'ماركات مختارة',
        pageTitle: 'الماركات'
      },
      makeup: {
        eyebrow: 'BEAUTY ROZY / MAKEUP EDIT',
        title: 'ميك أب، مختار بذوق.',
        subtitle: 'THE MAKEUP EDIT',
        copy: 'ماركات عالمية مختارة للوك أدق وتجربة أهدى — اختاري البراند، اكتشفي مجموعته، واعرفي موعد التسليم قبل التأكيد.',
        section: 'ماركات الميك أب المختارة',
        sectionCopy: 'اختيارات للـmakeup من براندات مختلفة، مع تجربة تصفح بسيطة وواضحة.',
        code: 'MAKEUP / 01',
        countLabel: 'ماركات ميك أب',
        pageTitle: 'ميك أب'
      },
      hair: {
        eyebrow: 'BEAUTY ROZY / HAIR EDIT',
        title: 'شعرك، بروتين أذكى.',
        subtitle: 'THE HAIR EDIT',
        copy: 'اكتشفي براندات العناية بالشعر المتاحة، واختاري الروتين المناسب من غير ما تتوهي بين اختيارات كتير.',
        section: 'ماركات العناية بالشعر',
        sectionCopy: 'براندات للشعر مرتبة في تجربة هادئة تساعدك توصلي للاختيار أسرع.',
        code: 'HAIR / 02',
        countLabel: 'ماركات شعر',
        pageTitle: 'العناية بالشعر'
      },
      skin: {
        eyebrow: 'BEAUTY ROZY / SKIN EDIT',
        title: 'بشرة، باختيارات محسوبة.',
        subtitle: 'THE SKIN EDIT',
        copy: 'اختيارات عناية بالبشرة من براندات عالمية، مرتبة عشان توصلي للمناسب لروتينك بسهولة.',
        section: 'ماركات العناية بالبشرة',
        sectionCopy: 'اختاري البراند الأول، وبعدها شوفي المنتجات المتاحة داخل مجموعته.',
        code: 'SKIN / 03',
        countLabel: 'ماركات بشرة',
        pageTitle: 'العناية بالبشرة'
      },
      body: {
        eyebrow: 'BEAUTY ROZY / BODY EDIT',
        title: 'عناية الجسم، بطابع أهدى.',
        subtitle: 'THE BODY EDIT',
        copy: 'براندات للعناية اليومية بالجسم، مختارة ومقدمة بشكل واضح من أول الاختيار لحد موعد التسليم.',
        section: 'ماركات العناية بالجسم',
        sectionCopy: 'تصفحي البراندات المتاحة واختاري المجموعة اللي تناسب احتياجك.',
        code: 'BODY / 04',
        countLabel: 'ماركات جسم',
        pageTitle: 'العناية بالجسم'
      }
    };

    const cards = $('.brandcard');
    const apply = () => {
      const preset = heroPresets[state.type] || heroPresets.all;
      $('[data-filter]', filters).forEach((c) => c.setAttribute('aria-pressed', String(state[c.dataset.filter] === c.dataset.value)));
      let n = 0;
      cards.forEach((card) => {
        const ok = state.type === 'all' || card.dataset.types.split(' ').includes(state.type);
        card.hidden = !ok;
        if (ok) n += 1;
      });

      const count = $('[data-count]');
      if (count) count.textContent = `${n} ماركة`;
      const heroCount = $('[data-count-hero]');
      if (heroCount) heroCount.textContent = String(n);
      const countLabel = $('[data-brand-count-label]');
      if (countLabel) countLabel.textContent = preset.countLabel;
      const empty = $('[data-empty]');
      if (empty) empty.hidden = n > 0;

      const setText = (selector, value) => {
        const el = $(selector);
        if (el) el.textContent = value;
      };
      setText('[data-brand-hero-eyebrow]', preset.eyebrow);
      setText('[data-brand-hero-title]', preset.title);
      setText('[data-brand-hero-subtitle]', preset.subtitle);
      setText('[data-brand-hero-copy]', preset.copy);
      setText('[data-brand-section-title]', preset.section);
      setText('[data-brand-section-copy]', preset.sectionCopy);
      setText('[data-brand-hero-code]', preset.code);

      document.body.dataset.activeBrandType = state.type;
      $('[data-nav-type]').forEach((link) => link.classList.toggle('is-active', link.dataset.navType === state.type));
      document.title = `${preset.pageTitle} | Beauty ROZY`;
      history.replaceState(null, '', state.type === 'all' ? location.pathname : `?type=${state.type}`);
    };

    filters.addEventListener('click', (e) => {
      const chip = e.target.closest('[data-filter]');
      if (!chip) return;
      state[chip.dataset.filter] = chip.dataset.value;
      apply();
    });
    apply();
  }

  /* ---------- Cart page ---------- */
  const cartRoot = $('[data-cart-root]');
  if (cartRoot) {
    const cat = JSON.parse($('#catalog').textContent);
    const ph = (v, label) => (v === null || v === undefined || v === '' ? `[${label}]` : v);
    const price = (p) => (typeof p === 'number' ? `${p.toLocaleString('en-US')} ج.م` : '[السعر] ج.م');
    const date = (iso) => (iso ? new Date(`${iso}T00:00:00`).toLocaleDateString('ar-EG-u-nu-latn', { day: 'numeric', month: 'long' }) : '[تاريخ]');
    const latest = (dates) => (dates.length && dates.every(Boolean) ? dates.sort().at(-1) : null);

    // Resolve a cart line to display data and a status, the same rules as the build (lib.mjs bundleStatus).
    const resolve = (l) => {
      if (l.kind === 'bundle') {
        const b = cat.bundles[l.id];
        if (!b) return null;
        const items = b.items.map((id) => cat.products[id]).filter(Boolean);
        const status = items.some((p) => p.status === 'soldout') ? 'soldout' : 'preorder';
        const marks = [...new Set(items.map((p) => p.brand))].map((slug) => cat.brands[slug]).join('');
        const brandText = [...new Set(items.map((p) => cat.brandNames[p.brand]))].join(' + ');
        return { ...l, name: ph(b.name, 'اسم الباكيج'), brandText: `باكيج ${brandText}`, metaHtml: `<span>باكيج</span>${marks}`, price: b.price, status,
          deliveryDate: latest(items.map((p) => p.deliveryDate)) };
      }
      const p = cat.products[l.id];
      if (!p) return null;
      return { ...l, name: ph(p.name, 'اسم المنتج'), brandText: cat.brandNames[p.brand], image: p.image, metaHtml: cat.brands[p.brand], price: p.price, status: p.status, deliveryDate: p.deliveryDate };
    };

    const lineHtml = (x) => `
<div class="cline">
  <div class="media" aria-hidden="true">${x.image ? `<img src="${x.image}" alt="" loading="lazy">` : 'صورة'}</div>
  <div class="cline__body">
    <span class="cline__name">${esc(x.name)}</span>
    <span class="cline__meta">${x.metaHtml}</span>
    ${x.status === 'preorder' ? `<span class="badge badge--pre">التسليم ${esc(date(x.deliveryDate))}</span>` : ''}
    <div class="cline__row">
      <strong>${esc(price(typeof x.price === 'number' ? x.price * x.qty : null))}</strong>
      <div class="qty" role="group" aria-label="الكمية">
        <button type="button" data-qty="-1" data-kind="${x.kind}" data-id="${esc(x.id)}" aria-label="قللي واحد">−</button>
        <output>${x.qty}</output>
        <button type="button" data-qty="1" data-kind="${x.kind}" data-id="${esc(x.id)}" aria-label="زوّدي واحد">+</button>
      </div>
      <button class="linkbtn" type="button" data-remove data-kind="${x.kind}" data-id="${esc(x.id)}">شيليه</button>
    </div>
  </div>
</div>`;

    const render = () => {
      const cart = loadCart();
      const lines = cart.map(resolve).filter(Boolean);
      const out = lines.filter((x) => x.status === 'soldout');
      const ok = lines.filter((x) => x.status !== 'soldout');

      const subtotal = ok.every((x) => typeof x.price === 'number') ? ok.reduce((s, x) => s + x.price * x.qty, 0) : null;
      order = { lines: ok, subtotal, deliveryDate: latest(ok.map((x) => x.deliveryDate)) };
      if (checkoutForm) checkoutForm.hidden = !ok.length;

      if (!lines.length) {
        cartRoot.innerHTML = `<div class="empty"><p>السلة فاضية.</p><p><a class="btn btn--primary" href="${BRANDS}">تسوّقي الماركات</a></p></div>`;
        return;
      }

      cartRoot.innerHTML = `
${ok.length ? `<section class="cgroup" aria-labelledby="g-order">
  <div class="cgroup__head">
    <h2 id="g-order">طلبك</h2>
    <span class="badge badge--pre">التسليم المتوقع ${esc(date(latest(ok.map((x) => x.deliveryDate))))}</span>
    <span class="fine">الطلب كله بيتسلّم مرة واحدة مع آخر قطعة. الدفع أونلاين: دفعة حجز ${esc(ph(cat.site.preorderDeposit, 'قيمة دفعة الحجز'))}.</span>
  </div>
  ${ok.map(lineHtml).join('')}
</section>` : ''}
${out.length ? `<section class="cgroup" aria-labelledby="g-out">
  <div class="cgroup__head"><h2 id="g-out">مش متاح دلوقتي</h2><span class="fine">مش هيدخل في الطلب. تقدري تشيليه أو تطلبيه مخصوص.</span></div>
  ${out.map(lineHtml).join('')}
</section>` : ''}
${ok.length ? `<section class="summary" aria-label="ملخص الطلب">
  <div class="summary__row"><span>المنتجات</span><strong>${esc(price(subtotal))}</strong></div>
  <div class="summary__row"><span>الشحن (تقدير مبدئي)</span><span>${esc(ph(cat.site.shippingEstimate, 'تقدير الشحن'))}</span></div>
  <p class="fine">تكلفة الشحن النهائية بتتأكد بعد الطلب.</p>
  <div class="summary__row summary__row--total"><span>الإجمالي</span><span>${esc(price(subtotal))} + الشحن</span></div>
</section>` : ''}`;
    };

    cartRoot.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-qty], [data-remove]');
      if (!btn) return;
      const cart = loadCart();
      const i = cart.findIndex((l) => l.kind === btn.dataset.kind && l.id === btn.dataset.id);
      if (i < 0) return;
      if (btn.hasAttribute('data-remove')) cart.splice(i, 1);
      else {
        cart[i].qty += Number(btn.dataset.qty);
        if (cart[i].qty < 1) cart.splice(i, 1);
        else cart[i].qty = Math.min(cart[i].qty, 99);
      }
      saveCart(cart);
      render();
    });
    // Checkout: until a payment gateway is connected, the order goes to the store as a WhatsApp message.
    const checkoutForm = $('[data-checkout-form]');
    const checkoutDone = $('[data-checkout-done]');
    let order = { lines: [] };
    render();

    if (checkoutForm) checkoutForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const errorBox = $('[data-form-error]', checkoutForm);
      errorBox.hidden = true;
      $$('[aria-invalid]', checkoutForm).forEach((el) => el.removeAttribute('aria-invalid'));
      const d = Object.fromEntries(new FormData(checkoutForm));
      Object.keys(d).forEach((k) => { d[k] = String(d[k]).trim(); });
      const phone = d.phone.replace(/[\s-]/g, '');
      const fail = (msg, id) => { errorBox.textContent = msg; errorBox.hidden = false; const f = $(`#${id}`, checkoutForm); f.setAttribute('aria-invalid', 'true'); f.focus(); };
      if (!d.name) return fail('اكتبي اسمك.', 'c-name');
      if (!/^01[0125]\d{8}$/.test(phone)) return fail('اكتبي رقم موبايل مصري صحيح من 11 رقم يبدأ بـ 01.', 'c-phone');
      if (!d.governorate) return fail('اختاري المحافظة.', 'c-gov');
      if (!d.area) return fail('اكتبي المنطقة.', 'c-area');
      if (!d.address) return fail('اكتبي العنوان بالتفصيل.', 'c-address');
      if (!order.lines.length) return;

      const now = new Date();
      const ref = `BR-${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
      const text = [
        `طلب جديد من ${cat.site.name}`,
        `رقم الطلب: ${ref}`,
        '',
        ...order.lines.map((x) => `• ${x.name} (${x.brandText}) × ${x.qty}${typeof x.price === 'number' ? ` — ${price(x.price * x.qty)}` : ''}`),
        '',
        `المنتجات: ${price(order.subtotal)} + الشحن`,
        `التسليم المتوقع: ${date(order.deliveryDate)}`,
        '',
        `الاسم: ${d.name}`,
        `الموبايل: ${phone}`,
        `العنوان: ${d.governorate}، ${d.area}، ${d.address}`,
        d.note && `ملاحظات: ${d.note}`,
      ].filter((l) => l !== null && l !== undefined && l !== false).join('\n');

      const wa = cat.site.whatsappNumber ? `https://wa.me/${cat.site.whatsappNumber}?text=${encodeURIComponent(text)}` : null;
      checkoutDone.innerHTML = `
<h2>طلبك جاهز</h2>
<p>رقم طلبك <strong dir="ltr">${esc(ref)}</strong>. احتفظي بيه عشان تتابعي طلبك.</p>
${wa
  ? `<a class="btn btn--primary btn--lg" href="${wa}" target="_blank" rel="noopener">افتحي الواتساب وابعتي الطلب</a>
<p class="fine">الطلب مش بيتأكد غير لما الرسالة توصلنا. بعد ما تبعتيها، بنرجعلك بالتأكيد وتكلفة الشحن وطريقة دفع الحجز.</p>`
  : '<p class="fine">(نسخة تجريبية: رقم واتساب المتجر لسه مش متحدد، فدي الرسالة اللي هتتبعت.)</p>'}
<pre class="order-text">${esc(text)}</pre>
<button class="btn btn--outline-green" type="button" data-copy-order>انسخي تفاصيل الطلب</button>`;
      $('[data-copy-order]', checkoutDone).addEventListener('click', (ev) => {
        const btn = ev.currentTarget;
        navigator.clipboard?.writeText(text).then(() => { btn.textContent = 'اتنسخت'; }, () => { btn.textContent = 'انسخيها يدوي من فوق'; });
      });
      saveCart([]);
      checkoutForm.hidden = true;
      cartRoot.innerHTML = '';
      checkoutDone.hidden = false;
      checkoutDone.focus();
    });
  }

  /* ---------- Routine finder ---------- */
  const routineData = $('#routine-data');
  if (routineData) {
    const { routines, products } = JSON.parse(routineData.textContent);
    const result = $('[data-routine-result]');
    const tabs = $$('[data-routine-tab]');
    const forms = $$('[data-routine-form]');
    const price = (p) => (typeof p === 'number' ? `${p.toLocaleString('en-US')} ج.م` : '[السعر] ج.م');
    const date = (iso) => (iso ? new Date(`${iso}T00:00:00`).toLocaleDateString('ar-EG-u-nu-latn', { day: 'numeric', month: 'long' }) : '[تاريخ]');

    const showTab = (key) => {
      tabs.forEach((t) => t.setAttribute('aria-pressed', String(t.dataset.routineTab === key)));
      forms.forEach((f) => { f.hidden = f.dataset.routineForm !== key; });
      result.hidden = true;
    };
    tabs.forEach((t) => t.addEventListener('click', () => showTab(t.dataset.routineTab)));

    // A product that names answers for a "strict" question (skin type, scalp…) is left out when the
    // customer's answer isn't one of them. Other answers raise the score on a match and lower it
    // on a miss, so a product made for someone else ranks below one with no requirement.
    const score = (product, answers, routine) => {
      let points = 0;
      const reasons = [];
      for (const [key, values] of Object.entries(product.fit || {})) {
        const q = routine.questions.find((x) => x.id === key);
        const answer = answers[key];
        if (!q || !answer) continue;
        if (values.includes(answer)) {
          points += key === 'concern' ? 3 : 2;
          if (q.options.length > 2) reasons.push(q.options.find((o) => o.value === answer).label);
        } else if (q.strict) {
          return null;
        } else {
          points -= 1;
        }
      }
      return { points, reasons };
    };

    // Best product per step; ties go to the brand that already fills the most steps,
    // so a routine stays within one brand when the scores allow it.
    const build = (key, answers) => {
      const routine = routines[key];
      const steps = routine.steps.filter((st) => !st.levels || st.levels.includes(answers.level));
      const candidates = steps.map((st) => products
        .filter((p) => p.type === key && p.step === st.id)
        .map((p) => ({ product: p, ...score(p, answers, routine) }))
        .filter((c) => c.points !== undefined)
        .sort((x, y) => y.points - x.points));
      const brandCount = {};
      candidates.forEach((list) => { if (list[0]) brandCount[list[0].product.brand] = (brandCount[list[0].product.brand] || 0) + 1; });
      return steps.map((st, i) => {
        const list = candidates[i];
        const top = list.filter((c) => c.points === list[0]?.points);
        top.sort((x, y) => (brandCount[y.product.brand] || 0) - (brandCount[x.product.brand] || 0));
        return { step: st, match: top[0] || null };
      });
    };

    const render = (key, answers) => {
      const routine = routines[key];
      const plan = build(key, answers);
      const picked = plan.filter((x) => x.match).map((x) => x.match.product);
      const summary = routine.questions.filter((q) => q.id !== 'level')
        .map((q) => q.options.find((o) => o.value === answers[q.id])?.label).filter(Boolean);
      const total = picked.length && picked.every((p) => typeof p.price === 'number') ? picked.reduce((s, p) => s + p.price, 0) : null;
      const dates = picked.map((p) => p.deliveryDate);
      const latest = dates.length && dates.every(Boolean) ? dates.sort().at(-1) : null;

      result.innerHTML = `
<div class="result__head">
  <h2>روتينك في ${esc(routine.label)}</h2>
  <div class="tags">${summary.map((t) => `<span class="tag">${esc(t)}</span>`).join('')}</div>
</div>
<ol class="routine">${plan.map(({ step, match }) => `
  <li class="routine__step${match ? '' : ' routine__step--empty'}">
    <div class="routine__label"><strong>${esc(step.label)}${step.when ? ` <span class="routine__when">${esc(step.when)}</span>` : ''}</strong><span>${esc(step.why)}</span></div>
    ${match ? `<div class="routine__product">
      <a class="media routine__media" href="${match.product.url}" tabindex="-1" aria-hidden="true">${match.product.image ? `<img src="${match.product.image}" alt="" loading="lazy">` : 'صورة'}</a>
      <div class="routine__info">
        ${match.product.brandMark}
        <a class="routine__name" href="${match.product.url}" dir="auto">${esc(match.product.name)}</a>
        ${match.product.size ? `<span class="fine">${esc(match.product.size)}</span>` : ''}
        <span class="routine__price">${esc(price(match.product.price))}</span>
        ${match.reasons.length ? `<span class="fine">مناسب لـ: ${match.reasons.map(esc).join(' · ')}</span>` : ''}
      </div>
    </div>` : '<p class="fine">مفيش منتج عندنا مناسب للخطوة دي دلوقتي، فتقدري تمشي من غيرها.</p>'}
  </li>`).join('')}
</ol>
${picked.length ? `<div class="summary">
  <div class="summary__row"><span>الروتين (${picked.length} منتجات)</span><strong>${esc(price(total))}</strong></div>
  <div class="summary__row"><span>التسليم المتوقع</span><span class="badge badge--pre">${esc(date(latest))}</span></div>
  <button class="btn btn--primary btn--block btn--lg" type="button" data-add-routine>أضيفي الروتين كله للسلة</button>
  <button class="btn btn--link" type="button" data-routine-edit>عدّلي إجاباتك</button>
</div>` : `<div class="empty"><p>مفيش منتجات عندنا مناسبة للإجابات دي دلوقتي.</p><button class="btn btn--link" type="button" data-routine-edit>عدّلي إجاباتك</button></div>`}`;

      const addAll = $('[data-add-routine]', result);
      if (addAll) addAll.addEventListener('click', () => {
        addToCart(picked.map((p) => ({ kind: 'product', id: p.id })));
        showToast('الروتين اتضاف للسلة');
      });
      $('[data-routine-edit]', result).addEventListener('click', () => {
        const form = $(`[data-routine-form="${key}"]`);
        form.scrollIntoView({ block: 'start' });
        $('input', form).focus({ preventScroll: true });
      });
      result.hidden = false;
      result.focus({ preventScroll: true });
      result.scrollIntoView({ block: 'start' });
    };

    forms.forEach((form) => form.addEventListener('submit', (e) => {
      e.preventDefault();
      const key = form.dataset.routineForm;
      const errorBox = $('[data-form-error]', form);
      const answers = Object.fromEntries(new FormData(form));
      const missing = routines[key].questions.find((q) => !answers[q.id]);
      if (missing) {
        errorBox.textContent = `جاوبي على: ${missing.label}`;
        errorBox.hidden = false;
        $(`input[name="${missing.id}"]`, form).focus();
        return;
      }
      errorBox.hidden = true;
      render(key, answers);
    }));
  }

  /* ---------- Product gallery: swipe or tap a thumbnail ---------- */
  $$('[data-gallery]').forEach((gallery) => {
    const track = $('.gallery__track', gallery);
    const slides = $$('.gallery__slide', gallery);
    const thumbs = $$('.gallery__thumb', gallery);
    if (!thumbs.length) return;
    const mark = (i) => thumbs.forEach((t, j) => (j === i ? t.setAttribute('aria-current', 'true') : t.removeAttribute('aria-current')));
    thumbs.forEach((t, i) => t.addEventListener('click', () => {
      // Offset relative to the track works in RTL and LTR alike.
      track.scrollBy({ left: slides[i].getBoundingClientRect().left - track.getBoundingClientRect().left, behavior: 'smooth' });
      mark(i);
    }));
    const io = new IntersectionObserver((entries) => entries.forEach((e) => {
      if (e.isIntersecting) mark(slides.indexOf(e.target));
    }), { root: track, threshold: 0.6 });
    slides.forEach((s) => io.observe(s));
  });

  /* ---------- Order tracking ---------- */
  const trackForm = $('[data-track-form]');
  if (trackForm) {
    const out = $('[data-track-result]');
    trackForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const errorBox = $('[data-form-error]', trackForm);
      errorBox.hidden = true;
      const ref = $('#t-order', trackForm).value.trim().toUpperCase();
      const phone = $('#t-phone', trackForm).value.replace(/[\s-]/g, '');
      if (!/^BR-\d{6}-\d{4}$/.test(ref)) { errorBox.textContent = 'رقم الطلب شكله كده: BR-000000-0000.'; errorBox.hidden = false; $('#t-order', trackForm).focus(); return; }
      if (!/^01[0125]\d{8}$/.test(phone)) { errorBox.textContent = 'اكتبي رقم الموبايل اللي طلبتي بيه.'; errorBox.hidden = false; $('#t-phone', trackForm).focus(); return; }
      let html;
      if (trackForm.dataset.endpoint) {
        try {
          const res = await fetch(`${trackForm.dataset.endpoint}?order=${encodeURIComponent(ref)}&phone=${encodeURIComponent(phone)}`);
          if (!res.ok) throw new Error(String(res.status));
          const data = await res.json();
          html = `<h2>${esc(data.status || 'حالة الطلب')}</h2><p>${esc(data.message || '')}</p>`;
        } catch { html = '<h2>مش لاقيين الطلب</h2><p>اتأكدي من رقم الطلب والموبايل، أو كلمينا على الواتساب.</p>'; }
      } else if (trackForm.dataset.whatsapp) {
        const wa = `https://wa.me/${trackForm.dataset.whatsapp}?text=${encodeURIComponent(`عايزة أتابع طلبي رقم ${ref} (موبايل ${phone})`)}`;
        html = `<h2>هنبلغك بحالة طلبك</h2><p>ابعتيلنا رقم الطلب على الواتساب ونرد عليكي بآخر تحديث.</p><a class="btn btn--primary" href="${wa}" target="_blank" rel="noopener">اسألي على الواتساب</a>`;
      } else {
        html = '<h2>التتبّع لسه مش متوصل</h2><p class="fine">(نسخة تجريبية: التتبّع هيشتغل بعد ربط المنصة أو رقم الواتساب.)</p>';
      }
      out.innerHTML = html;
      out.hidden = false;
      out.focus();
    });
  }

  /* ---------- Custom request form ---------- */
  const form = $('[data-request-form]');
  if (form) {
    const done = $('[data-request-done]');
    const errorBox = $('[data-form-error]', form);
    const fileInput = $('#r-image', form);
    const uploadLabel = $('[data-upload-label]', form);
    fileInput.addEventListener('change', () => {
      uploadLabel.textContent = fileInput.files[0] ? `الصورة: ${fileInput.files[0].name}` : 'أو ارفعي صورة المنتج';
    });

    const fail = (msg, field) => {
      errorBox.textContent = msg;
      errorBox.hidden = false;
      if (field) { field.setAttribute('aria-invalid', 'true'); field.focus(); }
    };

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      errorBox.hidden = true;
      $$('[aria-invalid]', form).forEach((el) => el.removeAttribute('aria-invalid'));
      const data = new FormData(form);
      const product = data.get('product').trim();
      const link = data.get('link').trim();
      const hasImage = fileInput.files.length > 0;
      const phone = data.get('phone').replace(/[\s-]/g, '');

      if (!product && !link && !hasImage) return fail('اكتبي اسم المنتج، أو حطي رابطه، أو ارفعي صورته.', $('#r-name', form));
      if (link && !/^https?:\/\/\S+\.\S+/.test(link)) return fail('الرابط مش مظبوط. انسخيه كامل من المتصفح.', $('#r-link', form));
      if (!/^01[0125]\d{8}$/.test(phone)) return fail('اكتبي رقم واتساب مصري صحيح من 11 رقم يبدأ بـ 01.', $('#r-phone', form));

      const submit = $('button[type="submit"]', form);
      submit.disabled = true;
      let ref = '';
      let demo = false;
      try {
        if (form.dataset.endpoint) {
          const res = await fetch(form.dataset.endpoint, { method: 'POST', body: data });
          if (!res.ok) throw new Error(String(res.status));
          ref = (await res.json().catch(() => ({}))).reference || '';
        } else if (form.dataset.whatsapp) {
          const text = [`طلب منتج مخصوص`, product && `المنتج: ${product}`, data.get('brand') && `الماركة: ${data.get('brand')}`,
            link && `الرابط: ${link}`, `الكمية: ${data.get('qty')}`, `رقمي: ${phone}`, data.get('note') && `ملاحظات: ${data.get('note')}`,
            hasImage && '(هبعت صورة المنتج هنا)'].filter(Boolean).join('\n');
          window.open(`https://wa.me/${form.dataset.whatsapp}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
        } else {
          demo = true;
        }
      } catch {
        submit.disabled = false;
        return fail('حصلت مشكلة في الإرسال. جرّبي تاني بعد شوية.');
      }
      submit.disabled = false;
      $('[data-request-ref]', done).textContent = ref ? ` رقم الطلب: ${ref}` : '';
      $('[data-demo-note]', done).hidden = !demo;
      form.hidden = true;
      done.hidden = false;
      done.focus();
    });

    $('[data-request-again]', done).addEventListener('click', () => {
      form.reset();
      uploadLabel.textContent = 'أو ارفعي صورة المنتج';
      done.hidden = true;
      form.hidden = false;
      $('#r-name', form).focus();
    });
  }
})();
