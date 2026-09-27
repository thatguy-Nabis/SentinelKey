import json
import pytest
import numpy as np

from app import app
from features import extract_features, haversine_distance_km, FEATURE_NAMES
from model import AnomalyDetector
from dataset import generate_synthetic_dataset


@pytest.fixture
def client():
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client


def test_haversine_distance():
    # New York (40.7128, -74.0060) to London (51.5074, -0.1278) is approx 5570 km
    dist = haversine_distance_km(40.7128, -74.0060, 51.5074, -0.1278)
    assert 5500 < dist < 5650

    # Same location is 0 km
    assert haversine_distance_km(40.7128, -74.0060, 40.7128, -74.0060) == 0.0


def test_feature_extraction():
    event = {
        "type": "AUTH_LOGIN_SUCCESS",
        "ip": "198.51.100.5",
        "timestamp": "2026-09-27T14:30:00Z",
        "metadata": {
            "location": {"latitude": 40.7128, "longitude": -74.0060, "city": "New York"}
        },
    }
    history = [
        {
            "type": "AUTH_LOGIN_SUCCESS",
            "ip": "198.51.100.5",
            "timestamp": "2026-09-27T14:28:00Z",
            "metadata": {
                "location": {"latitude": 40.7128, "longitude": -74.0060, "city": "New York"}
            },
        }
    ]

    features = extract_features(event, history)
    assert len(features) == len(FEATURE_NAMES)
    # [hour_norm, is_night_hours, is_weekend, failed_login_ratio_1h,
    #  event_burst_5m, geo_distance_km, geo_velocity_kmh, distinct_ips_24h]
    assert 0.0 <= features[0] <= 1.0  # hour_norm
    assert features[1] == 0.0         # 14:30 is not night
    assert features[3] == 0.0         # 0% failures
    assert features[4] == 2.0         # 2 events in 5m
    assert features[5] == 0.0         # distance 0 km
    assert features[7] == 1.0         # 1 distinct IP


def test_scoring_normal_behavior():
    detector = AnomalyDetector()
    # Baseline train
    X_train, _, _, _ = generate_synthetic_dataset(n_train=600, n_test=100)
    detector.fit(X_train)

    # Normal office login: hour=14:00 (0.58), day, not weekend, 0 failures, burst=1, dist=0, vel=0, ips=1
    normal_vector = [0.58, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0]
    result = detector.score_vector(normal_vector)

    assert result["is_anomaly"] is False
    assert result["anomaly_score"] < 0.65
    assert result["severity"] in ["low", "medium"]


def test_scoring_brute_force_anomaly():
    detector = AnomalyDetector()
    X_train, _, _, _ = generate_synthetic_dataset(n_train=600, n_test=100)
    detector.fit(X_train)

    # Brute force attack: off-hours, 100% failures, 45 attempts in 5m
    brute_force_vector = [0.12, 1.0, 0.0, 1.0, 45.0, 0.0, 0.0, 1.0]
    result = detector.score_vector(brute_force_vector)

    assert result["is_anomaly"] is True
    assert result["anomaly_score"] >= 0.65
    assert "failed_login_ratio_1h" in result["contributing_features"] or "event_burst_5m" in result["contributing_features"]


def test_scoring_impossible_travel_anomaly():
    detector = AnomalyDetector()
    X_train, _, _, _ = generate_synthetic_dataset(n_train=600, n_test=100)
    detector.fit(X_train)

    # Impossible travel: 5500 km in 30 seconds -> 660,000 km/h
    travel_vector = [0.50, 0.0, 0.0, 0.0, 2.0, 5570.0, 66000.0, 2.0]
    result = detector.score_vector(travel_vector)

    assert result["is_anomaly"] is True
    assert result["anomaly_score"] >= 0.65
    assert "geo_velocity_kmh" in result["contributing_features"] or "geo_distance_km" in result["contributing_features"]


def test_api_health_endpoint(client):
    res = client.get("/health")
    assert res.status_code == 200
    data = res.get_json()
    assert data["status"] == "ok"
    assert data["service"] == "ml-service"
    assert "model_version" in data
    assert "false_positive_rate" in data


def test_api_model_info_endpoint(client):
    res = client.get("/model/info")
    assert res.status_code == 200
    data = res.get_json()
    assert "model_version" in data
    assert "threshold" in data
    assert len(data["features"]) == 8


def test_api_score_endpoint(client):
    event_payload = {
        "event": {
            "type": "AUTH_LOGIN_SUCCESS",
            "ip": "203.0.113.19",
            "timestamp": "2026-09-27T12:00:00Z",
            "metadata": {"location": {"latitude": 40.71, "longitude": -74.00}},
        },
        "history": [],
    }
    res = client.post("/score", json=event_payload)
    assert res.status_code == 200
    data = res.get_json()
    assert "is_anomaly" in data
    assert "anomaly_score" in data
    assert "severity" in data
    assert "confidence" in data
    assert "contributing_features" in data
    assert "model_version" in data


def test_held_out_false_positive_rate():
    """Verify acceptance criterion: FPR measured on held-out sample <= 5%."""
    detector = AnomalyDetector()
    X_train, y_train, X_test, y_test = generate_synthetic_dataset(
        n_train=1000, n_test=400, anomaly_ratio=0.04
    )
    detector.fit(X_train)

    normal_test_samples = X_test[y_test == 0]
    fp = 0
    for sample in normal_test_samples:
        score_res = detector.score_vector(sample.tolist())
        if score_res["is_anomaly"]:
            fp += 1

    fpr = fp / len(normal_test_samples)
    # Measured FPR must be <= 5%
    assert fpr <= 0.05, f"False Positive Rate {fpr:.4f} exceeds 5% threshold"
