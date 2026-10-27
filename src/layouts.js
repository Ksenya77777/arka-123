// Иллюстрации для галереи: планировки помещения (вид сверху) и виды из окна.
// Фото помещения заказчик не предоставил, поэтому галерея собрана из векторных иллюстраций.
const RW = 120; // 12 м
const RD = 102.5; // 10,25 м

const room = (inner) => `
<svg viewBox="-8 -8 ${RW + 16} ${RD + 16}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <rect x="0" y="0" width="${RW}" height="${RD}" fill="#f5f0e7" stroke="#2a2b2e" stroke-width="2.4"/>
  <!-- арочные окна на верхней стене -->
  <rect x="15" y="-3" width="40" height="5" fill="#9fc0dd" stroke="#2a2b2e" stroke-width="1.2"/>
  <rect x="65" y="-3" width="40" height="5" fill="#9fc0dd" stroke="#2a2b2e" stroke-width="1.2"/>
  <rect x="${RW / 2 - 12}" y="${RD - 2}" width="12" height="4" fill="#b8893f"/>
  ${inner}
</svg>`;

const chair = (x, y, r = 0) =>
  `<rect x="${x - 2.2}" y="${y - 2.2}" width="4.4" height="4.4" rx="1" fill="#b8893f" transform="rotate(${r} ${x} ${y})"/>`;

export const layouts = {
  empty: {
    title: 'Пустое помещение',
    note: '123 м², чистое пространство под любой формат',
    svg: () => room(`
      <text x="${RW / 2}" y="${RD / 2 + 3}" text-anchor="middle" font-size="12" fill="#6b6a66" font-family="Georgia, serif">123 м²</text>`),
  },
  class: {
    title: 'Мастер-класс с презентацией',
    note: 'Экран и проектор, ряды слушателей, стол преподавателя',
    svg: () => {
      let s = `<rect x="${RW - 3}" y="${RD / 2 - 22}" width="3" height="44" fill="#2a2b2e"/>
        <rect x="${RW - 20}" y="${RD / 2 - 9}" width="8" height="18" fill="#e9e1d2" stroke="#2a2b2e" stroke-width="1"/>`;
      for (let c = 0; c < 4; c++) for (let r = -3; r <= 3; r++) s += chair(18 + c * 17, RD / 2 + r * 11.5, 90);
      return room(s);
    },
  },
  table: {
    title: 'Большой стол',
    note: 'Переговоры, воркшопы, дегустации: до 14 человек',
    svg: () => {
      let s = `<rect x="${RW / 2 - 32}" y="${RD / 2 - 8}" width="64" height="16" rx="2" fill="#e9e1d2" stroke="#2a2b2e" stroke-width="1.2"/>`;
      for (let i = 0; i < 6; i++) {
        s += chair(RW / 2 - 25 + i * 10, RD / 2 - 14) + chair(RW / 2 - 25 + i * 10, RD / 2 + 14, 180);
      }
      s += chair(RW / 2 - 38, RD / 2, 90) + chair(RW / 2 + 38, RD / 2, -90);
      return room(s);
    },
  },
  tables: {
    title: 'Отдельные столы',
    note: 'Шесть островков по четыре гостя: практикумы и мастер-классы',
    svg: () => {
      let s = '';
      for (const cx of [26, 60, 94]) for (const cy of [36, 72]) {
        s += `<circle cx="${cx}" cy="${cy}" r="8" fill="#e9e1d2" stroke="#2a2b2e" stroke-width="1.2"/>`;
        for (let k = 0; k < 4; k++) {
          const th = (k * Math.PI) / 2 + Math.PI / 4;
          s += chair(cx + Math.cos(th) * 12, cy + Math.sin(th) * 12, (th * 180) / Math.PI + 90);
        }
      }
      return room(s);
    },
  },
};

// Виды: окно и арка
export const views = {
  library: () => `
<svg viewBox="0 0 240 300" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" preserveAspectRatio="xMidYMid slice">
  <defs><linearGradient id="vg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8fb5db"/><stop offset="1" stop-color="#f6e4c8"/></linearGradient></defs>
  <rect width="240" height="300" fill="url(#vg)"/>
  <ellipse cx="70" cy="70" rx="34" ry="9" fill="#fff" opacity=".85"/>
  <ellipse cx="180" cy="110" rx="26" ry="7" fill="#fff" opacity=".8"/>
  <g transform="translate(120 186)">
    <polygon points="-60,0 -38,-40 38,-40 60,0 38,40 -38,40" fill="#d9e4ee" stroke="#7d93a8" stroke-width="2"/>
    <polygon points="-38,-40 0,-62 38,-40" fill="#eef4f9" stroke="#7d93a8" stroke-width="2"/>
    <path d="M-38 -40V40M38 -40V40M-60 0H60" stroke="#7d93a8" stroke-width="1.6"/>
  </g>
  <rect y="240" width="240" height="60" fill="#8a9a7a"/>
</svg>`,
  arch: () => `
<svg viewBox="0 0 240 300" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" preserveAspectRatio="xMidYMid slice">
  <defs><linearGradient id="ag" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a2b2e"/><stop offset="1" stop-color="#3a3b3f"/></linearGradient>
  <linearGradient id="ag2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bcd3e6"/><stop offset="1" stop-color="#f3e6cf"/></linearGradient></defs>
  <rect width="240" height="300" fill="url(#ag)"/>
  <path d="M50 300V130a70 70 0 0 1 140 0V300z" fill="url(#ag2)"/>
  <path d="M50 300V130a70 70 0 0 1 140 0V300" fill="none" stroke="#b8893f" stroke-width="5"/>
  <path d="M120 60V300M50 190H190" stroke="#b8893f" stroke-width="2" opacity=".6"/>
</svg>`,
};
