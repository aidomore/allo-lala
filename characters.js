// Персонажи «Алло, ляля».
// Чтобы добавить нового: скопируйте блок, поменяйте цвета, голос и вид ушей.
//   voice.pitch   — высота голоса (Гц): 100 низкий … 500 писклявый
//   voice.speed   — длина слога в секундах: 0.09 быстро … 0.22 медленно
//   voice.formant — «размер» голоса: 0.85 большой зверь … 1.35 крошка
//   voice.sig     — фирменный звук: hum, boing, meow, woof, croak, cheep

export const CHARACTERS = [
  {
    id: 'bear', kind: 'bear',
    color: '#C98A4B', light: '#F3D9B5', dark: '#8A5A2B',
    voice: { pitch: 115, speed: 0.21, formant: 0.85, sig: 'hum' },
  },
  {
    id: 'bunny', kind: 'bunny',
    color: '#F6A5C8', light: '#FFE3EF', dark: '#D9729F',
    voice: { pitch: 340, speed: 0.11, formant: 1.25, sig: 'boing' },
  },
  {
    id: 'kitty', kind: 'kitty',
    color: '#A9BCD0', light: '#E6EEF6', dark: '#7D92A8',
    voice: { pitch: 290, speed: 0.17, formant: 1.18, sig: 'meow' },
  },
  {
    id: 'puppy', kind: 'puppy',
    color: '#F4B26A', light: '#FFE6C7', dark: '#B9733A',
    voice: { pitch: 250, speed: 0.12, formant: 1.08, sig: 'woof' },
  },
  {
    id: 'frog', kind: 'frog',
    color: '#9AD37F', light: '#DDF3CF', dark: '#5E9E4A',
    voice: { pitch: 150, speed: 0.15, formant: 0.95, sig: 'croak' },
  },
  {
    id: 'chick', kind: 'chick',
    color: '#FFD45C', light: '#FFF1BF', dark: '#E0A92A',
    voice: { pitch: 470, speed: 0.09, formant: 1.35, sig: 'cheep' },
  },
];

const INK = '#3B2B22';

function eyes(y = 104, dx = 26) {
  return `<g class="eyes">
    <ellipse cx="${100 - dx}" cy="${y}" rx="9" ry="11" fill="${INK}"/>
    <ellipse cx="${100 + dx}" cy="${y}" rx="9" ry="11" fill="${INK}"/>
    <circle cx="${103 - dx}" cy="${y - 4}" r="3.6" fill="#fff"/>
    <circle cx="${103 + dx}" cy="${y - 4}" r="3.6" fill="#fff"/>
  </g>`;
}

function cheeks(y = 128) {
  return `<circle cx="56" cy="${y}" r="10" fill="#FF7F9C" opacity=".35"/>
          <circle cx="144" cy="${y}" r="10" fill="#FF7F9C" opacity=".35"/>`;
}

function mouth(y = 140, w = 12) {
  return `<path d="M${100 - w} ${y} Q100 ${y + 10} ${100 + w} ${y}" stroke="${INK}" stroke-width="3.6" fill="none" stroke-linecap="round"/>
          <ellipse class="mouth" cx="100" cy="${y + 9}" rx="11" ry="10" fill="#8C3242"/>`;
}

function paw(c) {
  return `<g class="paw"><ellipse cx="160" cy="160" rx="19" ry="23" fill="${c.dark}"/>
          <ellipse cx="160" cy="165" rx="10" ry="11" fill="${c.light}"/></g>`;
}

const head = (c) => `<circle cx="100" cy="112" r="68" fill="${c.color}"/>`;
const muzzle = (c, ry = 27) => `<ellipse cx="100" cy="134" rx="36" ry="${ry}" fill="${c.light}"/>`;
const nose = (fill = INK) => `<ellipse cx="100" cy="124" rx="9" ry="6.5" fill="${fill}"/>`;

