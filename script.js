const toggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('.nav');

window.lucide?.createIcons({
  attrs: {
    'stroke-width': 1.8,
  },
});

toggle?.addEventListener('click', () => {
  const open = nav.classList.toggle('open');
  toggle.setAttribute('aria-expanded', String(open));
});

nav?.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => {
  nav.classList.remove('open');
  toggle?.setAttribute('aria-expanded', 'false');
}));

const timeline = document.querySelector('.timeline');

if (timeline) {
  let dragState = null;

  const stopDragging = (event) => {
    if (!dragState || event.pointerId !== dragState.pointerId) return;

    timeline.classList.remove('is-dragging');
    if (timeline.hasPointerCapture(event.pointerId)) {
      timeline.releasePointerCapture(event.pointerId);
    }
    dragState = null;
  };

  timeline.addEventListener('pointerdown', (event) => {
    if (event.pointerType !== 'mouse' || event.button !== 0) return;

    dragState = {
      pointerId: event.pointerId,
      startX: event.clientX,
      scrollLeft: timeline.scrollLeft,
    };
    timeline.classList.add('is-dragging');
    timeline.setPointerCapture(event.pointerId);
  });

  timeline.addEventListener('pointermove', (event) => {
    if (!dragState || event.pointerId !== dragState.pointerId) return;

    const distance = event.clientX - dragState.startX;
    timeline.scrollLeft = dragState.scrollLeft - distance;
    event.preventDefault();
  });

  timeline.addEventListener('pointerup', stopDragging);
  timeline.addEventListener('pointercancel', stopDragging);
  timeline.addEventListener('lostpointercapture', stopDragging);
}
