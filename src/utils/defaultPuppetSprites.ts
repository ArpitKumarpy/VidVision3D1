/**
 * Default starter sprite pack for Custom 2D Puppet testing
 * Generates crisp SVG Data URLs for Head, Torso, Arms, and Legs
 */

function createSvgDataUrl(svgString: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svgString)}`;
}

export const STARTER_PUPPET_SPRITES = {
  head: createSvgDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
      <!-- Hair / Helmet -->
      <path d="M20,60 C20,20 100,20 100,60 C100,70 95,85 85,95 C75,105 45,105 35,95 C25,85 20,70 20,60 Z" fill="#3b82f6" />
      <circle cx="60" cy="58" r="38" fill="#fde047" stroke="#1e293b" stroke-width="4"/>
      <!-- Eyes -->
      <ellipse cx="48" cy="54" rx="6" ry="8" fill="#0f172a" />
      <circle cx="46" cy="51" r="2.5" fill="#ffffff" />
      <ellipse cx="72" cy="54" rx="6" ry="8" fill="#0f172a" />
      <circle cx="70" cy="51" r="2.5" fill="#ffffff" />
      <!-- Blush -->
      <ellipse cx="40" cy="66" rx="6" ry="3" fill="#f87171" opacity="0.6"/>
      <ellipse cx="80" cy="66" rx="6" ry="3" fill="#f87171" opacity="0.6"/>
      <!-- Smile -->
      <path d="M52,68 Q60,78 68,68" fill="none" stroke="#0f172a" stroke-width="3.5" stroke-linecap="round"/>
      <!-- Cap Visor -->
      <path d="M30,35 Q60,25 90,35" fill="none" stroke="#1d4ed8" stroke-width="8" stroke-linecap="round"/>
    </svg>
  `),

  torso: createSvgDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 130" width="100" height="130">
      <!-- Jacket / Shirt -->
      <path d="M20,10 L80,10 L90,110 L10,110 Z" fill="#ef4444" stroke="#1e293b" stroke-width="4"/>
      <!-- Collar -->
      <polygon points="50,45 32,10 68,10" fill="#ffffff" stroke="#1e293b" stroke-width="3"/>
      <!-- Tie / Logo -->
      <polygon points="46,45 54,45 57,80 50,92 43,80" fill="#fbbf24" stroke="#1e293b" stroke-width="2"/>
      <!-- Belt -->
      <rect x="10" y="105" width="80" height="16" fill="#1e293b"/>
      <rect x="42" y="103" width="16" height="20" fill="#f59e0b" stroke="#0f172a" stroke-width="2"/>
    </svg>
  `),

  upperArm: createSvgDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 50" width="120" height="50">
      <!-- Arm Capsule (horizontal from pivot 0,25 to 120,25) -->
      <rect x="5" y="10" width="110" height="30" rx="15" fill="#ef4444" stroke="#1e293b" stroke-width="4"/>
      <circle cx="15" cy="25" r="8" fill="#ffffff" opacity="0.3"/>
      <!-- Stripe -->
      <line x1="60" y1="10" x2="60" y2="40" stroke="#ffffff" stroke-width="4"/>
    </svg>
  `),

  forearm: createSvgDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 50" width="120" height="50">
      <!-- Forearm & Glove -->
      <rect x="5" y="12" width="85" height="26" rx="13" fill="#f87171" stroke="#1e293b" stroke-width="4"/>
      <!-- Glove / Hand -->
      <circle cx="100" cy="25" r="16" fill="#fde047" stroke="#1e293b" stroke-width="4"/>
      <circle cx="108" cy="20" r="5" fill="#fde047" stroke="#1e293b" stroke-width="3"/>
    </svg>
  `),

  thigh: createSvgDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 60" width="120" height="60">
      <!-- Jean Thigh -->
      <rect x="5" y="12" width="110" height="36" rx="18" fill="#2563eb" stroke="#1e293b" stroke-width="4"/>
      <line x1="20" y1="30" x2="100" y2="30" stroke="#1d4ed8" stroke-width="3" stroke-dasharray="6,4"/>
    </svg>
  `),

  shin: createSvgDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 130 60" width="130" height="60">
      <!-- Jean Shin -->
      <rect x="5" y="15" width="85" height="30" rx="15" fill="#1d4ed8" stroke="#1e293b" stroke-width="4"/>
      <!-- Sneaker / Shoe -->
      <path d="M80,12 L115,12 C125,12 125,48 115,48 L80,48 Z" fill="#ffffff" stroke="#1e293b" stroke-width="4"/>
      <rect x="80" y="40" width="45" height="8" fill="#ef4444"/>
    </svg>
  `),
};

/**
 * Creates and downloads a downloadable SVG / guide template for artists
 */
export function downloadPuppetArtistTemplate() {
  const templateSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600" style="background:#0f172a">
  <style>
    .label { font-family: sans-serif; font-size: 14px; font-weight: bold; fill: #38bdf8; }
    .sub { font-family: sans-serif; font-size: 11px; fill: #94a3b8; }
    .box { fill: #1e293b; stroke: #38bdf8; stroke-dasharray: 4,4; stroke-width: 2; rx: 12; }
    .pivot { fill: #ef4444; stroke: #ffffff; stroke-width: 2; }
  </style>

  <!-- Title -->
  <text x="400" y="40" text-anchor="middle" font-family="sans-serif" font-size="22" font-weight="bold" fill="#ffffff">VidVision3D — 2D Puppet Sprite Template Guide</text>
  <text x="400" y="65" text-anchor="middle" class="sub">Draw your transparent PNG sprites inside each section. Red circles indicate the joint pivot anchors.</text>

  <!-- Head Box -->
  <rect x="50" y="90" width="200" height="200" class="box" />
  <text x="150" y="120" text-anchor="middle" class="label">1. HEAD (200 x 200)</text>
  <text x="150" y="140" text-anchor="middle" class="sub">Pivot at Neck Base</text>
  <circle cx="150" cy="260" r="7" class="pivot" />

  <!-- Torso Box -->
  <rect x="290" y="90" width="220" height="260" class="box" />
  <text x="400" y="120" text-anchor="middle" class="label">2. TORSO (220 x 260)</text>
  <text x="400" y="140" text-anchor="middle" class="sub">Mid-Hip to Mid-Shoulder</text>
  <circle cx="400" cy="320" r="7" class="pivot" />
  <circle cx="400" cy="160" r="7" class="pivot" />

  <!-- Arms Box -->
  <rect x="550" y="90" width="200" height="120" class="box" />
  <text x="650" y="120" text-anchor="middle" class="label">3. UPPER ARM (Horizontal)</text>
  <text x="650" y="140" text-anchor="middle" class="sub">Left Pivot (Shoulder)</text>
  <circle cx="570" cy="170" r="7" class="pivot" />

  <rect x="550" y="230" width="200" height="120" class="box" />
  <text x="650" y="260" text-anchor="middle" class="label">4. FOREARM &amp; HAND</text>
  <text x="650" y="280" text-anchor="middle" class="sub">Left Pivot (Elbow)</text>
  <circle cx="570" cy="310" r="7" class="pivot" />

  <!-- Legs Box -->
  <rect x="50" y="380" width="320" height="180" class="box" />
  <text x="210" y="415" text-anchor="middle" class="label">5. THIGH / UPPER LEG</text>
  <text x="210" y="435" text-anchor="middle" class="sub">Left Pivot (Hip) -> Right (Knee)</text>
  <circle cx="80" cy="490" r="7" class="pivot" />

  <rect x="430" y="380" width="320" height="180" class="box" />
  <text x="590" y="415" text-anchor="middle" class="label">6. SHIN &amp; FOOT</text>
  <text x="590" y="435" text-anchor="middle" class="sub">Left Pivot (Knee) -> Right (Foot)</text>
  <circle cx="460" cy="490" r="7" class="pivot" />
</svg>
  `;

  const blob = new Blob([templateSvg], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'puppet_sprite_template_guide.svg';
  a.click();
  URL.revokeObjectURL(url);
}
