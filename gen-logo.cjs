const sharp = require('sharp');

const f = n => n.toFixed(2);
const W = 512, CX = 256;

const NAVY = '#1E3A8A';
const MID  = '#2D59B5';
const TEAL = '#13C4BE';
const GOLD = '#FACC15';
const WHITE = '#FFFFFF';
const BG   = '#F0F4FF';

// Building (upside-down U): outer left/right, roof shoulder + peak, inner walls
const BX1 = 52, BX2 = 460;
const BY_S = 74, BY_P = 48;   // shoulder y, peak y
const BX1i = 96, BX2i = 416;
const BY1i = 102;              // inner ceiling
const BYBOT = 515;

const building = [
  `M${BX1},${BYBOT}`,
  `L${BX1},${BY_S}`,
  `L${CX},${BY_P}`,
  `L${BX2},${BY_S}`,
  `L${BX2},${BYBOT}`,
  `L${BX2i},${BYBOT}`,
  `L${BX2i},${BY1i}`,
  `L${BX1i},${BY1i}`,
  `L${BX1i},${BYBOT}`,
  'Z'
].join(' ');

// Arch header inside building: navy dome at top of inner room
const ARCH_B = 210, ARCH_C = 174;
const arch = [
  `M${BX1i},${ARCH_B}`,
  `Q${CX},${ARCH_C} ${BX2i},${ARCH_B}`,
  `L${BX2i},${BY1i}`,
  `L${BX1i},${BY1i}`,
  'Z'
].join(' ');

// arch center bottom: 0.25*210 + 0.5*174 + 0.25*210 = 52.5+87+52.5 = 192
// Text baseline at 163, cap-top at ~136 — well inside arch

const TEXT_Y = 163;
const STOX_X = 240;  // center of "STOX" portion
const YBOLT_X = 316; // center of Y-bolt

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${W}">
<defs>
  <clipPath id="inside">
    <rect x="${BX1i}" y="${BY1i}" width="${BX2i - BX1i}" height="${BYBOT}"/>
  </clipPath>
</defs>

<rect width="${W}" height="${W}" rx="40" fill="${BG}"/>

<!-- Warehouse building silhouette (midnight blue) -->
<path d="${building}" fill="${NAVY}"/>

