// Screenshots open full size in a viewer over the page: the picture as large as the window allows, its caption,
// and the others in its group (the phone's, or the desktop companion's) a button, arrow key or swipe away.
// Escape, the close button or a press beside the picture closes it. Without this script the link opens the picture.
(() => {
  let dialog, img, caption, count, prev, next, links = [], at = 0;

  const button = (cls, label, path) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = cls;
    b.setAttribute('aria-label', label);
    b.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${path}"/></svg>`;
    return b;
  };

  const build = () => {
    dialog = document.createElement('dialog');
    dialog.className = 'viewer';
    dialog.setAttribute('aria-label', 'Screenshot');
    const figure = document.createElement('figure');
    img = document.createElement('img');
    img.alt = '';
    const bar = document.createElement('figcaption');
    caption = document.createElement('span');
    count = document.createElement('small');
    bar.append(caption, count);
    figure.append(img, bar);
    const close = button('viewer-close', 'Close', 'M6 6l12 12M18 6 6 18');
    prev = button('viewer-prev', 'Previous screenshot', 'm15 5-7 7 7 7');
    next = button('viewer-next', 'Next screenshot', 'm9 5 7 7-7 7');
    dialog.append(figure, prev, next, close);
    document.body.append(dialog);

    close.addEventListener('click', () => dialog.close());
    prev.addEventListener('click', () => show(at - 1));
    next.addEventListener('click', () => show(at + 1));
    // A press on the dark around the picture (the dialog itself, not what's in it) closes it.
    dialog.addEventListener('click', e => { if (e.target === dialog || e.target === figure) dialog.close(); });
    dialog.addEventListener('keydown', e => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); show(at - 1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); show(at + 1); }
    });
    let x0 = null;
    dialog.addEventListener('touchstart', e => { x0 = e.touches.length === 1 ? e.touches[0].clientX : null; }, { passive: true });
    dialog.addEventListener('touchend', e => {
      if (x0 === null) return;
      const dx = e.changedTouches[0].clientX - x0;
      x0 = null;
      if (Math.abs(dx) > 50) show(at + (dx < 0 ? 1 : -1));
    });
    dialog.addEventListener('close', () => { document.documentElement.classList.remove('viewing'); links[at]?.focus(); });
  };

  const show = i => {
    if (!links.length) return;
    at = (i + links.length) % links.length;
    const link = links[at];
    img.src = link.getAttribute('href');
    img.alt = link.dataset.caption || '';
    const thumb = link.querySelector('img');
    img.setAttribute('width', thumb.getAttribute('width'));     // so the space is kept while it loads
    img.setAttribute('height', thumb.getAttribute('height'));
    caption.textContent = link.dataset.caption || '';
    const many = links.length > 1;
    count.textContent = many ? `${at + 1} of ${links.length}` : '';
    prev.hidden = next.hidden = !many;
  };

  document.addEventListener('click', e => {
    const link = e.target.closest('a.zoom');
    if (!link || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    if (typeof HTMLDialogElement !== 'function') return;     // an old browser: the link opens the picture
    e.preventDefault();
    if (!dialog) build();
    links = [...document.querySelectorAll(`a.zoom[data-group="${link.dataset.group}"]`)];
    show(links.indexOf(link));
    document.documentElement.classList.add('viewing');
    dialog.showModal();
  });
})();
