"""
Anomaly Detection using Isolation Forest
Detects behavioral anomalies in user session logs
"""

from sklearn.ensemble import IsolationForest
import numpy as np


class AnomalyDetector:
    """
    Uses Isolation Forest to detect anomalous user sessions
    Anomalies: unusual patterns in file access, data downloads, login timing
    """

    def __init__(self, data_store, contamination: float = 0.15):
        self.data_store = data_store
        self.contamination = contamination  # Expected proportion of anomalies
        self.model = None
        self.training_data = []
        self.scaler_params = {}
        self._initialize_model()

    def _initialize_model(self):
        """Initialize Isolation Forest model with seed for reproducibility"""
        self.model = IsolationForest(
            contamination=self.contamination,
            random_state=42,
            n_estimators=100
        )

    def detect(self, session_log: dict) -> tuple:
        """
        Detect anomaly for a single session
        Returns: (anomaly_score, is_anomalous)
        """

        # Extract features
        features = self._extract_features(session_log)
        self.training_data.append(features)

        # ================= BASELINE LEARNING =================
        if len(self.training_data) < 5:
            # Do NOT call predict or score during baseline
            return 0.0, False

        # ================= FIT MODEL ONCE =================
        if len(self.training_data) == 5:
            X = np.array(self.training_data)
            self.model.fit(X)
            return 0.0, False

        # ================= SAFE DETECTION =================
        features_array = np.array(features).reshape(1, -1)

        raw_score = self.model.score_samples(features_array)[0]

        anomaly_score = max(0.0, -raw_score)
        anomaly_score = min(1.0, anomaly_score)

        is_anomalous = bool(anomaly_score > 0.5)

        return round(anomaly_score, 3), is_anomalous

    def _extract_features(self, session_log: dict) -> list:
        """
        Extract numerical features from session log for Isolation Forest

        Features:
        1. login_hour: time of day (0-23)
        2. files_accessed: number of files accessed
        3. sensitive_files: count of sensitive files
        4. data_download_mb: megabytes downloaded
        5. session_duration_min: session length in minutes
        """

        features = [
            float(session_log.get('login_hour', 0)),
            float(session_log.get('files_accessed', 0)),
            float(session_log.get('sensitive_files', 0)),
            float(session_log.get('data_download_mb', 0)),
            float(session_log.get('session_duration_min', 0))
        ]

        return features

    def _retrain_model(self):
        """Retrain Isolation Forest with accumulated training data"""
        if len(self.training_data) >= 5:
            X = np.array(self.training_data)
            try:
                self.model.fit(X)
            except Exception as e:
                print(f"Warning: Could not retrain model: {e}")

    def get_anomaly_explanation(self, session_log: dict, anomaly_score: float) -> str:
        """
        Generate human-readable explanation for anomaly score
        """

        login_hour = session_log['login_hour']
        files = session_log['files_accessed']
        sensitive = session_log['sensitive_files']
        data_dl = session_log['data_download_mb']
        duration = session_log['session_duration_min']

        issues = []

        # Check unusual timing
        if login_hour < 8 or login_hour >= 18:
            issues.append(f"login at {login_hour}:00 (outside 8AM-6PM)")

        # Check file access
        if files > 40:
            issues.append(f"high file access ({files} files)")

        # Check sensitive file access
        if sensitive > 2:
            issues.append(f"sensitive file access ({sensitive} files)")

        # Check data download
        if data_dl > 500:
            issues.append(f"large data download ({data_dl:.0f} MB)")

        # Check session duration
        if duration > 100:
            issues.append(f"long session ({duration} minutes)")

        if not issues:
            return f"Anomaly score {anomaly_score:.2f}: Minor behavioral deviation"

        return f"Anomaly score {anomaly_score:.2f}: {', '.join(issues)}"
