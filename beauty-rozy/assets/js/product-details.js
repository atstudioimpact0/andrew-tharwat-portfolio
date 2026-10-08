/* Progressive, native-dialog photography viewer. The existing gallery works without it. */
(() => {
  'use strict';
  const gallery = document.querySelector('[data-gallery]');
  const dialog = document.querySelector('[data-photo-dialog]');
  if (!gallery || !dialog || typeof dialog.showModal !== 'function') return;
  const photographs = [...gallery.querySelectorAll('.gallery__slide img')];
  const opener = gallery.querySelector('[data-photo-open]');
  if (!photographs.length || !opener) return;
  const image = dialog.querySelector('[data-photo-image]');
  const count = dialog.querySelector('[data-photo-count]');
  const previous = dialog.querySelector('[data-photo-prev]');
  const next = dialog.querySelector('[data-photo-next]');
  let position = 0;
  const show = index => {
    position = Math.max(0, Math.min(index, photographs.length - 1));
    const photograph = photographs[position];
    image.src = photograph.currentSrc || photograph.src;
    image.alt = photograph.alt;
    count.textContent = `${position + 1} / ${photographs.length}`;
    previous.disabled = position === 0;
    next.disabled = position === photographs.length - 1;
  };
  opener.addEventListener('click', () => {
    const selected = gallery.querySelector('.gallery__thumb[aria-current="true"]');
    show(Number(selected?.dataset.slide || 0));
    dialog.showModal();
    document.body.classList.add('no-scroll');
  });
  previous.addEventListener('click', () => show(position - 1));
  next.addEventListener('click', () => show(position + 1));
  dialog.querySelector('[data-photo-close]').addEventListener('click', () => dialog.close());
  dialog.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      show(position + (event.key === 'ArrowRight' ? 1 : -1));
    }
  });
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  });
  dialog.addEventListener('close', () => {
    document.body.classList.remove('no-scroll');
    opener.focus();
  });
  opener.hidden = false;
})();
