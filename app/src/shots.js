// Fixed scenes for screenshots: ?shot=editor shows the studio with a sample
// photo loaded; ?shot=cover shows the cover alone, full-bleed, at the size the
// query asks for. window.__shotReady is set once the cover is painted.

import { EXPORT_SIZES } from './state.js';

function waitFonts() {
  return document.fonts ? document.fonts.ready : Promise.resolve();
}

export async function runShot(shot, query, state, editor) {
  const photoName = query.get('photo') ?? 'pier';
  const caption = query.get('caption') ?? 'VICE CITY';
  const layout = query.get('layout');
  const sizeKey = query.get('size') ?? '1920x1080';

  if (layout) state.layout = layout;
  state.title = caption.toUpperCase();
  state.subtitle = query.get('sub') ?? state.subtitle;
  const grade = query.get('grade');
  if (grade) state.grade = grade;

  if (shot === 'cover') {
    document.body.classList.add('shot-cover');
    const size = EXPORT_SIZES[sizeKey] ?? EXPORT_SIZES['1920x1080'];
    state.exportSize = sizeKey in EXPORT_SIZES ? sizeKey : '1920x1080';
    const canvas = document.getElementById('stage');
    canvas.width = size.w;
    canvas.height = size.h;
  }

  await editor.loadSample(photoName);
  // A second sample in a spare panel shows the multi-photo story in one shot.
  if (query.get('second')) {
    await editor.loadSample(query.get('second'));
    state.crops[1].photo = 1;
    state.crops[3].photo = 1;
  }
  // Nudge the hero crop down a touch so a square sample's subject (a face
  // near the top) stays in the wide hero panel instead of cropping out.
  const size = EXPORT_SIZES[state.exportSize] ?? EXPORT_SIZES['1920x1080'];
  state.crops[0].dy = size.w > size.h
    ? Math.round(size.h * 0.22)
    : Math.round(size.h * 0.07);
  await waitFonts();
  editor.draw();
  requestAnimationFrame(() => requestAnimationFrame(() => {
    window.__shotReady = true;
  }));
}
