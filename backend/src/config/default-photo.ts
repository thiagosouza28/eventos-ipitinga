const DEFAULT_PHOTO_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="300" height="400" viewBox="0 0 300 400" role="img" aria-label="Foto padrão do participante">
  <rect width="300" height="400" fill="#eef3fa"/>
  <rect x="12" y="12" width="276" height="376" fill="none" stroke="#d4deeb" stroke-width="3"/>
  <circle cx="150" cy="142" r="62" fill="#d7e1ef" stroke="#8798b2" stroke-width="4"/>
  <path d="M48 354c7-83 45-125 102-125s95 42 102 125" fill="#d7e1ef" stroke="#8798b2" stroke-width="4" stroke-linecap="round"/>
  <path d="M74 354h152" stroke="#8798b2" stroke-width="4" stroke-linecap="round"/>
</svg>`;

export const DEFAULT_PHOTO_DATA_URL = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(DEFAULT_PHOTO_SVG)}`;
