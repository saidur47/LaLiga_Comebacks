// Backend address. Change DEPLOYED_API if you host the backend online.
const DEPLOYED_API = "https://laliga-comebacks-api.onrender.com";
const isLocal = ["localhost", "127.0.0.1", ""].includes(window.location.hostname);
export const API_BASE = isLocal ? "http://localhost:8000" : DEPLOYED_API;

// clubs with fewer "behind at half-time" matches than this are hidden in chart 1
export const MIN_TRAILING = 5;
