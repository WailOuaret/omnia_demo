#!/usr/bin/env python3
"""Run OMNIA on each benchmark dataset and export 100-node graph slices + pipeline artifacts."""

from __future__ import annotations

import argparse
import json
import shutil
import sys
import time
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = REPO_ROOT / "outputs" / "omnia-100node-results"
DEMO_SCENARIOS_DIR = REPO_ROOT / "frontend" / "public" / "demo-scenarios"
DEFAULT_NODE_LIMIT = 100
DEFAULT_EDGE_LIMIT = 200
DEFAULT_SAMPLING_LIMIT = 600
DEFAULT_SAMPLE_PROPORTION = 0.8

BENCHMARKS = [
    {
        "dataset_id": "codexM",
        "sample_id": "omnia_codex_m",
        "format_name": "sentences",
        "strategy": "rag",
        "recommended_mode": "sentence-rag",
    },
    {
        "dataset_id": "fb15k237",
        "sample_id": "omnia_fb15k-237",
        "format_name": "triples",
        "strategy": "rag",
        "recommended_mode": "triple-rag",
    },
    {
        "dataset_id": "wn18rr",
        "sample_id": "omnia_wn18rr",
        "format_name": "triples",
        "strategy": "rag",
        "recommended_mode": "triple-rag",
    },
]


def _frame_len(frame: Any) -> int:
    if frame is None:
        return 0
    try:
        return int(len(frame))
    except TypeError:
        return 0


