import random
from typing import List, Tuple
import numpy as np

# Feature vector format:
# [hour_norm, is_night_hours, is_weekend, failed_login_ratio_1h,
#  event_burst_5m, geo_distance_km, geo_velocity_kmh, distinct_ips_24h]


def generate_synthetic_normal_sample() -> List[float]:
    """Generate a single feature vector representing normal, expected enterprise user behavior."""
    # Mostly working hours (8am - 6pm)
    hour = random.gauss(13.0, 3.0) % 24.0
    hour_norm = hour / 24.0
    is_night = 1.0 if (hour < 6.0 or hour >= 22.0) else 0.0
    is_weekend = 1.0 if random.random() < 0.10 else 0.0  # Occasional weekend login

    # Normal failure ratio is low
    failed_ratio = random.betavariate(0.5, 10.0) if random.random() < 0.20 else 0.0
    failed_ratio = min(0.15, failed_ratio)

    # Low burst rate (1 to 4 events in 5m)
    burst = float(random.choice([1, 1, 1, 2, 2, 3, 4]))

    # Local commute or static IP
    distance = random.expovariate(0.1) if random.random() < 0.3 else 0.0
    distance = min(60.0, distance)  # Max 60 km commute
    velocity = distance / max(random.uniform(0.5, 2.0), 0.1) if distance > 0 else 0.0
    velocity = min(100.0, velocity)

    # 1 to 2 distinct IPs (home and office)
    distinct_ips = float(random.choice([1, 1, 1, 2]))

    return [
        round(hour_norm, 4),
        float(is_night),
        float(is_weekend),
        round(failed_ratio, 4),
        burst,
        round(distance, 2),
        round(velocity, 2),
        distinct_ips,
    ]


def generate_synthetic_anomaly_sample() -> List[float]:
    """Generate a single feature vector representing a cyber attack or abnormal intrusion pattern."""
    anomaly_type = random.choice(["brute_force", "impossible_travel", "distributed_sweep", "off_hours_burst"])

    if anomaly_type == "brute_force":
        # Rapid failed attempts in short window
        hour_norm = random.uniform(0.0, 1.0)
        is_night = 1.0 if (hour_norm * 24 < 6 or hour_norm * 24 >= 22) else 0.0
        return [
            round(hour_norm, 4),
            is_night,
            float(random.choice([0, 1])),
            round(random.uniform(0.80, 1.0), 4),  # 80-100% failures
            float(random.randint(15, 60)),         # High burst rate
            round(random.uniform(0, 10), 2),
            round(random.uniform(0, 50), 2),
            float(random.randint(1, 3)),
        ]

    elif anomaly_type == "impossible_travel":
        # Transcontinental jump within minutes
        return [
            round(random.uniform(0.0, 1.0), 4),
            float(random.choice([0, 1])),
            float(random.choice([0, 1])),
            round(random.uniform(0.0, 0.3), 4),
            float(random.randint(1, 4)),
            round(random.uniform(3000.0, 12000.0), 2),  # Thousands of km
            round(random.uniform(1200.0, 25000.0), 2),  # > 1000 km/h
            float(random.randint(2, 4)),
        ]

    elif anomaly_type == "distributed_sweep":
        # Multi-IP password spray
        return [
            round(random.uniform(0.0, 1.0), 4),
            1.0,  # Typically off-hours
            1.0,
            round(random.uniform(0.5, 0.9), 4),
            float(random.randint(8, 25)),
            round(random.uniform(500.0, 4000.0), 2),
            round(random.uniform(400.0, 2000.0), 2),
            float(random.randint(12, 35)),  # Many unique IPs
        ]

    else:  # off_hours_burst
        # Deep night automated scraper
        return [
            round(random.uniform(0.08, 0.20), 4),  # 2:00 - 4:45 AM
            1.0,
            float(random.choice([0, 1])),
            round(random.uniform(0.3, 0.7), 4),
            float(random.randint(20, 50)),
            round(random.uniform(0, 50), 2),
            round(random.uniform(0, 100), 2),
            float(random.randint(4, 10)),
        ]


def generate_synthetic_dataset(
    n_train: int = 1200,
    n_test: int = 400,
    anomaly_ratio: float = 0.04,
    random_seed: int = 42,
) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    """
    Generate synthetic training and testing datasets for security anomaly detection.
    Returns: (X_train, y_train, X_test, y_test)
    y=0: Normal traffic, y=1: Anomaly
    """
    random.seed(random_seed)
    np.random.seed(random_seed)

    # 1. Training set (unsupervised, mostly normal with natural background noise)
    n_train_anom = int(n_train * anomaly_ratio)
    n_train_norm = n_train - n_train_anom

    train_data = [generate_synthetic_normal_sample() for _ in range(n_train_norm)]
    train_labels = [0] * n_train_norm

    for _ in range(n_train_anom):
        train_data.append(generate_synthetic_anomaly_sample())
        train_labels.append(1)

    # 2. Testing set (held-out evaluation set for measuring False Positive Rate and True Positive Rate)
    n_test_anom = int(n_test * anomaly_ratio)
    n_test_norm = n_test - n_test_anom

    test_data = [generate_synthetic_normal_sample() for _ in range(n_test_norm)]
    test_labels = [0] * n_test_norm

    for _ in range(n_test_anom):
        test_data.append(generate_synthetic_anomaly_sample())
        test_labels.append(1)

    return (
        np.array(train_data, dtype=np.float64),
        np.array(train_labels, dtype=np.int32),
        np.array(test_data, dtype=np.float64),
        np.array(test_labels, dtype=np.int32),
    )
