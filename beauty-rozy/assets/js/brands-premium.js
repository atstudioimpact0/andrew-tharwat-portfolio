/* Brands only: URL-backed category selection, with history and accessible status. */
(() => {
  'use strict';
  const filters = document.querySelector('[data-rozy-filters]');
  if (!filters) return;
  const buttons = [...filters.querySelectorAll('[data-rozy-type]')];
  const gallery = document.querySelector('[data-rozy-gallery]');
  const cards = [...gallery.querySelectorAll('.brandcard')];
  const allowed = new Set(buttons.map(button => button.dataset.rozyType));
  const count = document.querySelector('[data-rozy-count]');
  const empty = document.querySelector('[data-rozy-empty]');
  const navLinks = [...document.querySelectorAll('.desknav a, .drawer__panel a')];
  function apply(type) {
    gallery.dataset.selection = type;
    buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.rozyType === type)));
    let visible = 0;
    cards.forEach(card => {
      card.hidden = type !== 'all' && !card.dataset.types.split(' ').includes(type);
      if (!card.hidden) visible++;
    });
    count.textContent = visible === 1 ? 'علامة واحدة' : visible === 2 ? 'علامتان' : `${visible} علامات`;
    empty.hidden = visible > 0;
    navLinks.forEach(link => {
      const url = new URL(link.href);
      if (url.pathname.replace(/\/$/, '') !== location.pathname.replace(/\/$/, '')) return;
      const active = (url.searchParams.get('type') || 'all') === type;
      if (active) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
  }
  function readLocation() {
    const type = new URL(location.href).searchParams.get('type') || 'all';
    apply(allowed.has(type) ? type : 'all');
  }
  filters.addEventListener('click', event => {
    const button = event.target.closest('[data-rozy-type]');
    if (!button || !filters.contains(button)) return;
    const type = button.dataset.rozyType;
    if (!allowed.has(type) || type === gallery.dataset.selection) return;
    const url = new URL(location.href);
    if (type === 'all') url.searchParams.delete('type');
    else url.searchParams.set('type', type);
    history.pushState(null, '', url);
    apply(type);
  });
  window.addEventListener('popstate', readLocation);
  readLocation();
})();
