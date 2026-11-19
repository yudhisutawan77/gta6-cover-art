// Vice Cover Studio — entry point: build the state, wire the editor, and
// hand over to shot mode when the page is asked for a fixed screenshot scene.

import { freshState } from './state.js';
import { buildEditor } from './editor.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('stage');
const state = freshState();

const editor = buildEditor(state, canvas);

const query = new URLSearchParams(location.search);
const shot = query.get('shot');
if (shot) {
  runShot(shot, query, state, editor);
} else {
  // A friendly first paint: the boulevard sample, so the studio is never empty.
  editor.loadSample('boulevard');
}