const FACES = {
  bear: (c) => `
    <circle cx="50" cy="58" r="23" fill="${c.color}"/><circle cx="50" cy="58" r="12" fill="${c.light}"/>
    <circle cx="150" cy="58" r="23" fill="${c.color}"/><circle cx="150" cy="58" r="12" fill="${c.light}"/>
    ${head(c)}${muzzle(c)}${eyes()}${cheeks()}${nose()}${mouth()}`,

  bunny: (c) => `
    <g transform="rotate(-12 72 50)"><ellipse cx="72" cy="50" rx="17" ry="44" fill="${c.color}"/>
      <ellipse cx="72" cy="54" rx="8" ry="32" fill="${c.light}"/></g>
    <g transform="rotate(12 128 50)"><ellipse cx="128" cy="50" rx="17" ry="44" fill="${c.color}"/>
      <ellipse cx="128" cy="54" rx="8" ry="32" fill="${c.light}"/></g>
    ${head(c)}${muzzle(c, 24)}${eyes()}${cheeks()}${nose('#E35D8C')}${mouth()}`,

  kitty: (c) => `
    <path d="M44 86 L50 30 L94 58 Z" fill="${c.color}" stroke="${c.color}" stroke-width="12" stroke-linejoin="round"/>
    <path d="M56 70 L59 44 L80 58 Z" fill="#FFC3D3" stroke="#FFC3D3" stroke-width="6" stroke-linejoin="round"/>
    <path d="M156 86 L150 30 L106 58 Z" fill="${c.color}" stroke="${c.color}" stroke-width="12" stroke-linejoin="round"/>
    <path d="M144 70 L141 44 L120 58 Z" fill="#FFC3D3" stroke="#FFC3D3" stroke-width="6" stroke-linejoin="round"/>
    ${head(c)}${muzzle(c, 24)}${eyes()}${cheeks()}${nose('#F07C9B')}${mouth()}
    <g stroke="${INK}" stroke-width="2.4" stroke-linecap="round" opacity=".55">
      <line x1="66" y1="128" x2="36" y2="122"/><line x1="66" y1="136" x2="36" y2="140"/>
      <line x1="134" y1="128" x2="164" y2="122"/><line x1="134" y1="136" x2="164" y2="140"/></g>`,

  puppy: (c) => `
    ${head(c)}
    <ellipse cx="128" cy="96" rx="20" ry="17" fill="${c.light}" opacity=".9"/>
    ${muzzle(c)}${eyes()}${cheeks()}${nose()}${mouth()}
    <ellipse cx="40" cy="108" rx="20" ry="40" fill="${c.dark}" transform="rotate(18 40 108)"/>
    <ellipse cx="160" cy="108" rx="20" ry="40" fill="${c.dark}" transform="rotate(-18 160 108)"/>`,

  frog: (c) => `
    <circle cx="64" cy="70" r="27" fill="${c.color}"/><circle cx="136" cy="70" r="27" fill="${c.color}"/>
    <ellipse cx="100" cy="122" rx="78" ry="58" fill="${c.color}"/>
    <ellipse cx="100" cy="140" rx="52" ry="30" fill="${c.light}"/>
    <circle cx="64" cy="70" r="17" fill="#fff"/><circle cx="136" cy="70" r="17" fill="#fff"/>
    ${eyes(72, 36)}${cheeks(124)}
    <circle cx="92" cy="116" r="3" fill="${INK}"/><circle cx="108" cy="116" r="3" fill="${INK}"/>
    <path d="M70 132 Q100 150 130 132" stroke="${INK}" stroke-width="3.6" fill="none" stroke-linecap="round"/>
    <ellipse class="mouth" cx="100" cy="146" rx="16" ry="11" fill="#8C3242"/>`,

  chick: (c) => `
    <ellipse cx="92" cy="40" rx="7" ry="16" fill="${c.color}" transform="rotate(-20 92 40)"/>
    <ellipse cx="104" cy="36" rx="7" ry="18" fill="${c.color}"/>
    <ellipse cx="116" cy="42" rx="7" ry="15" fill="${c.color}" transform="rotate(22 116 42)"/>
    ${head(c)}${eyes(102)}${cheeks(126)}
    <ellipse class="mouth" cx="100" cy="134" rx="13" ry="10" fill="#8C3242"/>
    <path d="M84 122 Q100 112 116 122 Q100 134 84 122 Z" fill="#FF9A3C" stroke="#FF9A3C" stroke-width="4" stroke-linejoin="round"/>`,
};

export function faceSVG(c) {
  return `<svg class="face" viewBox="0 0 200 200" aria-hidden="true">
    <g class="body">${FACES[c.kind](c)}${paw(c)}</g></svg>`;
}
