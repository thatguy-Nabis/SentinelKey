import os
import json
import pickle
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
from sklearn.ensemble import IsolationForest

from features import FEATURE_NAMES


class AnomalyDetector:
    def __init__(
        self,
        model_version: str = "v1.0.0",
        contamination: float = 0.04,
        threshold: float = 0.65,
    ):
        self.model_version = model_version
        self.contamination = contamination
        self.threshold = threshold
        self.trained_at: Optional[str] = None
        self.sample_count: int = 0
        self.false_positive_rate: float = 0.0
        self.true_positive_rate: float = 0.0

        # Statistical baselines for explainability
        self.feature_means: List[float] = [0.0] * len(FEATURE_NAMES)
        self.feature_stds: List[float] = [1.0] * len(FEATURE_NAMES)

        # Scikit-learn IsolationForest model
        self.model = IsolationForest(
            n_estimators=100,
            contamination=contamination,
            random_state=42,
            n_jobs=-1,
        )
        self._is_fitted = False

    def fit(self, X: np.ndarray, y: Optional[np.ndarray] = None) -> "AnomalyDetector":
        """Fit IsolationForest on feature matrix X (shape: [N, len(FEATURE_NAMES)])."""
        X_arr = np.asarray(X, dtype=np.float64)
        if len(X_arr) == 0:
            raise ValueError("Cannot train on empty feature matrix")

        # Fit model
        self.model.fit(X_arr)
        self._is_fitted = True
        self.sample_count = len(X_arr)
        self.trained_at = datetime.now(timezone.utc).isoformat()

        # Compute baseline feature moments for explainability
        self.feature_means = np.mean(X_arr, axis=0).tolist()
        self.feature_stds = np.std(X_arr, axis=0).tolist()
        # Avoid zero division
        self.feature_stds = [max(s, 1e-4) for s in self.feature_stds]

        return self

    def score_vector(self, features: List[float]) -> Dict[str, Any]:
        """
        Score a single feature vector.
        Returns dict with is_anomaly, anomaly_score (0.0 to 1.0), severity,
        confidence, model_version, and contributing_features.
        """
        if not self._is_fitted:
            # Fallback heuristic scoring if model not yet fitted
            return self._heuristic_fallback_score(features)

        X_input = np.asarray([features], dtype=np.float64)

        # decision_function: negative is anomalous, positive is normal (typically -0.5 to +0.5)
        raw_score = float(self.model.decision_function(X_input)[0])
        tree_anomaly = bool(self.model.predict(X_input)[0] == -1)

        # Sigmoid calibration: map raw score into [0.0, 1.0] where 1.0 is extreme anomaly
        k = 10.0
        base_score = float(1.0 / (1.0 + np.exp(k * raw_score)))

        # Explainability & statistical outlier detection
        contributing_features = []
        max_z = 0.0
        for i, val in enumerate(features):
            mean = self.feature_means[i]
            std = self.feature_stds[i]
            z_score = abs(val - mean) / std
            if z_score >= 2.0:
                contributing_features.append(FEATURE_NAMES[i])
            if z_score > max_z:
                max_z = z_score

        # Outlier boost for extreme single-feature deviations (e.g. impossible travel speed)
        stat_boost = 0.0
        if max_z >= 3.5:
            stat_boost = min(0.40, 0.20 + (max_z - 3.5) * 0.02)

        anomaly_score = max(0.0, min(1.0, round(base_score + stat_boost, 4)))
        is_anomaly = anomaly_score >= self.threshold or tree_anomaly or (max_z >= 5.0)

        # Severity determination
        if anomaly_score >= 0.85:
            severity = "critical"
        elif anomaly_score >= 0.70:
            severity = "high"
        elif anomaly_score >= 0.50:
            severity = "medium"
        else:
            severity = "low"

        # Confidence metric (distance from threshold)
        confidence = round(min(1.0, 0.5 + abs(anomaly_score - self.threshold) * 1.5), 2)

        return {
            "is_anomaly": is_anomaly,
            "anomaly_score": anomaly_score,
            "severity": severity,
            "confidence": confidence,
            "model_version": self.model_version,
            "contributing_features": contributing_features,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    def _heuristic_fallback_score(self, features: List[float]) -> Dict[str, Any]:
        """Rule-based statistical fallback when un-fitted."""
        # [hour_norm, is_night_hours, is_weekend, failed_login_ratio_1h,
        #  event_burst_5m, geo_distance_km, geo_velocity_kmh, distinct_ips_24h]
        failed_ratio = features[3] if len(features) > 3 else 0.0
        burst = features[4] if len(features) > 4 else 1.0
        velocity = features[6] if len(features) > 6 else 0.0

        score = 0.1
        contributors = []

        if velocity > 800.0:
            score += 0.55
            contributors.append("geo_velocity_kmh")
        if failed_ratio >= 0.5:
            score += 0.35
            contributors.append("failed_login_ratio_1h")
        if burst >= 10.0:
            score += 0.30
            contributors.append("event_burst_5m")

        score = min(1.0, score)
        return {
            "is_anomaly": score >= self.threshold,
            "anomaly_score": round(score, 4),
            "severity": "critical" if score >= 0.85 else "high" if score >= 0.7 else "low",
            "confidence": 0.70,
            "model_version": f"{self.model_version}-fallback",
            "contributing_features": contributors,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    def save(self, filepath: str) -> None:
        """Save model weights and metadata to file."""
        os.makedirs(os.path.dirname(os.path.abspath(filepath)), exist_ok=True)
        artifact = {
            "model_version": self.model_version,
            "contamination": self.contamination,
            "threshold": self.threshold,
            "trained_at": self.trained_at,
            "sample_count": self.sample_count,
            "false_positive_rate": self.false_positive_rate,
            "true_positive_rate": self.true_positive_rate,
            "feature_means": self.feature_means,
            "feature_stds": self.feature_stds,
            "is_fitted": self._is_fitted,
            "model": self.model,
        }
        with open(filepath, "wb") as f:
            pickle.dump(artifact, f)

    @classmethod
    def load(cls, filepath: str) -> "AnomalyDetector":
        """Load model weights and metadata from file."""
        with open(filepath, "rb") as f:
            artifact = pickle.load(f)

        detector = cls(
            model_version=artifact.get("model_version", "v1.0.0"),
            contamination=artifact.get("contamination", 0.04),
            threshold=artifact.get("threshold", 0.65),
        )
        detector.trained_at = artifact.get("trained_at")
        detector.sample_count = artifact.get("sample_count", 0)
        detector.false_positive_rate = artifact.get("false_positive_rate", 0.0)
        detector.true_positive_rate = artifact.get("true_positive_rate", 0.0)
        detector.feature_means = artifact.get("feature_means", [0.0] * len(FEATURE_NAMES))
        detector.feature_stds = artifact.get("feature_stds", [1.0] * len(FEATURE_NAMES))
        detector.model = artifact.get("model")
        detector._is_fitted = artifact.get("is_fitted", True)
        return detector
