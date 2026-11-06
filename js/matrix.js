// Chart 3: half-time situation (rows) vs final result (columns), one table per selected club.
// Clicking a cell highlights those matches in charts 2 and 4 (coordination pair 3).

import { state, data, setState, getRows, selectedTeams } from "./store.js";
import { COLORS, RESULT_NAMES, HT_NAMES, pct, showTooltip, moveTooltip, hideTooltip } from "./utils.js";

const ROWS = ["lead", "level", "trail"];
const COLS = ["W", "D", "L"];

export function drawMatrix() {
  const box = d3.select("#matrix");
  box.html(""); // simple approach: rebuild the tables each time

  for (const team of selectedTeams()) {
    const rows = getRows(team);
    const color = team === state.team ? COLORS.teamA : COLORS.teamB;
    const shade = d3.scaleLinear().domain([0, 1]).range(["#ffffff", color]);

    if (rows.length === 0) {
      box.append("p").attr("class", "empty-msg").text(`${team}: no matches in this selection.`);
      continue;
    }

    // count matches in each cell
    const counts = {};
    for (const ht of ROWS) counts[ht] = { W: 0, D: 0, L: 0, total: 0 };
    for (const r of rows) {
      counts[r.ht][r.ft]++;
      counts[r.ht].total++;
    }

    const table = box.append("table").attr("class", "matrix-table");
    table.append("caption").html(`<span style="color:${color}">&#9679;</span> ${team}`);
    const head = table.append("tr");
    head.append("th").text("Half-time \\ Final");
    for (const ft of COLS) head.append("th").text(RESULT_NAMES[ft]);
    head.append("th").text("Total");

    for (const ht of ROWS) {
      const tr = table.append("tr");
      tr.append("th").style("text-align", "right").text(HT_NAMES[ht]);
      for (const ft of COLS) {
        const n = counts[ht][ft];
        const share = counts[ht].total ? n / counts[ht].total : 0;
        const selected = state.cell && state.cell.ht === ht && state.cell.ft === ft;
        tr.append("td")
          .attr("class", "cell" + (selected ? " selected" : ""))
          .style("background", shade(share))
          .style("color", share > 0.5 ? "white" : "black")
          .html(`<b>${n}</b>${pct(share, 0)}`)
          .on("click", () => {
            hideTooltip();
            setState({ cell: selected ? null : { ht, ft } }, "matrix");
          })
          .on("mouseover", (event) => showTooltip(cellTooltip(team, ht, ft, n, counts[ht].total), event))
          .on("mousemove", moveTooltip)
          .on("mouseout", hideTooltip);
      }
      tr.append("th").text(counts[ht].total);
    }
  }
}

function cellTooltip(team, ht, ft, n, rowTotal) {
  let html = `<b>${team}</b><br>${HT_NAMES[ht]} at half-time, then ${RESULT_NAMES[ft].toLowerCase()}:<br>
    ${n} of ${rowTotal} matches (${pct(rowTotal ? n / rowTotal : null)})`;
  // league comparison for the same seasons and venue (computed by the server)
  const lg = data.summary && data.summary.league_matrix;
  if (lg) {
    const lgTotal = lg[ht].W + lg[ht].D + lg[ht].L;
    html += `<br>League average: ${pct(lgTotal ? lg[ht][ft] / lgTotal : null)}`;
  }
  return html;
}
