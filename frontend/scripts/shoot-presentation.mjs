import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const BASE = "http://localhost:5173/paper-demo";
const OUT = "../docs/screenshots/presentation";
mkdirSync(OUT, { recursive: true });

const shots = [
  { name: "1-cover", url: `${BASE}`, wait: "text=Start Knowledge Completion" },
  { name: "2-get-started", url: `${BASE}?screen=getStarted`, wait: "text=Get Started" },
  { name: "3-candidate-generation", url: `${BASE}?screen=candidateGeneration&dataset=codexM`, wait: "text=Top Candidate Relations" },
  { name: "4-structural-validation", url: `${BASE}?screen=structuralValidation&dataset=codexM`, wait: "text=Structural Validation" },
  { name: "5-semantic-validation", url: `${BASE}?screen=semanticValidation&dataset=codexM`, wait: "text=Semantic Validation" },
  { name: "6-graph-refinement", url: `${BASE}?screen=graphRefinement&dataset=codexM`, wait: "text=Graph Refinement" },
];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1366, height: 900 }, deviceScaleFactor: 2 });

for (const shot of shots) {
  await page.goto(shot.url, { waitUntil: "networkidle" });
  try {
    await page.waitForSelector(shot.wait, { timeout: 8000 });
  } catch {
    console.warn(`warn: selector not found for ${shot.name}: ${shot.wait}`);
  }
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/${shot.name}.png`, fullPage: true });
  console.log(`shot ${shot.name}`);
}

await browser.close();
console.log("done");
