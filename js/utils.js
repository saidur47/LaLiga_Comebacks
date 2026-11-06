// Shared colours, labels, tooltip and small helper functions.

// One colour scheme for the whole dashboard
export const COLORS = {
  teamA: "#6a3d9a", // selected club (purple)
  teamB: "#d4a017", // comparison club (gold)
  other: "#b5b5b5", // all other clubs
  league: "#777777",
  W: "#2ca25f",     // won
  D: "#a6a6a6",     // drew
  L: "#d7301f",     // lost
};

export const RESULT_NAMES = { W: "Won", D: "Drew", L: "Lost" };
export const HT_NAMES = { lead: "Leading", level: "Level", trail: "Behind" };

export function seasonLabel(year) {
  return year + "/" + String(year + 1).slice(2);
}

export function pct(value, digits = 1) {
  if (value === null || value === undefined || isNaN(value)) return "-";
  return (value * 100).toFixed(digits) + "%";
}

// tooltip: one div that follows the mouse and flips near the window edge
const tip = document.getElementById("tooltip");

export function showTooltip(html, event) {
  tip.innerHTML = html;
  tip.hidden = false;
  moveTooltip(event);
}

export function moveTooltip(event) {
  const w = tip.offsetWidth;
  const h = tip.offsetHeight;
  let x = event.clientX + 12;
  let y = event.clientY + 12;
  if (x + w > window.innerWidth) x = event.clientX - w - 12;
  if (y + h > window.innerHeight) y = event.clientY - h - 12;
  tip.style.left = x + "px";
  tip.style.top = y + "px";
}

export function hideTooltip() {
  tip.hidden = true;
}
