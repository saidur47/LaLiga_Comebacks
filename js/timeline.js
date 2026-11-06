// Chart 2: matches behind at half-time per season, stacked by final result.
// Brushing seasons here updates charts 1, 3 and 4 (coordination pair 2).
// A selected matrix cell (chart 3) is highlighted here as solid bars (coordination pair 3).

import { state, data, setState, getRows, selectedTeams } from "./store.js";
import { COLORS, RESULT_NAMES, HT_NAMES, seasonLabel, showTooltip, moveTooltip, hideTooltip } from "./utils.js";

const height = 320;
const margin = { top: 20, right: 15, bottom: 40, left: 45 };
let svg, barsG, cellG, xAxisG, yAxisG, brushG, brush, x, seasons;

export function initTimeline() {
  svg = d3.select("#timeline").append("svg").attr("height", height);
  xAxisG = svg.append("g");
  yAxisG = svg.append("g");
  barsG = svg.append("g");
  cellG = svg.append("g");
  brushG = svg.append("g");
  svg.append("text").attr("class", "axis-label y-title").attr("text-anchor", "middle")
    .text("Matches behind at half-time");

  brush = d3.brushX()
    .on("brush", brushed)
    .on("end", brushEnded);
}

// which seasons are inside the brushed pixel range
function seasonsInside(selection) {
  const [x0, x1] = selection;
  const inside = seasons.filter((s) => {
    const center = x(s) + x.bandwidth() / 2;
    return center >= x0 && center <= x1;
  });
  if (inside.length === 0) return null;
  const range = [inside[0], inside[inside.length - 1]];
  // selecting every season is the same as selecting none
  if (range[0] === seasons[0] && range[1] === seasons[seasons.length - 1]) return null;
  return range;
}

function brushed(event) {
  if (!event.sourceEvent || !event.selection) return; // ignore moves made by the code
  hideTooltip();
  setState({ seasons: seasonsInside(event.selection) }, "timeline");
}

function brushEnded(event) {
  if (!event.sourceEvent) return;
  const range = event.selection ? seasonsInside(event.selection) : null;
  setState({ seasons: range }, "timeline");
  moveBrushToSeasons(); // snap the brush to whole seasons
}

function moveBrushToSeasons() {
  if (!state.seasons) {
    brushG.call(brush.move, null);
  } else {
    const gap = x.step() - x.bandwidth();
    brushG.call(brush.move, [x(state.seasons[0]) - gap / 2, x(state.seasons[1]) + x.bandwidth() + gap / 2]);
  }
}

