// The selection state and the data from the backend.
// Every chart reads from here; no chart keeps its own copy of the selection.

export const state = {
  team: "Real Madrid",  // selected club
  compare: null,        // comparison club (or null)
  seasons: null,        // [firstSeason, lastSeason] or null for all seasons
  venue: "all",         // "all", "H" (home) or "A" (away)
  cell: null,           // selected matrix cell, e.g. { ht: "trail", ft: "W" }
};

export const data = {
  meta: null,      // seasons and clubs
  teamRows: {},    // club name -> list of all its matches
  summary: null,   // all clubs aggregated by the server for the current seasons/venue
};

// main.js sets this so it can redraw the charts after every change
let onChange = () => {};
export function setOnChange(fn) {
  onChange = fn;
}

export function setState(changes, source) {
  Object.assign(state, changes);
  onChange(changes, source);
}

export function seasonRange() {
  if (state.seasons) return state.seasons;
  return [data.meta.season_min, data.meta.season_max];
}

// One club's matches filtered by the current seasons and venue
export function getRows(team, allSeasons = false) {
  const rows = data.teamRows[team] || [];
  const [first, last] = allSeasons ? [0, 9999] : seasonRange();
  return rows.filter((r) =>
    r.season >= first && r.season <= last &&
    (state.venue === "all" || r.venue === state.venue));
}

export function selectedTeams() {
  return state.compare ? [state.team, state.compare] : [state.team];
}
