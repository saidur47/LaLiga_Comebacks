// Chart 1: scatter plot of all clubs.
// Clicking a club selects it (coordination pair 1: updates charts 2, 3 and 4).

import { state, data, setState } from "./store.js";
import { COLORS, pct, seasonLabel, showTooltip, moveTooltip, hideTooltip } from "./utils.js";
import { MIN_TRAILING } from "./config.js";

const height = 360;
const margin = { top: 20, right: 20, bottom: 50, left: 55 };
let svg, xAxisG, yAxisG, dotsG, linesG, labelsG, noteText;

export function initScatter() {
  svg = d3.select("#scatter").append("svg").attr("height", height);
  xAxisG = svg.append("g");
  yAxisG = svg.append("g");
  linesG = svg.append("g");
  dotsG = svg.append("g");
  labelsG = svg.append("g");
  noteText = svg.append("text").attr("class", "axis-label").attr("x", margin.left + 5).attr("y", 14);

  svg.append("text").attr("class", "axis-label x-title").attr("text-anchor", "middle")
    .text("Behind at half-time (% of all matches)");
  svg.append("text").attr("class", "axis-label y-title").attr("text-anchor", "middle")
    .text("Won after being behind (%)");
}

function colorOf(team) {
  if (team === state.team) return COLORS.teamA;
  if (team === state.compare) return COLORS.teamB;
  return COLORS.other;
}

export function drawScatter() {
  // legend
  let legend = `<span><i style="background:${COLORS.teamA};border-radius:50%"></i>${state.team}</span>`;
  if (state.compare) legend += `<span><i style="background:${COLORS.teamB};border-radius:50%"></i>${state.compare}</span>`;
  legend += `<span><i style="background:${COLORS.other};border-radius:50%"></i>Other clubs</span>`;
  legend += `<span>- - - League average</span>`;
  d3.select("#scatter-legend").html(legend);

  if (!data.summary) return;
  const width = document.getElementById("scatter").clientWidth;
  svg.attr("width", width);
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  // keep clubs with enough matches, but always show the selected ones
  const clubs = data.summary.teams.filter((d) =>
    d.trailing >= MIN_TRAILING || d.team === state.team || d.team === state.compare);
  const hidden = data.summary.teams.length - clubs.length;
  noteText.text(hidden > 0 ? `${hidden} clubs hidden (fewer than ${MIN_TRAILING} matches behind at HT)` : "");

  const x = d3.scaleLinear()
    .domain([0, d3.max(clubs, (d) => d.trail_rate) * 1.1 || 0.5]).nice()
    .range([margin.left, margin.left + innerW]);
  const y = d3.scaleLinear()
    .domain([0, d3.max(clubs, (d) => d.win_rate || 0) * 1.1 || 0.3]).nice()
    .range([margin.top + innerH, margin.top]);
  const r = d3.scaleSqrt()
    .domain([0, d3.max(data.summary.teams, (d) => d.matches)])
    .range([3, 13]);

  xAxisG.attr("transform", `translate(0,${margin.top + innerH})`)
    .call(d3.axisBottom(x).ticks(6).tickFormat((v) => Math.round(v * 100)));
  yAxisG.attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(y).ticks(6).tickFormat((v) => Math.round(v * 100)));
  svg.select(".x-title").attr("x", margin.left + innerW / 2).attr("y", height - 10);
  svg.select(".y-title").attr("transform", `translate(15,${margin.top + innerH / 2}) rotate(-90)`);

  // league average lines
  const league = data.summary.league;
  const lines = [
    { x1: x(league.trail_rate), x2: x(league.trail_rate), y1: margin.top, y2: margin.top + innerH },
    { x1: margin.left, x2: margin.left + innerW, y1: y(league.win_rate), y2: y(league.win_rate) },
  ];
  linesG.selectAll("line").data(lines).join("line")
    .attr("stroke", COLORS.league).attr("stroke-dasharray", "4 4")
    .transition().duration(300)
    .attr("x1", (d) => d.x1).attr("x2", (d) => d.x2).attr("y1", (d) => d.y1).attr("y2", (d) => d.y2);

  // dots (selected clubs sorted last so they are drawn on top)
  const rank = (d) => (d.team === state.team ? 2 : d.team === state.compare ? 1 : 0);
  clubs.sort((a, b) => rank(a) - rank(b));

  dotsG.selectAll("circle")
    .data(clubs, (d) => d.team)
    .join("circle")
    .order()
    .style("cursor", "pointer")
    .on("mouseover", (event, d) => showTooltip(tooltipText(d), event))
    .on("mousemove", moveTooltip)
    .on("mouseout", hideTooltip)
    .on("click", (event, d) => clickClub(d.team, event.shiftKey))
    .transition().duration(300)
    .attr("cx", (d) => x(d.trail_rate))
    .attr("cy", (d) => y(d.win_rate || 0))
    .attr("r", (d) => r(d.matches))
    .attr("fill", (d) => colorOf(d.team))
    .attr("opacity", (d) => (rank(d) > 0 ? 1 : 0.6))
    .attr("stroke", (d) => (rank(d) > 0 ? "black" : "white"));

  // name labels for the selected clubs only
  const labelled = clubs.filter((d) => rank(d) > 0);
  labelsG.selectAll("text")
    .data(labelled, (d) => d.team)
    .join("text")
    .attr("font-size", 13)
    .attr("font-weight", "bold")
    .attr("fill", (d) => colorOf(d.team))
    .text((d) => d.team)
    .transition().duration(300)
    // selected club's label on the right of its dot, comparison club's on the left,
    // so the two labels don't overlap when the dots are close together
    .attr("text-anchor", (d) => (d.team === state.compare ? "end" : "start"))
    .attr("x", (d) => x(d.trail_rate) + (d.team === state.compare ? -1 : 1) * (r(d.matches) + 4))
    .attr("y", (d) => y(d.win_rate || 0) + 4);
}

function clickClub(team, shiftKey) {
  hideTooltip();
  if (shiftKey) {
    if (team !== state.team) setState({ compare: team }, "scatter");
  } else {
    setState({ team: team, compare: state.compare === team ? null : state.compare }, "scatter");
  }
}

function tooltipText(d) {
  const s = data.summary;
  return `<b>${d.team}</b><br>
    Seasons: ${seasonLabel(s.season_min)} to ${seasonLabel(s.season_max)}<br>
    Matches played: ${d.matches}<br>
    Behind at half-time: ${d.trailing} (${pct(d.trail_rate)})<br>
    Then won / drew / lost: ${d.w} / ${d.d} / ${d.l}<br>
    Won after being behind: <b>${pct(d.win_rate)}</b>`;
}
