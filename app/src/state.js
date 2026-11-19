// Vice Cover Studio — the cover's state: which photos, which layout, which words,
// which grade. Plain data only; rendering lives in render.js, wiring in editor.js.

export const LAYOUTS = [
  { id: 'vice-five', label: 'Vice Five', panels: 5 },
  { id: 'duo-split', label: 'Duo Split', panels: 2 },
  { id: 'trio-strip', label: 'Trio Strip', panels: 3 },
  { id: 'full-bleed', label: 'Full Bleed', panels: 1 },
];

export const GRADES = [
  { id: 'sunset', label: 'Vice Sunset', top: '#ff2e88', bottom: '#ff9a3d', sky: '#ff5e7a' },
  { id: 'neon', label: 'Neon Nights', top: '#19e3d6', bottom: '#ff2e88', sky: '#b537f2' },
  { id: 'dusk', label: 'Palm Dusk', top: '#19c8c8', bottom: '#7b2ff7', sky: '#3b2d8f' },
  { id: 'gold', label: 'Gold Hour', top: '#ffd166', bottom: '#ff6b35', sky: '#ff9a3d' },
];

export const INKS = [
  { id: 'white', label: 'White', fill: '#ffffff', outline: '#1d0b2e' },
  { id: 'sun', label: 'Sunset', fill: '#ffd166', outline: '#7a1040' },
  { id: 'neon', label: 'Neon Pink', fill: '#ff2e88', outline: '#ffffff' },
  { id: 'aqua', label: 'Aqua', fill: '#19e3d6', outline: '#0b2e3d' },
];

export const EXPORT_SIZES = {
  '1080x1080': { w: 1080, h: 1080 },
  '1080x1350': { w: 1080, h: 1350 },
  '1920x1080': { w: 1920, h: 1080 },
};

// One crop per panel: which loaded photo it shows, its zoom (1 = cover-fit)
// and its pan in cover pixels. Reset by "Auto-fill".
export function freshCrop() {
  return { photo: 0, zoom: 1, dx: 0, dy: 0 };
}

export function freshState() {
  return {
    layout: 'vice-five',
    photos: [], // { name, img, url }
    crops: [freshCrop(), freshCrop(), freshCrop(), freshCrop(), freshCrop()],
    selectedPanel: 0,
    title: 'VICE CITY',
    subtitle: 'One last job under the neon sun',
    ink: 'white',
    captionPos: 'band',
    grade: 'sunset',
    gradeStrength: 0.7,
    sun: true,
    grain: true,
    vignette: true,
    exportSize: '1920x1080',
  };
}

export function gradeById(id) {
  return GRADES.find((g) => g.id === id) ?? GRADES[0];
}

export function inkById(id) {
  return INKS.find((i) => i.id === id) ?? INKS[0];
}

export function layoutById(id) {
  return LAYOUTS.find((l) => l.id === id) ?? LAYOUTS[0];
}

export function panelCount(state) {
  return layoutById(state.layout).panels;
}