def _json_ready(obj: Any) -> Any:
    if isinstance(obj, dict):
        return {k: _json_ready(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_json_ready(v) for v in obj]
    if hasattr(obj, "item"):
        try:
            return obj.item()
        except Exception:
            pass
    if isinstance(obj, float) and (obj != obj):
        return None
    return obj


def _export_dataset(
    entry: dict[str, str],
    *,
    node_limit: int,
    edge_limit: int,
    sampling_limit: int,
    sample_proportion: float,
) -> dict[str, Any] | None:
    from backend.app.services import ingestion, pipeline
    from backend.app.services.omnia_demo_slice import build_omnia_demo_slice, build_overview_slice

    dataset_id = entry["dataset_id"]
    sample_id = entry["sample_id"]
    t0 = time.perf_counter()

    print(f"\n[{dataset_id}] creating session ({sample_id})...")
    session = ingestion.create_session_from_sample(
        sample_id,
        holdout_mode=True,
        sample_proportion=sample_proportion,
        sampling_limit=sampling_limit,
    )

    print(f"[{dataset_id}] running full pipeline...")
    pipeline_summary = pipeline.run_full_pipeline(
        session,
        format_name=entry["format_name"],
        strategy=entry["strategy"],
        force_mock=False,
    )

    overview = build_overview_slice(
        session, dataset_id, limit_nodes=node_limit, limit_edges=edge_limit
    )
    guided = build_omnia_demo_slice(
        session,
        dataset_id,
        limit_nodes=node_limit,
        limit_edges=edge_limit,
        mode="guided",
        expand_context=True,
    )

    candidates_payload = pipeline.get_candidates_payload(session)

    filtering_artifact = session.artifacts.get("filtering") or {}
    scored_df = filtering_artifact.get("scored_candidates_df")
    filtering_payload = {
        "enabled": filtering_artifact.get("enabled"),
        "metadata": filtering_artifact.get("metadata"),
        "threshold": filtering_artifact.get("threshold"),
        "accepted_count": _frame_len(filtering_artifact.get("accepted_df")),
        "rejected_count": _frame_len(filtering_artifact.get("rejected_df")),
        "candidates": pipeline._to_records(session, scored_df)
        if scored_df is not None and _frame_len(scored_df) > 0
        else [],
    }

    llm_artifact = session.artifacts.get("llm") or {}
    evaluated_df = llm_artifact.get("evaluated_df")
    llm_payload = {
        "mode": llm_artifact.get("mode"),
        "strategy": llm_artifact.get("strategy"),
        "strategy_label": llm_artifact.get("strategy_label"),
        "top_k": llm_artifact.get("top_k"),
        "model_name": llm_artifact.get("model_name"),
        "is_mock": llm_artifact.get("is_mock"),
        "summary": llm_artifact.get("summary"),
        "runtime_sec": llm_artifact.get("runtime_sec"),
        "ollama": llm_artifact.get("ollama"),
        "candidates": pipeline._to_records(session, evaluated_df)
        if evaluated_df is not None and _frame_len(evaluated_df) > 0
        else [],
    }

    paper = ingestion.OMNIA_PAPER_COUNTS.get(sample_id, {})
    elapsed = time.perf_counter() - t0

    result = {
        "datasetId": dataset_id,
        "sampleId": sample_id,
        "sessionId": session.session_id,
        "recommendedMode": entry["recommended_mode"],
        "limits": {"nodes": node_limit, "edges": edge_limit},
        "samplingLimit": sampling_limit,
        "paperStats": paper,
        "session": {
            "dataset_name": session.dataset_name,
            "holdout_mode": session.holdout_mode,
            "sample_proportion": session.sample_proportion,
            "diagnostics": session.diagnostics,
            "warnings": session.warnings,
            "known_triples": int(len(session.known_df)),
            "missing_triples": int(len(session.missing_df)),
        },
        "pipeline": pipeline_summary,
        "candidateGeneration": candidates_payload,
        "filtering": filtering_payload,
        "llmValidation": llm_payload,
        "overviewSlice": overview,
        "guidedSlice": guided,
        "clusters": guided.get("clusters") or [],
        "candidates": guided.get("candidates") or [],
        "selectedCluster": guided.get("selected_cluster"),
        "selectedCandidate": guided.get("selected_candidate"),
        "explanation": guided.get("explanation"),
        "runtimeSec": round(elapsed, 2),
    }
    print(
        f"[{dataset_id}] done in {elapsed:.1f}s — "
        f"overview {len(overview.get('nodes') or [])}n/{len(overview.get('edges') or [])}e, "
        f"guided {len(guided.get('nodes') or [])}n/{len(guided.get('edges') or [])}e, "
        f"candidates {len(result['candidates'])}"
    )
    return result


def _copy_to_demo_scenarios(out_path: Path) -> Path:
    DEMO_SCENARIOS_DIR.mkdir(parents=True, exist_ok=True)
    dest = DEMO_SCENARIOS_DIR / out_path.name
    shutil.copy2(out_path, dest)
    return dest


def main() -> int:
    parser = argparse.ArgumentParser(description="Export OMNIA demo JSON from official benchmark splits.")
    parser.add_argument("--sampling-limit", type=int, default=DEFAULT_SAMPLING_LIMIT)
    parser.add_argument("--sample-proportion", type=float, default=DEFAULT_SAMPLE_PROPORTION)
    parser.add_argument("--node-limit", type=int, default=DEFAULT_NODE_LIMIT)
    parser.add_argument("--edge-limit", type=int, default=DEFAULT_EDGE_LIMIT)
    parser.add_argument("--copy-to-frontend", action="store_true", default=True)
    parser.add_argument("--no-copy-to-frontend", dest="copy_to_frontend", action="store_false")
    args = parser.parse_args()

    sys.path.insert(0, str(REPO_ROOT))
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    index: dict[str, Any] = {
        "nodeLimit": args.node_limit,
        "edgeLimit": args.edge_limit,
        "samplingLimit": args.sampling_limit,
        "sampleProportion": args.sample_proportion,
        "sources": {
            "codexM": "https://github.com/tsafavi/codex (codex-m)",
            "fb15k237": "https://github.com/villmow/datasets_knowledge_embedding (FB15k-237)",
            "wn18rr": "https://github.com/villmow/datasets_knowledge_embedding (WN18RR/original)",
        },
        "datasets": {},
        "covidFact": {
            "file": "frontend/public/demo-scenarios/covidFact_static_demo.json",
            "note": "Static guided scenario only (no live KG backend converter).",
        },
    }

    for entry in BENCHMARKS:
        try:
            payload = _export_dataset(
                entry,
                node_limit=args.node_limit,
                edge_limit=args.edge_limit,
                sampling_limit=args.sampling_limit,
                sample_proportion=args.sample_proportion,
            )
        except Exception as exc:
            print(f"[{entry['dataset_id']}] FAILED: {exc}")
            index["datasets"][entry["dataset_id"]] = {"error": str(exc)}
            continue
        if payload is None:
            index["datasets"][entry["dataset_id"]] = {"error": "export returned None"}
            continue

        out_path = OUTPUT_DIR / f"{entry['dataset_id']}_100node.json"
        clean = _json_ready(payload)
        out_path.write_text(json.dumps(clean, indent=2), encoding="utf-8")
        print(f"  wrote {out_path.relative_to(REPO_ROOT)}")
        if args.copy_to_frontend:
            copied = _copy_to_demo_scenarios(out_path)
            print(f"  copied -> {copied.relative_to(REPO_ROOT)}")

        index["datasets"][entry["dataset_id"]] = {
            "file": str(out_path.relative_to(REPO_ROOT)),
            "sessionId": payload["sessionId"],
            "runtimeSec": payload["runtimeSec"],
            "overview": {
                "nodes": len(payload["overviewSlice"].get("nodes") or []),
                "edges": len(payload["overviewSlice"].get("edges") or []),
            },
            "guided": {
                "nodes": len(payload["guidedSlice"].get("nodes") or []),
                "edges": len(payload["guidedSlice"].get("edges") or []),
                "clusters": len(payload["clusters"]),
                "candidates": len(payload["candidates"]),
            },
            "pipelineSummary": payload.get("pipeline", {}).get("summary"),
        }

    index_path = OUTPUT_DIR / "index.json"
    index_path.write_text(json.dumps(_json_ready(index), indent=2), encoding="utf-8")
    print(f"\nWrote index -> {index_path.relative_to(REPO_ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
