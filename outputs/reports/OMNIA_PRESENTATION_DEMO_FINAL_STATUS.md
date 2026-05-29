# OMNIA+ Presentation Demo — Final Status

Generated: 2026-05-29

## What was changed

- Re-exported interactive demo JSON from **official benchmark sources** with a **600-triple pipeline cap** per dataset (`scripts/export_omnia_100node_results.py --sampling-limit 600`).
- Copied fresh exports into `frontend/public/demo-scenarios/` for Vercel/static mode.
- Polished presentation UI (cover, get started, lean left sidebar, candidate persistence, semantic fallback copy, graph labels, refinement reset).
- Export script now supports `--sampling-limit`, `--sample-proportion`, and auto-copy to `frontend/public/demo-scenarios/`.

## Final 6-screen flow

1. **Cover** — OMNIA+, subtitle, Start Knowledge Completion; architecture under collapsed “About the system architecture”.
2. **Get Started** — four short steps, dataset picker, Start demo.
3. **Candidate Generation** — explore by entity / relation / candidate; red dashed proposed edges; no validation scores.
4. **Structural Validation** — pass/remove, scores when present; focused graph.
5. **Semantic Validation** — real/prepared LLM output or honest workflow placeholder (no fake values).
6. **Graph Refinement** — Accept / Reject / Uncertain / Correct with live counts and Reset decision.

Visible workflow steps (after Get Started): **4 only** — no clustering step in the UI.

## Dataset status

| Dataset | Official source | Local path | Demo file | Pipeline sample | Guided candidates |
| --- | --- | --- | --- | --- | --- |
| CoDEx-M | [tsafavi/codex](https://github.com/tsafavi/codex) | `data/codex/data/triples/codex-m` | `codexM_100node.json` | 600 triples | 1 |
| FB15K-237 | [villmow/datasets_knowledge_embedding](https://github.com/villmow/datasets_knowledge_embedding) | `FB15k-237/` | `fb15k237_100node.json` | 600 triples | 1 |
| WN18RR | Same villmow repo | `WN18RR/original/` | `wn18rr_100node.json` | 600 triples | 0 guided* |
| COVID-Fact | Static only | N/A | `covidFact_static_demo.json` | N/A | static |

\*WN18RR at 600 triples produced 29 generated rows in `candidateGeneration` (mostly duplicate-existing); the explorer still lists them for Candidate Generation. Structural TransE scores may be absent — the UI shows an honest message instead of fake scores.

## Static interactive Vercel mode

- Route: `/paper-demo` (root redirects via `frontend/vercel.json`).
- Data: `frontend/public/demo-scenarios/*.json` — no backend required.
- User can: switch dataset, explore entity/relation/candidate, click graph, persist `selectedCandidateId` across steps, accept/reject/correct in refinement.

## Remaining limitations

- **WN18RR** small run: few/no structurally scored “true missing” candidates in the guided slice; exploration uses `candidateGeneration` rows.
- **LLM validation** may be mock or absent per export; semantic screen uses prepared example or the documented placeholder.
- **COVID-Fact** remains a static scenario (marked “static” in the dataset picker).
- UI cards still show **OMNIA paper sample counts** (e.g. 60k triples for CoDEx-M), not full public repo totals.
- `npm run test` and `npm run lint` are not defined in `frontend/package.json` (only `build`, Playwright e2e, and regression scripts).

## Test results

| Check | Result |
| --- | --- |
| `cd frontend && npm run build` | **Pass** (tsc + vite) |
| `npm run test` | **N/A** (script not in package.json) |
| `npm run lint` | **N/A** (script not in package.json) |
| Official dataset audit | CoDEx + FB15K-237 + WN18RR **KEEP** (correct git remotes) |
| OMNIA export (600 triples) | **Pass** — all three benchmarks written and copied to `demo-scenarios/` |

### Manual checks (recommended after deploy)

- [ ] `/paper-demo` loads; Start Knowledge Completion → Get Started → Start demo
- [ ] Dataset switch: CoDEx-M, FB15K-237, WN18RR, COVID-Fact (static label)
- [ ] Candidate persists across Structural → Semantic → Refinement
- [ ] Accept/Reject updates graph edge colour and counts
- [ ] Hard refresh keeps working (static JSON)

## Run locally

```bash
cd frontend
npm run dev
```

Open http://localhost:5173/paper-demo

## Re-export demo data

```bash
python scripts/export_omnia_100node_results.py --sampling-limit 600
```
