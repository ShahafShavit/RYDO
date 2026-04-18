/**
 * Groopy track pages — sequential scrape with Playwright (headed).
 *
 * HTML (curl) is server-rendered; key fields use stable ids like
 * #mainContentPlaceHolder_lblLength, #mainContentPlaceHolder_linkGPSFileDownload, etc.
 *
 * Writes: out/tracks.csv, out/gpx/{pid}.gpx
 *
 * Run: npm install && npx playwright install chromium && npm start
 * Optional: HEADLESS=1 npm start (no visible browser)
 */

function range(start, stop, step) {
  if (typeof stop == 'undefined') {
      // one param defined
      stop = start;
      start = 0;
  }

  if (typeof step == 'undefined') {
      step = 1;
  }

  if ((step > 0 && start >= stop) || (step < 0 && start <= stop)) {
      return [];
  }

  var result = [];
  for (var i = start; step > 0 ? i < stop : i > stop; i += step) {
      result.push(i);
  }

  return result;
};

import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const BASE = "https://www.groopy.co.il/trackinfo.aspx";
const PIDS = range(2450, 2150, -1);


const OUT_DIR = path.join(__dirname, "out_"+PIDS[0]+"-"+PIDS[PIDS.length-1]);
const CSV_PATH = path.join(OUT_DIR, "tracks.csv");
const GPX_DIR = path.join(OUT_DIR, "gpx");

const CSV_COLUMNS = [
  "pid",
  "url",
  "pageTitle",
  "trackName",
  "openDate",
  "area",
  "rideType",
  "length",
  "hoursNet",
  "climb",
  "descent",
  "difficulty",
  "technicalDifficulty",
  "singleTrack",
  "circular",
  "beginners",
  "fullMoonOk",
  "startPoint",
  "milestones",
  "attraction",
  "season",
  "descriptionText",
  "gpxUrl",
  "gpxLocalPath",
  "openerName",
];

function csvEscape(value) {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function rowToLine(values) {
  return values.map(csvEscape).join(",") + "\r\n";
}

async function downloadGpx(url, destPath) {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
  });
  if (!res.ok) throw new Error(`GPX download failed ${res.status}: ${url}`);
  await fs.writeFile(destPath, Buffer.from(await res.arrayBuffer()));
}

async function extractTrack(page) {
  return page.evaluate(() => {
    const t = (id) => document.getElementById(id)?.textContent?.trim() ?? null;
    const href = (id) => {
      const el = document.getElementById(id);
      const h = el?.getAttribute("href");
      if (!h) return null;
      try {
        return new URL(h, window.location.href).href;
      } catch {
        return h;
      }
    };
    const pathwayDescrEl = document
      .getElementById("mainContentPlaceHolder_panelPathwayDescr")
      ?.querySelector(".mid_info_block_left_data");

    return {
      url: window.location.href,
      pageTitle: document.title?.trim() ?? null,
      trackName: t("mainContentPlaceHolder_lblHeaderTrackname"),
      openDate: t("mainContentPlaceHolder_lblOpenDate"),
      area: t("mainContentPlaceHolder_lblArea"),
      rideType: t("mainContentPlaceHolder_lblRideType"),
      length: t("mainContentPlaceHolder_lblLength"),
      hoursNet: t("mainContentPlaceHolder_lblHours"),
      climb: t("mainContentPlaceHolder_lblClimb"),
      descent: t("mainContentPlaceHolder_lblDescent"),
      difficulty: t("mainContentPlaceHolder_lblHard"),
      technicalDifficulty: t("mainContentPlaceHolder_lblHardtech"),
      singleTrack: t("mainContentPlaceHolder_lblSingle"),
      circular: t("mainContentPlaceHolder_lblRound"),
      beginners: t("mainContentPlaceHolder_lblBeginners"),
      fullMoonOk: t("mainContentPlaceHolder_lblMoon"),
      startPoint: t("mainContentPlaceHolder_lblStartpoint"),
      milestones: t("mainContentPlaceHolder_lblMilestones"),
      attraction: t("mainContentPlaceHolder_lblAttraction"),
      season: t("mainContentPlaceHolder_lblSeason"),
      descriptionText: pathwayDescrEl?.textContent?.replace(/\s+/g, " ").trim() ?? null,
      gpxUrl: href("mainContentPlaceHolder_linkGPSFileDownload"),
      openerName: t("mainContentPlaceHolder_linkOpenerName"),
    };
  });
}

function flattenForCsv(pid, data, gpxRelativePath) {
  return {
    pid,
    ...data,
    gpxLocalPath: gpxRelativePath,
  };
}

async function main() {
  await fs.mkdir(GPX_DIR, { recursive: true });

  const headless = process.env.HEADLESS === "1" || process.env.HEADLESS === "true";
  const browser = await chromium.launch({
    headless,
    slowMo: headless ? 0 : 150,
  });
  const context = await browser.newContext({
    locale: "he-IL",
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });
  const page = await context.newPage();

  const rows = [];
  for (const pid of PIDS) {
    const url = `${BASE}?pid=${pid}`;
    console.log("\n→ Loading", url);
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });
    const data = await extractTrack(page);

    let gpxRelativePath = "";
    if (data.gpxUrl) {
      const gpxFileName = `${pid}.gpx`;
      const gpxAbs = path.join(GPX_DIR, gpxFileName);
      try {
        await downloadGpx(data.gpxUrl, gpxAbs);
        gpxRelativePath = path.join("gpx", gpxFileName).replace(/\\/g, "/");
        console.log("  Saved GPX →", gpxAbs);
      } catch (e) {
        console.error("  GPX download failed:", e.message);
      }
    }

    const flat = flattenForCsv(pid, data, gpxRelativePath);
    rows.push(flat);
    console.log(JSON.stringify(flat, null, 2));
  }

  await browser.close();

  const header = rowToLine(CSV_COLUMNS);
  const body = rows
    .map((r) => rowToLine(CSV_COLUMNS.map((col) => r[col])))
    .join("");
  await fs.writeFile(CSV_PATH, "\uFEFF" + header + body, "utf8");

  console.log("\nDone. Scraped", rows.length, "pages.");
  console.log("CSV →", CSV_PATH);
  console.log("GPX dir →", GPX_DIR);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
