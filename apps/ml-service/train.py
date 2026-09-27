import os
import sys
from typing import Dict, Any

from model import AnomalyDetector
from dataset import generate_synthetic_dataset


def train_and_evaluate(
    model_version: str = "v1.0.0",
    model_path: str = "models/anomaly_detector.pkl",
    n_train: int = 1500,
    n_test: int = 500,
) -> Dict[str, Any]:
    """
    Train IsolationForest anomaly detection model, evaluate on held-out test split,
    measure FPR and TPR, and persist artifact.
    """
    print(f"[*] Generating synthetic security event dataset (train={n_train}, test={n_test})...")
    X_train, y_train, X_test, y_test = generate_synthetic_dataset(
        n_train=n_train, n_test=n_test, anomaly_ratio=0.04
    )

    detector = AnomalyDetector(model_version=model_version, contamination=0.04)
    print(f"[*] Training IsolationForest anomaly detector ({model_version})...")
    detector.fit(X_train)

    # Evaluation on held-out test set
    fp = 0  # Normal scored as anomaly
    tn = 0  # Normal scored as normal
    tp = 0  # Anomaly scored as anomaly
    fn = 0  # Anomaly scored as normal

    for i in range(len(X_test)):
        sample = X_test[i].tolist()
        label = y_test[i]
        score_res = detector.score_vector(sample)
        predicted_anomaly = score_res["is_anomaly"]

        if label == 0:  # Normal ground truth
            if predicted_anomaly:
                fp += 1
            else:
                tn += 1
        else:  # Anomaly ground truth
            if predicted_anomaly:
                tp += 1
            else:
                fn += 1

    fpr = round(fp / max(fp + tn, 1), 4)
    tpr = round(tp / max(tp + fn, 1), 4)

    detector.false_positive_rate = fpr
    detector.true_positive_rate = tpr

    print("\n" + "=" * 55)
    print("      SENTINELKEY ML ANOMALY DETECTION EVALUATION")
    print("=" * 55)
    print(f" Model Version        : {detector.model_version}")
    print(f" Samples Trained      : {detector.sample_count}")
    print(f" Held-Out Test Set    : {len(X_test)} samples ({tn + fp} normal, {tp + fn} anomalies)")
    print(f" True Positive Rate   : {tpr * 100:.1f}% ({tp}/{tp + fn} attacks caught)")
    print(f" False Positive Rate  : {fpr * 100:.2f}% ({fp}/{fp + tn} false alarms)")
    print("=" * 55)

    # Persist model
    os.makedirs(os.path.dirname(os.path.abspath(model_path)), exist_ok=True)
    detector.save(model_path)
    print(f"[+] Model artifact persisted to: {model_path}\n")

    return {
        "model_version": detector.model_version,
        "sample_count": detector.sample_count,
        "trained_at": detector.trained_at,
        "false_positive_rate": fpr,
        "true_positive_rate": tpr,
        "model_path": model_path,
    }


if __name__ == "__main__":
    result = train_and_evaluate()
    sys.exit(0)
