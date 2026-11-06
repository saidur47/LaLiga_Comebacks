// Main file: loads the data, sets up the controls and redraws the charts when the selection changes.

import { API_BASE } from "./config.js";
import { state, data, setState, setOnChange, seasonRange } from "./store.js";
import { COLORS, RESULT_NAMES, HT_NAMES, seasonLabel, pct } from "./utils.js";
import { initScatter, drawScatter } from "./scatter.js";
import { initTimeline, drawTimeline } from "./timeline.js";
import { drawMatrix } from "./matrix.js";
import { drawTable } from "./table.js";
import { initPlay, stopPlay, isPlaying } from "./play.js";

// ---------- loading data from the backend ----------

async function getJSON(path) {
  const response = await fetch(API_BASE + path);
  if (!response.ok) throw new Error("Server error " + response.status + " for " + path);
  return response.json();
}

async function loadTeam(team) {
  if (team && !data.teamRows[team]) {
    const result = await getJSON("/api/teams/" + encodeURIComponent(team) + "/appearances");
    data.teamRows[team] = result.rows;
  }
}

// the server computes the summary of all clubs for the chosen seasons and venue
const summaryCache = {};
async function loadSummary() {
  const [first, last] = seasonRange();
  const key = `${first}-${last}-${state.venue}`;
  if (!summaryCache[key]) {
    summaryCache[key] = await getJSON(`/api/teams/summary?season_min=${first}&season_max=${last}&venue=${state.venue}`);
  }
  data.summary = summaryCache[key];
}

function showError(err) {
  console.error(err);
  const box = document.getElementById("error");
  box.hidden = false;
  box.innerHTML = "Could not load data from the backend at <b>" + API_BASE + "</b>. " +
    "Make sure the backend is running (see README), then refresh the page.";
}

// ---------- text at the top and the selection bar ----------

function drawSummary() {
  const lines = [];
  for (const team of [state.team, state.compare]) {
    if (!team) continue;
    const rows = (data.teamRows[team] || []).filter((r) => {
      const [a, b] = seasonRange();
      return r.season >= a && r.season <= b && (state.venue === "all" || r.venue === state.venue);
    });
    const behind = rows.filter((r) => r.ht === "trail");
    const won = behind.filter((r) => r.ft === "W").length;
    const color = team === state.team ? COLORS.teamA : COLORS.teamB;
    if (rows.length === 0) {
      lines.push(`<b style="color:${color}">${team}</b>: no La Liga matches in this selection`);
      continue;
    }
    lines.push(`<b style="color:${color}">${team}</b>: behind at half-time in <b>${behind.length}</b> of ${rows.length} matches,
      won <b>${won}</b> of them (<b>${pct(behind.length ? won / behind.length : null)}</b>)`);
  }
  if (data.summary) lines.push(`League average: ${pct(data.summary.league.win_rate)} of half-time deficits turned into wins`);
  document.getElementById("summary").innerHTML = lines.join("<br>");
}

function drawSelectionBar() {
  const tags = [`<span class="tag">Club: ${state.team}</span>`];
  if (state.compare) tags.push(tag(`Compared with: ${state.compare}`, "compare"));
  if (state.seasons) tags.push(tag(`Seasons: ${seasonLabel(state.seasons[0])} to ${seasonLabel(state.seasons[1])}`, "seasons"));
  if (state.venue !== "all") tags.push(tag(state.venue === "H" ? "Home matches" : "Away matches", "venue"));
  if (state.cell) tags.push(tag(`Cell: ${HT_NAMES[state.cell.ht]} at HT → ${RESULT_NAMES[state.cell.ft]}`, "cell"));
  document.getElementById("selection").innerHTML = tags.join("");

  // the x button on each tag clears that one filter
  d3.selectAll("#selection button").on("click", function () {
    const what = this.dataset.clear;
    const reset = { compare: null, seasons: null, venue: "all", cell: null };
    setState({ [what]: reset[what] }, "tag");
  });

  // keep the controls in sync with the state
  document.getElementById("team-select").value = state.team;
  document.getElementById("compare-select").value = state.compare || "";
  d3.selectAll(".venue-buttons button").classed("active", function () { return this.dataset.venue === state.venue; });
}

function tag(text, clearKey) {
  return `<span class="tag">${text} <button data-clear="${clearKey}" title="Remove">&times;</button></span>`;
}

// ---------- redrawing after a change ----------

let summaryTimer = null;

async function onChange(changes, source) {
  // any manual change of the seasons (brush, tag, reset) stops the animation
  if (isPlaying() && "seasons" in changes && source !== "play") stopPlay();
  if (source !== "play") d3.select("#play-label").text("");
  try {
    if ("team" in changes || "compare" in changes) {
      await loadTeam(state.team);
      await loadTeam(state.compare);
    }
    if ("seasons" in changes || "venue" in changes) {
      // while dragging the brush, wait a moment so we don't send a request on every mouse move
      clearTimeout(summaryTimer);
      summaryTimer = setTimeout(async () => {
        await loadSummary();
        drawScatter();
        drawSummary();
      }, source === "timeline" ? 200 : 0);
    }
  } catch (err) {
    showError(err);
    return;
  }
  drawAll(source);
}

function drawAll(source) {
  drawSummary();
  drawSelectionBar();
  drawScatter();
  drawTimeline(source);
  drawMatrix();
  drawTable();
}

// ---------- start ----------

async function start() {
  try {
    data.meta = await getJSON("/api/meta");
    await loadTeam(state.team);
    await loadSummary();
  } catch (err) {
    showError(err);
    return;
  }

  // fill the dropdowns
  const teams = data.meta.teams.map((t) => t.team);
  d3.select("#team-select").selectAll("option").data(teams).join("option").attr("value", (d) => d).text((d) => d);
  d3.select("#compare-select").selectAll("option").data(["", ...teams]).join("option")
    .attr("value", (d) => d).text((d) => d || "(none)");

  d3.select("#team-select").on("change", function () {
    const team = this.value;
    setState({ team: team, compare: state.compare === team ? null : state.compare }, "controls");
  });
  d3.select("#compare-select").on("change", function () {
    const value = this.value || null;
    setState({ compare: value === state.team ? null : value }, "controls");
  });
  d3.selectAll(".venue-buttons button").on("click", function () {
    setState({ venue: this.dataset.venue }, "controls");
  });
  d3.select("#reset-btn").on("click", () => {
    setState({ team: "Real Madrid", compare: null, seasons: null, venue: "all", cell: null }, "controls");
  });

  setOnChange(onChange);
  initScatter();
  initTimeline();
  initPlay();
  drawAll();

  // redraw when the window is resized
  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => drawAll(), 200);
  });
}

start();
