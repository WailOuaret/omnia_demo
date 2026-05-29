import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const BASE = "http://localhost:5173/paper-demo";
const OUT = "../docs/screenshots/presentation";
mkdirSync(OUT, { recursive: true });

const shots = [
  { name: "edge-wn18rr-candidates", url: `${BASE}?screen=candidateGeneration&dataset=wn18rr`, wait: "text=Candidate Generation" },
  { name: "edge-covid-semantic", url: `${BASE}?screen=semanticValidation&dataset=covidFact`, wait: "text=Semantic Validation" },
];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1366, height: 900 }, deviceScaleFactor: 2 });
for (const shot of shots) {
  await page.goto(shot.url, { waitUntil: "networkidle" });
  try { await page.waitForSelector(shot.wait, { timeout: 8000 }); } catch {}
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/${shot.name}.png`, fullPage: true });
  console.log(`shot ${shot.name}`);
}
await browser.close();
console.log("done");
