import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const BASE = "http://localhost:5173/paper-demo";
const OUT = "../docs/screenshots/interactive";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 950 }, deviceScaleFactor: 2 });

async function snap(name) {
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
  console.log("shot", name);
}

// 1. Candidate Generation guided (interactive React Flow present)
await page.goto(`${BASE}?screen=candidateGeneration&dataset=codexM`, { waitUntil: "networkidle" });
await page.waitForSelector(".react-flow", { timeout: 10000 });
await snap("cg-guided");

// 2. Click a candidate -> highlight + inspector
const cand = page.locator("text=Top Candidate Relations").locator("xpath=../..").locator("button").first();
await cand.click().catch(() => {});
await snap("cg-candidate-selected");

// 3. Explore context -> richer graph
await page.getByRole("button", { name: /Explore context/i }).click().catch(() => {});
await page.waitForTimeout(900);
await snap("cg-explore");

// 4. Click a node in the graph -> inspector
const node = page.locator(".react-flow__node").nth(1);
await node.click().catch(() => {});
await snap("cg-node-inspect");

// 5. Structural validation
await page.goto(`${BASE}?screen=structuralValidation&dataset=codexM`, { waitUntil: "networkidle" });
await page.waitForSelector(".react-flow", { timeout: 10000 });
await snap("sv-guided");

// 6. Graph refinement -> accept
await page.goto(`${BASE}?screen=graphRefinement&dataset=codexM`, { waitUntil: "networkidle" });
await page.waitForSelector(".react-flow", { timeout: 10000 });
await page.getByRole("button", { name: /^Accept$/ }).click().catch(() => {});
await snap("gr-accepted");
await page.getByRole("button", { name: /^Uncertain$/ }).click().catch(() => {});
await snap("gr-uncertain");

// 7. FB15K-237 dataset switch
await page.goto(`${BASE}?screen=candidateGeneration&dataset=fb15k237`, { waitUntil: "networkidle" });
await page.waitForSelector(".react-flow", { timeout: 10000 });
await snap("cg-fb15k237");

await browser.close();
console.log("done");
