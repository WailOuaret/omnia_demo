#!/usr/bin/env python3
"""Extract compact OMNIA+ presentation scenarios for the guided demo frontend.

Reads the large exports in outputs/omnia-100node-results/ and writes small,
frontend-friendly JSON files into frontend/public/omnia-presentation/ so the
demo never ships multi-megabyte session dumps.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parents[1]
SRC_DIR = REPO_ROOT / "outputs" / "omnia-100node-results"
OUT_DIR = REPO_ROOT / "frontend" / "public" / "omnia-presentation"

OVERVIEW_EDGE_CAP = 18
GUIDED_NODE_CAP = 26
CANDIDATE_CAP = 14

DATASET_META = {
    "codexM": {"label": "CoDEx-M", "shortName": "CoDEx-M", "publicStatus": "public"},
    "fb15k237": {"label": "FB15K-237", "shortName": "FB15K-237", "publicStatus": "public"},
    "wn18rr": {"label": "WN18RR", "shortName": "WN18RR", "publicStatus": "public"},
    "covidFact": {"label": "COVID-Fact", "shortName": "COVID-Fact", "publicStatus": "public"},
}


def _f(value: Any) -> float | None:
    try:
        if value is None:
            return None
        return float(value)
    except (TypeError, ValueError):
        return None


def _overview(slice_obj: dict[str, Any]) -> dict[str, Any]:
    raw_edges = slice_obj.get("edges") or []
    edges: list[dict[str, Any]] = []
    node_ids: set[str] = set()
    for edge in raw_edges:
        if len(edges) >= OVERVIEW_EDGE_CAP:
            break
        src, tgt = edge.get("source"), edge.get("target")
        if not src or not tgt:
            continue
        edges.append(
            {
                "id": edge.get("id") or f"{src}->{tgt}",
                "source": src,
                "target": tgt,
                "relation": edge.get("label") or "",
                "status": edge.get("status") or "known",
            }
        )
        node_ids.add(src)
        node_ids.add(tgt)

    label_by_id = {n.get("id"): n.get("label") for n in (slice_obj.get("nodes") or [])}
    nodes = [{"id": nid, "label": label_by_id.get(nid, nid)} for nid in node_ids]
    return {"nodes": nodes, "edges": edges}


def _guided(slice_obj: dict[str, Any]) -> dict[str, Any]:
    raw_nodes = (slice_obj.get("nodes") or [])[:GUIDED_NODE_CAP]
    keep_ids = {n.get("id") for n in raw_nodes}
    nodes = [
        {
            "id": n.get("id"),
            "label": n.get("label") or n.get("id"),
            "role": n.get("role") or "context",
            "clusterId": n.get("cluster_id"),
        }
        for n in raw_nodes
    ]
    edges = []
    for edge in slice_obj.get("edges") or []:
        src, tgt = edge.get("source"), edge.get("target")
        if src not in keep_ids or tgt not in keep_ids:
            continue
        edges.append(
            {
                "id": edge.get("id") or f"{src}->{tgt}",
                "source": src,
                "target": tgt,
                "relation": edge.get("label") or "",
                "status": edge.get("status") or "known",
                "candidateId": edge.get("candidate_id"),
                "role": edge.get("role") or "context",
            }
        )
    return {"nodes": nodes, "edges": edges}


def _candidate(raw: dict[str, Any], shared_rel: str | None, shared_tail: str | None) -> dict[str, Any]:
    return {
        "id": raw.get("candidate_id") or raw.get("id") or "",
        "head": raw.get("Head") or raw.get("head") or "",
        "relation": raw.get("Relation") or raw.get("relation") or "",
        "tail": raw.get("Tail") or raw.get("tail") or "",
        "distance": _f(raw.get("distance")),
        "threshold": _f(raw.get("threshold")),
        "filterStatus": raw.get("filter_status") or raw.get("status_bucket") or "",
        "llmDecision": raw.get("llm_decision"),
        "llmScore": _f(raw.get("llm_score")),
        "llmRationale": raw.get("llm_rationale"),
        "retrievedContext": raw.get("retrieved_context") or [],
        "clusterId": (raw.get("cluster_ids") or [None])[0],
        "whyGenerated": raw.get("why_generated"),
        "sharedRelation": shared_rel,
        "sharedTail": shared_tail,
    }


def _split_cluster_key(key: str | None) -> tuple[str | None, str | None]:
    if not key:
        return None, None
    if " -> " in key:
        rel, tail = key.split(" -> ", 1)
        return rel.strip(), tail.strip()
    return None, None


def build_backend(dataset_id: str) -> dict[str, Any]:
    raw = json.loads((SRC_DIR / f"{dataset_id}_100node.json").read_text(encoding="utf-8"))
    meta = DATASET_META[dataset_id]
    guided_slice = raw.get("guidedSlice") or {}
    selected_cluster = guided_slice.get("selected_cluster") or raw.get("selectedCluster") or {}
    shared_rel = selected_cluster.get("shared_relation")
    shared_tail = selected_cluster.get("shared_tail")

    cand_gen = (raw.get("candidateGeneration") or {}).get("summary") or {}
    filtering = raw.get("filtering") or {}
    llm = raw.get("llmValidation") or {}
    llm_summary = llm.get("summary") or {}

    # Primary candidates come from the cluster-centred guided slice.
    guided_candidates = guided_slice.get("candidates") or raw.get("candidates") or []
    candidates = [_candidate(c, shared_rel, shared_tail) for c in guided_candidates]
    seen = {c["id"] for c in candidates}

    # Enrich with the best-scoring accepted candidates from the filter queue.
    extra = []
    for c in filtering.get("candidates") or []:
        cid = c.get("candidate_id") or c.get("id")
        dist = _f(c.get("distance"))
        thr = _f(filtering.get("threshold"))
        if dist is None or thr is None or dist > thr:
            continue
        rel, tail = _split_cluster_key((c.get("cluster_keys") or [None])[0])
        extra.append((dist, _candidate({**c, "filter_status": "accepted"}, rel, tail)))
    extra.sort(key=lambda item: item[0])
    for _dist, cand in extra:
        if len(candidates) >= CANDIDATE_CAP:
            break
        if cand["id"] in seen or not cand["id"]:
            continue
        seen.add(cand["id"])
        candidates.append(cand)

    session = raw.get("session") or {}
    selected_candidate = guided_slice.get("selected_candidate") or raw.get("selectedCandidate") or {}

    llm_is_mock = bool(llm.get("is_mock"))

    return {
        "datasetId": dataset_id,
        "label": meta["label"],
        "shortName": meta["shortName"],
        "recommendedMode": raw.get("recommendedMode") or "triple-rag",
        "publicStatus": meta["publicStatus"],
        "static": False,
        "paperStats": raw.get("paperStats") or {},
        "sample": {
            "knownTriples": session.get("known_triples"),
            "missingTriples": session.get("missing_triples"),
            "rowCount": (session.get("diagnostics") or {}).get("row_count"),
            "sampleProportion": session.get("sample_proportion"),
        },
        "metrics": {
            "generatedCandidates": cand_gen.get("generated_count"),
            "filterQueueCount": cand_gen.get("filter_queue_count"),
            "filteringEnabled": filtering.get("enabled"),
            "filteringModel": (filtering.get("metadata") or {}).get("model_name") or "TransE",
            "threshold": _f(filtering.get("threshold")),
            "filteringAccepted": filtering.get("accepted_count"),
            "filteringRejected": filtering.get("rejected_count"),
            "llmAvailable": not llm_is_mock,
            "llmStrategyLabel": llm.get("strategy_label"),
            "llmTopK": llm.get("top_k"),
            "llmAccepted": llm_summary.get("accepted"),
            "llmRejected": llm_summary.get("rejected"),
            "llmUnresolved": llm_summary.get("unresolved"),
        },
        "cluster": {
            "sharedRelation": shared_rel,
            "sharedTail": shared_tail,
            "members": selected_cluster.get("members") or [],
            "clusterKey": selected_cluster.get("cluster_key"),
        },
        "overview": _overview(raw.get("overviewSlice") or {}),
        "guided": _guided(guided_slice),
        "candidates": candidates,
        "selectedCandidateId": selected_candidate.get("candidate_id") or (candidates[0]["id"] if candidates else None),
    }


def build_covid() -> dict[str, Any]:
    raw = json.loads((SRC_DIR / "covidFact_static_demo.json").read_text(encoding="utf-8"))
    meta = DATASET_META["covidFact"]
    guided_slice = (raw.get("steps") or {}).get("clustering", {}).get("graphSlice") or {}
    selected_cluster = raw.get("selectedCluster") or {}
    shared_rel = selected_cluster.get("shared_relation")
    shared_tail = selected_cluster.get("shared_tail")
    candidates = [
        _candidate(c, shared_rel, shared_tail) for c in (raw.get("generatedCandidates") or [])
    ]
    filtering = raw.get("filtering") or {}
    llm = raw.get("llm") or {}
    selected_candidate = raw.get("selectedCandidate") or {}

    return {
        "datasetId": "covidFact",
        "label": meta["label"],
        "shortName": meta["shortName"],
        "recommendedMode": raw.get("recommendedMode") or "sentence-rag",
        "publicStatus": meta["publicStatus"],
        "static": True,
        "paperStats": raw.get("paperStats") or {},
        "sample": {
            "knownTriples": (raw.get("paperStats") or {}).get("triples"),
            "missingTriples": None,
            "rowCount": None,
            "sampleProportion": None,
        },
        "metrics": {
            "generatedCandidates": len(candidates),
            "filterQueueCount": filtering.get("beforeFiltering"),
            "filteringEnabled": filtering.get("available"),
            "filteringModel": filtering.get("model") or "TransE",
            "threshold": _f(filtering.get("threshold")),
            "filteringAccepted": filtering.get("afterFiltering"),
            "filteringRejected": (filtering.get("beforeFiltering") or 0) - (filtering.get("afterFiltering") or 0),
            "llmAvailable": bool(llm.get("available")),
            "llmStrategyLabel": llm.get("strategy"),
            "llmTopK": llm.get("topK"),
            "llmAccepted": sum(1 for c in candidates if c.get("llmDecision") == "valid"),
            "llmRejected": sum(1 for c in candidates if c.get("llmDecision") == "invalid"),
            "llmUnresolved": sum(1 for c in candidates if c.get("llmDecision") == "uncertain"),
        },
        "cluster": {
            "sharedRelation": shared_rel,
            "sharedTail": shared_tail,
            "members": selected_cluster.get("members") or [],
            "clusterKey": selected_cluster.get("cluster_key"),
        },
        "overview": _overview(raw.get("overviewSlice") or {}),
        "guided": _guided(guided_slice),
        "candidates": candidates,
        "selectedCandidateId": selected_candidate.get("candidate_id") or (candidates[0]["id"] if candidates else None),
    }


def main() -> int:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    index: dict[str, Any] = {"datasets": []}

    builders = {
        "codexM": build_backend,
        "fb15k237": build_backend,
        "wn18rr": build_backend,
        "covidFact": lambda _id: build_covid(),
    }

    for dataset_id, builder in builders.items():
        payload = builder(dataset_id)
        out_path = OUT_DIR / f"{dataset_id}.json"
        out_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
        size_kb = out_path.stat().st_size / 1024
        index["datasets"].append(
            {
                "datasetId": dataset_id,
                "label": payload["label"],
                "static": payload["static"],
                "candidates": len(payload["candidates"]),
                "overviewNodes": len(payload["overview"]["nodes"]),
                "guidedNodes": len(payload["guided"]["nodes"]),
            }
        )
        print(f"  wrote {out_path.name} ({size_kb:.1f} KB) — {len(payload['candidates'])} candidates")

    (OUT_DIR / "index.json").write_text(json.dumps(index, indent=2), encoding="utf-8")
    print(f"Wrote presentation data -> {OUT_DIR.relative_to(REPO_ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
