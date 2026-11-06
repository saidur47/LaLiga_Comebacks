// Chart 4: list of the individual matches behind the current selection.

import { state, getRows, selectedTeams } from "./store.js";
import { COLORS, RESULT_NAMES, HT_NAMES, seasonLabel } from "./utils.js";

const MAX_ROWS = 150;

export function drawTable() {
  // which matches to show: the selected matrix cell, or by default all matches behind at half-time
  let matches = [];
  for (const team of selectedTeams()) {
    for (const r of getRows(team)) {
      const keep = state.cell ? r.ht === state.cell.ht && r.ft === state.cell.ft : r.ht === "trail";
      if (keep) matches.push({ ...r, team });
    }
  }
  matches.sort((a, b) => (a.date < b.date ? 1 : -1)); // newest first

  const what = state.cell
    ? `${HT_NAMES[state.cell.ht].toLowerCase()} at half-time, then ${RESULT_NAMES[state.cell.ft].toLowerCase()}`
    : "behind at half-time";
  d3.select("#match-count").text(`(${matches.length} matches ${what})`);

  const box = d3.select("#table");
  if (matches.length === 0) {
    box.html(`<p class="empty-msg">No matches ${what} in this selection. Try removing a filter.</p>`);
    return;
  }

  const showClub = state.compare !== null;
  let html = "<table><tr><th>Date</th><th>Season</th>";
  if (showClub) html += "<th>Club</th>";
  html += "<th>Opponent</th><th>Venue</th><th>Half-time</th><th>Full-time</th><th>Result</th></tr>";

  for (const m of matches.slice(0, MAX_ROWS)) {
    const clubColor = m.team === state.team ? COLORS.teamA : COLORS.teamB;
    html += `<tr><td>${m.date}</td><td>${seasonLabel(m.season)}</td>`;
    if (showClub) html += `<td><span style="color:${clubColor}">&#9679;</span> ${m.team}</td>`;
    html += `<td>${m.opponent}</td><td>${m.venue === "H" ? "Home" : "Away"}</td>
      <td>${m.gf_ht}-${m.ga_ht}</td><td>${m.gf}-${m.ga}</td>
      <td><span class="result" style="background:${COLORS[m.ft]}">${m.ft}</span></td></tr>`;
  }
  html += "</table>";
  if (matches.length > MAX_ROWS) {
    html += `<p class="caption">Showing the newest ${MAX_ROWS} of ${matches.length}. Select fewer seasons to see the rest.</p>`;
  }
  box.html(html);
}