export function drawTimeline(source) {
  const teams = selectedTeams();

  // legend
  let legend = "";
  for (const r of ["W", "D", "L"]) {
    legend += `<span><i style="background:${COLORS[r]}"></i>Behind at HT, then ${RESULT_NAMES[r].toLowerCase()}</span>`;
  }
  if (state.compare) legend += `<span>Left bar: ${state.team}, right bar: ${state.compare}</span>`;
  if (state.cell) legend += `<span><b>Solid bars: ${HT_NAMES[state.cell.ht]} at HT &rarr; ${RESULT_NAMES[state.cell.ft]}</b></span>`;
  d3.select("#timeline-legend").html(legend);

  const width = document.getElementById("timeline").clientWidth;
  svg.attr("width", width);
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;
  const bottom = margin.top + innerH;

  seasons = d3.range(data.meta.season_min, data.meta.season_max + 1);
  x = d3.scaleBand().domain(seasons).range([margin.left, margin.left + innerW]).padding(0.15);
  const sub = d3.scaleBand().domain(teams).range([0, x.bandwidth()]).padding(0.05);

  // count matches per season for each selected club
  const counts = [];
  for (const team of teams) {
    for (const s of seasons) {
      counts.push({ team, season: s, W: 0, D: 0, L: 0, total: 0, cell: 0, played: 0 });
    }
  }
  const find = (team, season) => counts.find((c) => c.team === team && c.season === season);
  for (const team of teams) {
    for (const row of getRows(team, true)) {
      const c = find(team, row.season);
      c.played++;
      if (row.ht === "trail") { c[row.ft]++; c.total++; }
      if (state.cell && row.ht === state.cell.ht && row.ft === state.cell.ft) c.cell++;
    }
  }

  const maxY = d3.max(counts, (c) => Math.max(c.total, c.cell)) || 1;
  const y = d3.scaleLinear().domain([0, maxY]).nice().range([bottom, margin.top]);

  xAxisG.attr("transform", `translate(0,${bottom})`)
    .call(d3.axisBottom(x).tickValues(seasons.filter((s) => s % 5 === 0)).tickFormat(seasonLabel));
  yAxisG.attr("transform", `translate(${margin.left},0)`).call(d3.axisLeft(y).ticks(5).tickFormat(d3.format("d")));
  svg.select(".y-title").attr("transform", `translate(12,${margin.top + innerH / 2}) rotate(-90)`);

  // stacked bar pieces: won at the bottom, then drew, then lost
  const pieces = [];
  for (const c of counts) {
    let start = 0;
    for (const r of ["W", "D", "L"]) {
      pieces.push({ key: `${c.team}-${c.season}-${r}`, team: c.team, season: c.season, result: r, y0: start, y1: start + c[r] });
      start += c[r];
    }
  }
  const speed = source === "timeline" ? 0 : 300; // no animation while dragging the brush

  barsG.selectAll("rect")
    .data(pieces, (d) => d.key)
    .join("rect")
    .attr("x", (d) => x(d.season) + sub(d.team))
    .attr("width", sub.bandwidth())
    .attr("fill", (d) => COLORS[d.result])
    .transition().duration(speed)
    .attr("y", (d) => y(d.y1))
    .attr("height", (d) => y(d.y0) - y(d.y1))
    .attr("opacity", state.cell ? 0.25 : 1); // fade when a matrix cell is highlighted

  // highlighted matrix cell: solid narrow bars in front
  const cellBars = state.cell ? counts : [];
  cellG.selectAll("rect")
    .data(cellBars, (d) => `${d.team}-${d.season}`)
    .join("rect")
    .attr("x", (d) => x(d.season) + sub(d.team) + sub.bandwidth() * 0.2)
    .attr("width", sub.bandwidth() * 0.6)
    .attr("fill", state.cell ? COLORS[state.cell.ft] : "none")
    .attr("stroke", "black")
    .attr("stroke-width", 0.7)
    .transition().duration(speed)
    .attr("y", (d) => y(d.cell))
    .attr("height", (d) => bottom - y(d.cell));

  // brush on top of the bars
  brush.extent([[margin.left, margin.top], [margin.left + innerW, bottom]]);
  brushG.call(brush);
  if (source !== "timeline") moveBrushToSeasons();

  // tooltip: the brush layer receives the mouse events, so listen there
  brushG
    .on("mousemove.tip", (event) => {
      if (event.buttons) return hideTooltip(); // dragging
      const [mx] = d3.pointer(event, svg.node());
      const season = seasons.find((s) => mx >= x(s) - x.step() * 0.075 && mx < x(s) + x.step() * 0.925);
      if (season === undefined) return hideTooltip();
      showTooltip(tooltipText(season, teams, find), event);
    })
    .on("mouseleave.tip", hideTooltip);
}

function tooltipText(season, teams, find) {
  let html = `<b>${seasonLabel(season)}</b>`;
  if (season === data.meta.partial_season) html += " (still in progress)";
  for (const team of teams) {
    const c = find(team, season);
    html += `<br><u>${team}</u>: `;
    if (!c.played) { html += "not in La Liga"; continue; }
    html += `behind at HT in ${c.total} of ${c.played}<br>then won ${c.W}, drew ${c.D}, lost ${c.L}`;
    if (state.cell) html += `<br>${HT_NAMES[state.cell.ht]} &rarr; ${RESULT_NAMES[state.cell.ft]}: ${c.cell}`;
  }
  return html;
}