<g clip-path="url(#inside)">

  <!-- White room -->
  <rect x="${BX1i}" y="${BY1i}" width="${BX2i - BX1i}" height="${BYBOT}" fill="${WHITE}"/>

  <!-- Circuit board dots + lines -->
  <g fill="${TEAL}" opacity="0.38">
    <circle cx="168" cy="268" r="2.5"/><circle cx="194" cy="281" r="2"/>
    <circle cx="154" cy="286" r="2"/><circle cx="228" cy="271" r="2.5"/>
    <circle cx="254" cy="264" r="2"/><circle cx="276" cy="273" r="2.5"/>
    <circle cx="298" cy="267" r="2"/><circle cx="322" cy="276" r="2.5"/>
    <circle cx="342" cy="263" r="2"/><circle cx="364" cy="278" r="2.5"/>
  </g>
  <g stroke="${TEAL}" stroke-width="1.2" opacity="0.28" fill="none">
    <line x1="168" y1="268" x2="194" y2="281"/>
    <line x1="194" y1="281" x2="154" y2="286"/>
    <line x1="228" y1="271" x2="254" y2="264"/>
    <line x1="254" y1="264" x2="276" y2="273"/>
    <line x1="276" y1="273" x2="298" y2="267"/>
    <line x1="298" y1="267" x2="322" y2="276"/>
    <line x1="322" y1="276" x2="342" y2="263"/>
    <line x1="342" y1="263" x2="364" y2="278"/>
  </g>

  <!-- Ladder (left) -->
  <g stroke="${MID}" stroke-width="3" stroke-linecap="round" fill="none" opacity="0.88">
    <line x1="118" y1="263" x2="118" y2="378"/>
    <line x1="134" y1="263" x2="134" y2="378"/>
    <line x1="118" y1="280" x2="134" y2="280"/>
    <line x1="118" y1="298" x2="134" y2="298"/>
    <line x1="118" y1="316" x2="134" y2="316"/>
    <line x1="118" y1="334" x2="134" y2="334"/>
    <line x1="118" y1="352" x2="134" y2="352"/>
    <line x1="118" y1="370" x2="134" y2="370"/>
  </g>

  <!-- Stacked crates -->
  <g opacity="0.88">
    <rect x="154" y="346" width="52" height="32" rx="2" fill="${MID}"/>
    <rect x="158" y="315" width="46" height="30" rx="2" fill="${MID}"/>
    <rect x="162" y="286" width="40" height="28" rx="2" fill="${MID}"/>
    <line x1="154" y1="360" x2="206" y2="360" stroke="${WHITE}" stroke-width="0.8" opacity="0.3"/>
    <line x1="180" y1="346" x2="180" y2="378" stroke="${WHITE}" stroke-width="0.8" opacity="0.3"/>
    <line x1="158" y1="329" x2="204" y2="329" stroke="${WHITE}" stroke-width="0.8" opacity="0.3"/>
    <line x1="181" y1="315" x2="181" y2="345" stroke="${WHITE}" stroke-width="0.8" opacity="0.3"/>
    <line x1="162" y1="300" x2="202" y2="300" stroke="${WHITE}" stroke-width="0.8" opacity="0.3"/>
    <line x1="182" y1="286" x2="182" y2="314" stroke="${WHITE}" stroke-width="0.8" opacity="0.3"/>
  </g>

  <!-- Forklift -->
  <g fill="${MID}" opacity="0.88">
    <rect x="224" y="330" width="30" height="42" rx="3"/>
    <rect x="252" y="262" width="5" height="70" rx="1"/>
    <rect x="250" y="276" width="14" height="22" rx="1"/>
    <rect x="192" y="350" width="32" height="5" rx="1"/>
    <rect x="192" y="359" width="32" height="5" rx="1"/>
    <circle cx="229" cy="374" r="6"/>
    <circle cx="249" cy="374" r="6"/>
  </g>
  <rect x="228" y="334" width="22" height="15" rx="2" fill="${WHITE}" opacity="0.22"/>

  <!-- Speedometer -->
  <g transform="translate(333,341)">
    <path d="M-33,0 A33,33 0 0 0 33,0" fill="none" stroke="${MID}" stroke-width="4.5" stroke-linecap="round" opacity="0.88"/>
    <g stroke="${MID}" stroke-width="2" opacity="0.55">
      <line x1="0" y1="-27" x2="0" y2="-32" transform="rotate(-80)"/>
      <line x1="0" y1="-27" x2="0" y2="-32" transform="rotate(-40)"/>
      <line x1="0" y1="-27" x2="0" y2="-32" transform="rotate(0)"/>
      <line x1="0" y1="-27" x2="0" y2="-32" transform="rotate(40)"/>
      <line x1="0" y1="-27" x2="0" y2="-32" transform="rotate(80)"/>
    </g>
    <line x1="0" y1="4" x2="0" y2="-25" stroke="${GOLD}" stroke-width="3" stroke-linecap="round" transform="rotate(30)"/>
    <circle r="5.5" fill="${MID}" opacity="0.88"/>
  </g>

  <!-- Server rack (right) -->
  <g fill="${MID}" opacity="0.88">
    <rect x="372" y="290" width="28" height="13" rx="2"/>
    <rect x="372" y="307" width="28" height="13" rx="2"/>
    <rect x="372" y="324" width="28" height="13" rx="2"/>
    <rect x="372" y="341" width="28" height="35" rx="2"/>
  </g>
  <g stroke="${WHITE}" stroke-width="0.8" opacity="0.22" fill="none">
    <line x1="377" y1="297" x2="396" y2="297"/>
    <line x1="377" y1="314" x2="396" y2="314"/>
    <line x1="377" y1="331" x2="396" y2="331"/>
    <circle cx="379" cy="353" r="3"/>
  </g>

  <!-- Floor line -->
  <line x1="${BX1i}" y1="384" x2="${BX2i}" y2="384" stroke="${TEAL}" stroke-width="2.5" opacity="0.6"/>
  <g transform="translate(256,378)" opacity="0.78">
    <rect x="-8" y="-6" width="16" height="11" rx="2" fill="${TEAL}" opacity="0.28" stroke="${TEAL}" stroke-width="1.5"/>
    <rect x="-3" y="-14" width="3" height="8" rx="1" fill="${TEAL}"/>
    <rect x="2.5" y="-14" width="3" height="8" rx="1" fill="${TEAL}"/>
  </g>
  <circle cx="108" cy="384" r="4" fill="${TEAL}" opacity="0.6"/>
  <circle cx="404" cy="384" r="4" fill="${TEAL}" opacity="0.6"/>

  <!-- Arch header (navy dome over top of room) -->
  <path d="${arch}" fill="${NAVY}"/>

  <!-- STOX text (white) -->
  <text x="${STOX_X}" y="${TEXT_Y}"
    text-anchor="middle"
    font-family="'Arial Black', Impact, Arial, sans-serif"
    font-weight="900"
    font-size="38"
    letter-spacing="5"
    fill="${WHITE}">STOX</text>

  <!-- Y-bolt: Y shape, dramatic zigzag stem, gold -->
  <g transform="translate(${YBOLT_X},${TEXT_Y})"
     stroke="${GOLD}" stroke-width="9"
     stroke-linecap="round" fill="none">
    <line x1="-10" y1="-27" x2="0" y2="-10"/>
    <line x1="10" y1="-27" x2="0" y2="-10"/>
    <polyline points="0,-10 11,-2 -3,8" stroke-linejoin="bevel"/>
  </g>

</g>
</svg>`;

const buf = Buffer.from(svg);
Promise.all([
  sharp(buf).resize(256, 256).png().toFile('public/logo.png'),
  sharp(buf).resize(192, 192).png().toFile('public/icons/icon-192.png'),
  sharp(buf).resize(512, 512).png().toFile('public/icons/icon-512.png'),
]).then(() => console.log('done')).catch(e => { console.error(e.message); process.exit(1); });
