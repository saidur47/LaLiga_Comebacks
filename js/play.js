// Extra feature: animate through the seasons with a Play button.
// Each step moves a window of N seasons forward by one season, and every chart
// updates for that window, so you can watch clubs move in chart 1 over time.

import { state, data, setState } from "./store.js";
import { seasonLabel } from "./utils.js";

let timer = null;

export function initPlay() {
  d3.select("#play-btn").on("click", () => (timer ? stopPlay() : startPlay()));
}

export function isPlaying() {
  return timer !== null;
}

function startPlay() {
  const size = +document.getElementById("window-size").value;
  const first = data.meta.season_min;
  const last = data.meta.season_max - size + 1;

  // start from the current position if a window of the same size is already selected
  let start = first;
  if (state.seasons && state.seasons[1] - state.seasons[0] + 1 === size && state.seasons[0] < last) {
    start = state.seasons[0] + 1;
  }

  d3.select("#play-btn").text("⏸ Pause");
  const step = () => {
    setState({ seasons: [start, start + size - 1] }, "play");
    d3.select("#play-label").text(`Showing ${seasonLabel(start)} to ${seasonLabel(start + size - 1)}`);
    start++;
    if (start > last) stopPlay();
  };
  step();
  timer = setInterval(step, 1200);
}

export function stopPlay() {
  clearInterval(timer);
  timer = null;
  d3.select("#play-btn").text("▶ Play seasons");
}
