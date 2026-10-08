/* ROZY discovery: brand and category routes share one URL-backed state. */
(() => {
  'use strict';
  const root = document.querySelector('.rozy-collection');
  if (!root) return;
  const tabs = [...root.querySelectorAll('[data-rozy-mode]')];
  const brands = [...root.querySelectorAll('[data-rozy-brand]')];
  const types = [...root.querySelectorAll('[data-rozy-type]')];
  const cards = [...root.querySelectorAll('.brandcard')];
  const products = [...root.querySelectorAll('[data-product-type]')];
  const allowedBrands = new Set(brands.map(el => el.dataset.rozyBrand));
  const allowedTypes = new Set(types.map(el => el.dataset.rozyType));
  const labels = { skin: 'Skin Care', hair: 'Hair Care', body: 'Body Care', makeup: 'Makeup' };
  const panel = root.querySelector('[data-rozy-panel]');
  const gallery = root.querySelector('[data-rozy-gallery]');
  const brandTools = root.querySelector('[data-rozy-brandtools]');
  const typeTools = root.querySelector('[data-rozy-typetools]');
  const productSection = root.querySelector('[data-rozy-products]');
  const results = root.querySelector('#rozy-results');
  const count = root.querySelector('[data-rozy-count]');
  const heading = root.querySelector('[data-rozy-results-title]');
  const navLinks = [...document.querySelectorAll('.desknav a, .drawer__panel a')];
  let state;
  function readState() {
    const q = new URL(location.href).searchParams;
    const type = allowedTypes.has(q.get('type')) ? q.get('type') : 'all';
    const mode = q.get('view') === 'brands' ? 'brands' : q.get('view') === 'types' || type !== 'all' ? 'types' : 'brands';
    const brand = allowedBrands.has(q.get('brand')) ? q.get('brand') : 'all';
    return { mode, type: mode === 'types' ? type : 'all', brand: mode === 'brands' ? brand : 'all' };
  }
  function render() {
    state = readState();
    root.dataset.mode = state.mode;
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', `rozy-tab-${state.mode}`);
    tabs.forEach(tab => {
      const active = tab.dataset.rozyMode === state.mode;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
    });
    brandTools.hidden = state.mode !== 'brands';
    typeTools.hidden = state.mode !== 'types';
    brands.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.rozyBrand === state.brand)));
    types.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.rozyType === state.type)));
    let brandCount = 0;
    cards.forEach(card => {
      const visible = state.mode === 'brands'
        ? state.brand === 'all' || card.dataset.brand === state.brand
        : state.type !== 'all' && card.dataset.types.split(' ').includes(state.type);
      card.hidden = !visible;
      if (visible) brandCount++;
    });
    gallery.dataset.selection = state.mode === 'types' ? state.type : 'all';
    results.hidden = state.mode === 'types' && state.type === 'all';
    root.querySelector('[data-rozy-empty]').hidden = brandCount > 0 || results.hidden;
    let productCount = 0;
    products.forEach(product => {
      product.hidden = state.mode !== 'types' || product.dataset.productType !== state.type;
      if (!product.hidden) productCount++;
    });
    productSection.hidden = productCount === 0;
    count.textContent = `${brandCount} ${brandCount === 1 ? 'brand' : 'brands'}`;
    heading.textContent = state.mode === 'types' && state.type !== 'all' ? `${labels[state.type]} · The brands` : 'The brand directory';
    root.querySelector('#type-products-title').textContent = state.type !== 'all' ? `${labels[state.type]} · The edit` : 'Objects of your ritual';
    navLinks.forEach(link => {
      const url = new URL(link.href);
      if (url.pathname.replace(/\/$/, '') !== location.pathname.replace(/\/$/, '')) return;
      const linkType = url.searchParams.get('type');
      const active = linkType ? state.mode === 'types' && state.type === linkType : state.mode === 'brands';
      if (active) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
    });
  }
  function navigate(next, anchor) {
    const url = new URL(location.href);
    url.searchParams.set('view', next.mode);
    url.searchParams.delete('brand');
    url.searchParams.delete('type');
    if (next.mode === 'brands' && next.brand !== 'all') url.searchParams.set('brand', next.brand);
    if (next.mode === 'types' && next.type !== 'all') url.searchParams.set('type', next.type);
    if (anchor) url.hash = 'selection';
    if (url.href !== location.href) history.pushState(null, '', url);
    render();
    if (anchor) {
      root.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
      tabs.find(tab => tab.dataset.rozyMode === next.mode).focus({ preventScroll: true });
    }
  }
  root.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button || !root.contains(button)) return;
    if (button.dataset.rozyMode) navigate({ mode: button.dataset.rozyMode, brand: 'all', type: 'all' });
    else if (button.dataset.rozyBrand) navigate({ mode: 'brands', brand: button.dataset.rozyBrand, type: 'all' });
    else if (button.dataset.rozyType) navigate({ mode: 'types', type: button.dataset.rozyType, brand: 'all' });
  });
  root.querySelector('[data-rozy-tabs]').addEventListener('keydown', event => {
    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key) || !tabs.includes(event.target)) return;
    event.preventDefault();
    const tab = event.key === 'Home' ? tabs[0] : event.key === 'End' ? tabs[tabs.length - 1] : tabs.find(item => item !== event.target);
    navigate({ mode: tab.dataset.rozyMode, brand: 'all', type: 'all' });
    tab.focus();
  });
  document.querySelectorAll('[data-discover-mode]').forEach(link => link.addEventListener('click', event => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    navigate({ mode: link.dataset.discoverMode, brand: 'all', type: 'all' }, true);
  }));
  window.addEventListener('popstate', render);
  render();
  root.querySelector('[data-rozy-tabs]').hidden = false;
})();
