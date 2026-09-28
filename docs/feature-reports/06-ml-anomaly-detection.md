# Feature Report: ML Anomaly Detection

| Field | Value |
|---|---|
| **Feature ID** | SK-06 |
| **Roadmap Phase** | Phase 6 |
| **Status** | Complete |
| **Primary location** | `apps/ml-service/` + `apps/api/src/services/ml-anomaly.service.ts` |
| **Model** | Isolation Forest + Z-score/IQR fusion |
| **Hardcoded (core)** | Feature extraction, training, inference, versioning |
| **External APIs** | None |

---

## 1. Purpose

Augment rules-based IDS (SK-03) with a statistical/ML scorer that catches multi-dimensional anomalies static thresholds may miss. The Python microservice trains and serves scores; the Node API integrates asynchronously with **graceful fallback** if ML is down.

---

## 2. Problem Statement

Heuristic rules are explainable but brittle:

- Tuned thresholds miss novel combinations of mild deviations
- Operators need calibrated scores and contributing features
- The API must remain available when the ML container is offline

---

## 3. Architecture Overview

```
SecurityEvent emit (Node)
        │
        ├─ heuristics (sync path, SK-03)
        └─ mlAnomalyService.evaluateEvent (async, 2s timeout)
                 │
                 ▼ HTTP POST apps/ml-service /score
                 │
                 ├─ features.extract_features(event, history)
                 ├─ AnomalyDetector.score_vector
                 └─ if score ≥ threshold → Alert(rule=ML_ANOMALY_DETECTION)
```

Containers: `ml-service` isolated in Docker Compose; Node reaches it via `ML_SERVICE_URL` (internal network).

---

## 4. Feature Vector (8-D)

Defined in `features.py`:

| Feature | Meaning |
|---|---|
| `hour_norm` | Time of day ∈ [0, 1] |
| `is_night_hours` | 22:00–06:00 flag |
| `is_weekend` | Sat/Sun flag |
| `failed_login_ratio_1h` | Failures / attempts (60m) |
| `event_burst_5m` | Event count (5m) |
| `geo_distance_km` | Haversine vs prior event |
| `geo_velocity_kmh` | Implied travel speed |
| `distinct_ips_24h` | Distinct IPs for user (24h) |

---

## 5. Model Design (`model.py`)

- **IsolationForest** (scikit-learn) for correlated multi-feature outliers
- **Z-score / IQR** for acute single-feature spikes (e.g. extreme velocity)
- Scores calibrated to **[0.0, 1.0]**
- **Explainability:** features with \( Z \ge 2.0 \) listed as `contributing_features`
- **Severity bands:** ≥0.85 critical, ≥0.70 high, ≥0.50 medium, else low
- **Versioning:** `model_version`, `sample_count`, `trained_at`, TPR/FPR metrics

Training (`train.py` + `dataset.py`): synthetic normal traffic vs attack archetypes; held-out evaluation.

### Reported held-out metrics (training run)

| Metric | Result |
|---|---|
| True positive rate | 100% (20/20 attacks) |
| False positive rate | ~0.21% (≤ 5% acceptance bound; pytest asserts ≤ 5%) |

---

## 6. ML Service API

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Liveness + model version + metrics |
| `POST` | `/score` | Score event+history or raw feature vector |
| `GET` | `/model/info` | Hyperparams, feature names, baselines |
| `POST` | `/train` | On-demand retrain / version bump |

Internal-only by deployment intent (not a public internet surface).

---

## 7. Node Integration Resilience

| Control | Behavior |
|---|---|
| Async evaluation | Never blocks auth response path |
| Timeout | Abort after ~2000 ms |
| Circuit / failure | Log debug; continue with heuristics only |
| Threshold | `ML_ANOMALY_THRESHOLD` (e.g. 0.65) |
| Toggle | `ML_ANOMALY_ENABLED` |

Alerts use rule `ML_ANOMALY_DETECTION` with forensic metadata (score, contributors, model version).

---

## 8. Testing

| Suite | Coverage |
|---|---|
| `apps/ml-service/test_ml_service.py` | Features, scoring normal/attack, API routes, FPR bound |
| `apps/api/tests/ml-anomaly.service.test.ts` | Alert creation, timeout resilience, graceful fallback |

---

## 9. Configuration

- `ML_SERVICE_URL`
- `ML_ANOMALY_THRESHOLD`
- `ML_ANOMALY_ENABLED`
- `MODEL_PATH` (Python side)

---

## 10. Acceptance Criteria (met)

- [x] Synthetic anomalies scored that heuristics alone may score differently
- [x] FPR measured on held-out sample and documented/tested
- [x] Retrain without taking down main API
- [x] Graceful degrade to heuristics-only if ML unreachable
- [x] Scores integrated into Phase 3 alert pipeline

---

## 11. Known Limitations

- Model quality depends on volume/diversity of `SecurityEvent` history; synthetic bootstrap used until production volume accumulates.
- Inter-container networking verification requires Docker where available.
- Intentionally not deep learning — explainable IsolationForest/stats first per roadmap.
