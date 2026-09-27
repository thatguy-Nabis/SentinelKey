import os
from datetime import datetime, timezone
from typing import Any, Dict

from flask import Flask, jsonify, request

from features import FEATURE_NAMES, extract_features
from model import AnomalyDetector
from train import train_and_evaluate

app = Flask(__name__)

# Active model instance
MODEL_PATH = os.environ.get("MODEL_PATH", "models/anomaly_detector.pkl")
detector: AnomalyDetector


def load_or_init_model() -> AnomalyDetector:
    global detector
    if os.path.exists(MODEL_PATH):
        try:
            detector = AnomalyDetector.load(MODEL_PATH)
            print(f"[ML] Successfully loaded model {detector.model_version} from {MODEL_PATH}")
            return detector
        except Exception as e:
            print(f"[ML] Failed to load model from {MODEL_PATH}: {e}. Retraining...")

    print("[ML] Initializing and training baseline model...")
    res = train_and_evaluate(model_path=MODEL_PATH)
    detector = AnomalyDetector.load(MODEL_PATH)
    return detector


# Load model at startup
detector = load_or_init_model()


@app.get("/health")
def health():
    return jsonify({
        "status": "ok",
        "service": "ml-service",
        "model_version": detector.model_version,
        "sample_count": detector.sample_count,
        "false_positive_rate": detector.false_positive_rate,
        "true_positive_rate": detector.true_positive_rate,
    })


@app.post("/score")
def score_event():
    """
    Score a security event for anomalies in near-real-time.
    Payload:
      {
        "event": { "type": "AUTH_LOGIN_FAILED", "ip": "...", "timestamp": "...", "metadata": {...} },
        "history": [ ...trailing events... ]
      }
      OR direct feature vector:
      { "features": [0.4, 0.0, 0.0, 0.9, 25.0, 0.0, 0.0, 1.0] }
    """
    body: Dict[str, Any] = request.get_json(silent=True) or {}

    features = body.get("features")
    if not features:
        event = body.get("event")
        if not event:
            return jsonify({"error": "Missing 'event' or 'features' in request payload"}), 400
        history = body.get("history", [])
        features = extract_features(event, history)

    score_result = detector.score_vector(features)
    score_result["features"] = features
    score_result["feature_names"] = FEATURE_NAMES

    return jsonify(score_result)


@app.get("/model/info")
def model_info():
    """Return model version, parameters, thresholds, and performance metrics."""
    return jsonify({
        "model_version": detector.model_version,
        "trained_at": detector.trained_at,
        "sample_count": detector.sample_count,
        "threshold": detector.threshold,
        "contamination": detector.contamination,
        "false_positive_rate": detector.false_positive_rate,
        "true_positive_rate": detector.true_positive_rate,
        "features": FEATURE_NAMES,
        "feature_means": detector.feature_means,
        "feature_stds": detector.feature_stds,
    })


@app.post("/train")
def trigger_training():
    """Trigger on-demand retraining of the anomaly detection model."""
    global detector
    body = request.get_json(silent=True) or {}
    new_version = body.get("model_version", f"v{float(detector.model_version.lstrip('v')) + 0.1:.1f}")
    n_train = int(body.get("n_train", 1500))
    n_test = int(body.get("n_test", 500))

    try:
        metrics = train_and_evaluate(
            model_version=new_version,
            model_path=MODEL_PATH,
            n_train=n_train,
            n_test=n_test,
        )
        detector = AnomalyDetector.load(MODEL_PATH)
        return jsonify({
            "success": True,
            "message": f"Successfully retrained model to version {detector.model_version}",
            "metrics": metrics,
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "5001"))
    app.run(host="0.0.0.0", port=port, debug=False)
