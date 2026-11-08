// The trailer: our own picture until it's pressed, then YouTube's privacy-enhanced player in its place.
document.addEventListener('click', event => {
  const link = event.target.closest('[data-youtube]');
  if (!link) return;
  event.preventDefault();
  const frame = document.createElement('iframe');
  frame.className = 'trailer-frame';
  frame.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(link.dataset.youtube)}?autoplay=1&rel=0`;
  frame.title = link.dataset.title;
  frame.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
  frame.allowFullscreen = true;
  frame.referrerPolicy = 'strict-origin-when-cross-origin';
  link.replaceWith(frame);
});
