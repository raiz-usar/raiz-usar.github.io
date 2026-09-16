(() => {
  const icons = window.RAIZ_LORDICONS;
  if (!icons) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  document.querySelectorAll('lord-icon[data-icon]').forEach((element) => {
    const icon = icons[element.dataset.icon];
    if (!icon) return;

    const requestedTrigger = element.getAttribute('trigger');

    if (reduceMotion) {
      element.setAttribute('trigger', 'hover');
    } else if (requestedTrigger === 'in-hover') {
      element.setAttribute('trigger', 'in');
    }

    element.icon = icon;

    if (!reduceMotion && requestedTrigger === 'in-hover') {
      element.addEventListener('mouseenter', () => {
        const player = element.playerInstance;
        if (!player) return;

        if (typeof player.playFromStart === 'function') {
          player.playFromStart();
        } else if (typeof player.playFromBeginning === 'function') {
          player.playFromBeginning();
        } else {
          player.stop?.();
          player.play?.();
        }
      });
    }
  });
})();
