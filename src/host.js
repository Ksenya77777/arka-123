import gsap from 'gsap';

// Фирменный персонаж: хозяйка АРКА 123 (фото созданы в Gemini, фон вырезан tools/prep_host.py).
// Четыре позы лежат стопкой, активная плавно проявляется поверх остальных.
const POSES = ['idle', 'wave', 'point', 'rest'];

export function hostHTML() {
  return `<div class="host">${POSES.map((p) =>
    `<img class="host-pose${p === 'idle' ? ' is-on' : ''}" data-pose="${p}" src="./host/${p}.webp" width="560" height="750" alt="" decoding="async">`).join('')}</div>`;
}

// тот же интерфейс, что был у иллюстрации: pose(name) и step(scrollY)
export function animateHost(root) {
  const imgs = Object.fromEntries([...root.querySelectorAll('.host-pose')].map((i) => [i.dataset.pose, i]));
  let cur = 'idle';
  gsap.set(Object.values(imgs), { opacity: 0 });
  gsap.set(imgs.idle, { opacity: 1 });
  // лёгкое «дыхание»
  gsap.to(root, { scaleY: 1.012, transformOrigin: '50% 100%', duration: 2.4, ease: 'sine.inOut', yoyo: true, repeat: -1 });
  const bob = gsap.quickTo(root, 'y', { duration: 0.5, ease: 'power2.out' });
  return {
    pose(name) {
      if (!imgs[name] || name === cur) return;
      gsap.to(imgs[cur], { opacity: 0, duration: 0.35 });
      gsap.to(imgs[name], { opacity: 1, duration: 0.35 });
      cur = name;
    },
    step(scrollY) { bob(Math.sin(scrollY / 90) * 3); },
  };
}
