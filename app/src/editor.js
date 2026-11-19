// Vice Cover Studio — the editor wiring: photo loading, the control panel,
// drag-to-pan on the preview, and PNG export. Rendering lives in render.js.

import { GRADES, INKS, LAYOUTS, EXPORT_SIZES, panelCount } from './state.js';
import { drawCover, exportCover, panelAt } from './render.js';

const $ = (id) => document.getElementById(id);

export function buildEditor(state, canvas) {
  const ctx = canvas.getContext('2d');
  const status = $('status');

  function say(text) {
    status.textContent = text;
  }

  function draw() {
    const size = EXPORT_SIZES[state.exportSize];
    if (canvas.width !== size.w || canvas.height !== size.h) {
      canvas.width = size.w;
      canvas.height = size.h;
    }
    drawCover(ctx, state, size.w, size.h);
  }

  // ---- choice rows (layout / ink / grade) ----
  function choiceRow(el, items, current, onPick, swatchOf) {
    el.innerHTML = '';
    items.forEach((item) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'choice-btn' + (item.id === current ? ' is-active' : '');
      btn.dataset.id = item.id;
      if (swatchOf) {
        const dot = document.createElement('span');
        dot.className = 'swatch';
        dot.style.background = swatchOf(item);
        btn.append(dot);
      }
      btn.append(document.createTextNode(item.label));
      btn.addEventListener('click', () => {
        onPick(item.id);
        choiceRow(el, items, item.id, onPick, swatchOf);
        draw();
      });
      el.appendChild(btn);
    });
  }

  function refreshChoices() {
    choiceRow($('layoutRow'), LAYOUTS, state.layout, (id) => {
      state.layout = id;
      state.selectedPanel = 0;
      syncPanelControls();
    });
    choiceRow($('inkRow'), INKS, state.ink, (id) => { state.ink = id; }, (i) => i.fill);
    choiceRow($('gradeRow'), GRADES, state.grade, (id) => { state.grade = id; }, (g) => `linear-gradient(135deg, ${g.top}, ${g.bottom})`);
  }

  // ---- photos ----
  function addPhotoFile(file) {
    return new Promise((resolve, reject) => {
      if (state.photos.length >= 4) {
        say('Four photos is the most — remove one first.');
        resolve(false);
        return;
      }
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        state.photos.push({ name: file.name, img, url });
        state.crops.forEach((crop) => { if (crop.photo >= state.photos.length) crop.photo = 0; });
        refreshThumbs();
        syncPanelControls();
        draw();
        say(`Loaded “${file.name}” — drag on the preview to frame it.`);
        resolve(true);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        say(`Could not read “${file.name}” as an image.`);
        reject(new Error('bad image'));
      };
      img.src = url;
    });
  }

  async function loadSample(name) {
    try {
      const res = await fetch(`./samples/${name}.jpg`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      await addPhotoFile(new File([blob], `${name}.jpg`, { type: 'image/jpeg' }));
    } catch (err) {
      say(`Sample “${name}” did not load: ${err.message}`);
    }
  }

  function refreshThumbs() {
    const row = $('thumbRow');
    row.innerHTML = '';
    state.photos.forEach((photo, i) => {
      const thumb = document.createElement('img');
      thumb.className = 'thumb' + (state.crops[state.selectedPanel]?.photo === i ? ' is-active' : '');
      thumb.src = photo.url;
      thumb.alt = photo.name;
      thumb.title = photo.name;
      thumb.addEventListener('click', () => {
        state.crops[state.selectedPanel].photo = i;
        refreshThumbs();
        syncPanelControls();
        draw();
      });
      row.appendChild(thumb);
    });
  }

  // ---- per-panel controls ----
  function syncPanelControls() {
    const select = $('panelPhoto');
    select.innerHTML = '';
    state.photos.forEach((photo, i) => {
      const opt = document.createElement('option');
      opt.value = String(i);
      opt.textContent = `${i + 1} · ${photo.name}`;
      select.appendChild(opt);
    });
    if (state.photos.length === 0) {
      const opt = document.createElement('option');
      opt.textContent = 'No photo yet';
      select.appendChild(opt);
    }
    const crop = state.crops[state.selectedPanel];
    select.value = String(crop.photo);
    $('zoomRange').value = String(Math.round(crop.zoom * 100));
  }

  // ---- drag to pan the panel under the cursor ----
  let drag = null;
  function coverPoint(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  canvas.addEventListener('pointerdown', (event) => {
    const p = coverPoint(event);
    const hit = panelAt(state, canvas.width, canvas.height, p.x, p.y);
    if (hit < 0 || hit >= panelCount(state)) return;
    state.selectedPanel = hit;
    refreshThumbs();
    syncPanelControls();
    const crop = state.crops[hit];
    drag = { startX: p.x, startY: p.y, dx: crop.dx, dy: crop.dy };
    canvas.setPointerCapture(event.pointerId);
  });

  canvas.addEventListener('pointermove', (event) => {
    if (!drag) return;
    const p = coverPoint(event);
    const crop = state.crops[state.selectedPanel];
    crop.dx = drag.dx + (p.x - drag.startX);
    crop.dy = drag.dy + (p.y - drag.startY);
    draw();
  });

  canvas.addEventListener('pointerup', () => { drag = null; });
  canvas.addEventListener('pointercancel', () => { drag = null; });

  // ---- control events ----
  $('fileInput').addEventListener('change', async (event) => {
    for (const file of event.target.files) await addPhotoFile(file);
    event.target.value = '';
  });

  document.querySelectorAll('.sample-btn').forEach((btn) => {
    btn.addEventListener('click', () => loadSample(btn.dataset.sample));
  });

  $('panelPhoto').addEventListener('change', (event) => {
    state.crops[state.selectedPanel].photo = Number(event.target.value);
    refreshThumbs();
    draw();
  });

  $('zoomRange').addEventListener('input', (event) => {
    state.crops[state.selectedPanel].zoom = Number(event.target.value) / 100;
    draw();
  });

  $('autoFillBtn').addEventListener('click', () => {
    const crop = state.crops[state.selectedPanel];
    crop.zoom = 1;
    crop.dx = 0;
    crop.dy = 0;
    syncPanelControls();
    draw();
    say('Panel reset to auto-fill.');
  });

  $('titleInput').addEventListener('input', (event) => {
    state.title = event.target.value.trim() === '' ? ' ' : event.target.value.toUpperCase();
    draw();
  });

  $('subInput').addEventListener('input', (event) => {
    state.subtitle = event.target.value;
    draw();
  });

  $('captionPos').addEventListener('change', (event) => {
    state.captionPos = event.target.value;
    draw();
  });

  $('gradeRange').addEventListener('input', (event) => {
    state.gradeStrength = Number(event.target.value) / 100;
    draw();
  });

  $('sunCheck').addEventListener('change', (event) => {
    state.sun = event.target.checked;
    draw();
  });
  $('grainCheck').addEventListener('change', (event) => {
    state.grain = event.target.checked;
    draw();
  });
  $('vignetteCheck').addEventListener('change', (event) => {
    state.vignette = event.target.checked;
    draw();
  });

  document.querySelectorAll('.size-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.exportSize = btn.dataset.export;
      document.querySelectorAll('.size-btn').forEach((b) => b.classList.toggle('is-active', b === btn));
      draw();
    });
  });

  $('exportBtn').addEventListener('click', async () => {
    const size = EXPORT_SIZES[state.exportSize];
    $('exportBtn').disabled = true;
    say(`Exporting ${size.w} × ${size.h} PNG…`);
    try {
      const blob = await exportCover(state, size);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vice-cover-${size.w}x${size.h}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      say(`Exported ${size.w} × ${size.h} PNG — check your downloads.`);
    } catch (err) {
      say(`Export failed: ${err.message}`);
    } finally {
      $('exportBtn').disabled = false;
    }
  });

  // Drag-and-drop anywhere on the page.
  window.addEventListener('dragover', (event) => event.preventDefault());
  window.addEventListener('drop', async (event) => {
    event.preventDefault();
    const files = [...(event.dataTransfer?.files ?? [])].filter((f) => f.type.startsWith('image/'));
    for (const file of files) await addPhotoFile(file);
  });

  refreshChoices();
  syncPanelControls();
  draw();
  return { draw, loadSample, say };
}
