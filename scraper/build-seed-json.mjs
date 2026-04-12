/**
 * Reads out/tracks.csv (RFC 4180, multiline) and writes
 * ../server/Rydo.Api/SeedData/groopy-routes.json
 * Copies out/gpx/{pid}.gpx → ../server/Rydo.Api/GpxSeed/groopy-{pid}.gpx
 *
 * Run: npm run build:seed-json
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const OUT_DIR = path.join(__dirname, "out");
const CSV_PATH = path.join(OUT_DIR, "tracks.csv");
const GPX_DIR = path.join(OUT_DIR, "gpx");
const DEST_JSON = path.join(__dirname, "..", "server", "Rydo.Api", "SeedData", "groopy-routes.json");
const DEST_GPX_DIR = path.join(__dirname, "..", "server", "Rydo.Api", "GpxSeed");

const DESC_MAX = 8000;

/** Parse CSV with quoted fields and embedded newlines. */
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let i = 0;
  let inQuotes = false;
  if (text.charCodeAt(0) === 0xfeff) i = 1;
  while (i < text.length) {
    const c = text[i];
    const next = text[i + 1];
    if (inQuotes) {
      if (c === '"' && next === '"') {
        field += '"';
        i += 2;
        continue;
      }
      if (c === '"') {
        inQuotes = false;
        i++;
        continue;
      }
      field += c;
      i++;
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (c === ",") {
      row.push(field);
      field = "";
      i++;
      continue;
    }
    if (c === "\r") {
      i++;
      continue;
    }
    if (c === "\n") {
      row.push(field);
      field = "";
      rows.push(row);
      row = [];
      i++;
      continue;
    }
    field += c;
    i++;
  }
  row.push(field);
  rows.push(row);
  return rows;
}

function firstNumber(s) {
  if (s == null || s === "") return null;
  const m = String(s).replace(/,/g, ".").match(/-?\d+(\.\d+)?/);
  if (!m) return null;
  return parseFloat(m[0]);
}

/** Map Groopy Hebrew difficulty labels to Rydo client values. */
function mapDifficulty(he) {
  if (!he || !String(he).trim()) return "moderate";
  const s = String(he).trim();
  if (/למתקדמים|מקצוענ|אקסטרים|extreme/i.test(s)) return "expert";
  if (/בינוני\s*[-–]\s*קשה|בינוני\s*קשה|קשה|קשוח/.test(s)) return "hard";
  if (/בינוני\s*[-–]\s*קל|בינוני\s*קל/.test(s)) return "moderate";
  if (/בינוני/.test(s)) return "moderate";
  if (/קל|^easy$/i.test(s)) return "casual";
  return "moderate";
}

function mapTerrain(rideType, singleTrack) {
  const st =
    singleTrack === "כן" ||
    singleTrack === "yes" ||
    String(singleTrack || "")
      .toLowerCase()
      .trim() === "true";
  const rt = String(rideType || "").toLowerCase();
  if (rt.includes("כביש") || rt.includes("road") || rt.includes("asphalt")) return "road";
  if (st) return "trail";
  if (rt.includes("xc") || rt.includes("טיול") || rt === "0") return "mixed";
  return "mixed";
}

async function main() {
  const raw = await fs.readFile(CSV_PATH, "utf8");
  const table = parseCsv(raw);
  if (table.length < 2) {
    console.error("No data rows in", CSV_PATH);
    process.exit(1);
  }
  const header = table[0].map((h) => h.replace(/^\uFEFF/, "").trim());

  const out = [];
  let copied = 0;
  for (let r = 1; r < table.length; r++) {
    const cells = table[r];
    if (cells.length < header.length) continue;
    const row = {};
    for (let c = 0; c < header.length; c++) {
      row[header[c]] = cells[c] ?? "";
    }

    const pidStr = row.pid?.trim() ?? "";
    const pid = parseInt(pidStr, 10);
    const trackName = (row.trackName ?? "").trim();
    const gpxLocal = (row.gpxLocalPath ?? "").trim();

    if (!Number.isFinite(pid) || pid <= 0) continue;
    if (!trackName) continue;
    if (!gpxLocal) continue;

    const srcGpx = path.join(OUT_DIR, gpxLocal.replace(/\//g, path.sep));
    let stat;
    try {
      stat = await fs.stat(srcGpx);
    } catch {
      console.warn("Skip pid", pid, "(no GPX file", srcGpx, ")");
      continue;
    }
    if (!stat.isFile() || stat.size === 0) continue;

    const destName = `groopy-${pid}.gpx`;
    const destPath = path.join(DEST_GPX_DIR, destName);
    await fs.mkdir(DEST_GPX_DIR, { recursive: true });
    await fs.copyFile(srcGpx, destPath);
    copied++;

    const lenKm = firstNumber(row.length);
    const climbM = firstNumber(row.climb);
    const hours = firstNumber(row.hoursNet);
    const durationMinutes =
      hours != null && hours > 0 ? Math.max(1, Math.round(hours * 60)) : null;

    let desc = (row.descriptionText ?? "").trim();
    if (desc.length > DESC_MAX) desc = desc.slice(0, DESC_MAX);

    const notesParts = [];
    if (row.url) notesParts.push(`Source: ${row.url}`);
    if (row.openerName?.trim()) notesParts.push(`Opener: ${row.openerName.trim()}`);
    const notes = notesParts.length ? notesParts.join(" · ") : null;

    out.push({
      pid,
      title: trackName,
      region: (row.area ?? "").trim() || null,
      terrain: mapTerrain(row.rideType, row.singleTrack),
      difficulty: mapDifficulty(row.difficulty),
      description: desc,
      lengthKm: lenKm,
      elevationGainM: climbM,
      durationMinutes,
      gpxFileName: destName,
      sourceUrl: (row.url ?? "").trim() || null,
      notes,
    });
  }

  await fs.mkdir(path.dirname(DEST_JSON), { recursive: true });
  await fs.writeFile(DEST_JSON, JSON.stringify(out, null, 2), "utf8");
  console.log("Wrote", out.length, "rows →", DEST_JSON);
  console.log("Copied", copied, "GPX files →", DEST_GPX_DIR);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
