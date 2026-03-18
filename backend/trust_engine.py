"""
Trust Score Calculation Engine
Implements adaptive trust model with behavioral similarity and risk penalties
"""

class TrustEngine:
    """
    Trust Score Model:
    Trust(t) = 0.6 * Trust(t-1) + 0.3 * BehaviorSimilarity - 0.1 * RiskPenalty
    
    Initial trust: 80
    Risk penalties applied for:
    - Login outside normal hours: -10
    - Sensitive file access: -15
    - Large data download: -20
    """
    
    def __init__(self, data_store):
        self.data_store = data_store
        self.initial_trust = 80.0
        
        # Risk penalty amounts
        self.penalties = {
            'login_outside_hours': 10,
            'sensitive_file_access': 15,
            'large_data_download': 20
        }
        
        # Behavior thresholds (from typical user patterns)
        self.thresholds = {
            'normal_login_hours': (8, 18),  # 8 AM to 6 PM
            'max_files_normal': 30,
            'max_data_download_mb': 500,
            'max_sensitive_files': 2
        }
    
    def update_trust(self, session_log: dict, anomaly_score: float, is_anomalous: bool) -> tuple:
        """
        Update trust score for user based on new session and anomaly detection
        
        Returns: (new_trust_score, risk_penalty)
        """
        user_id = session_log['user_id']
        
        # Get previous trust score
        previous_trust = self._get_previous_trust(user_id)
        
        # Calculate behavior similarity (inverse of anomaly score, 0-100 scale)
        behavior_similarity = max(0, 100 - (anomaly_score * 10))
        
        # Calculate risk penalty based on session characteristics
        risk_penalty = self._calculate_risk_penalty(session_log)
        
        # Apply trust formula: Trust(t) = 0.6 * Trust(t-1) + 0.3 * BehaviorSimilarity - 0.1 * RiskPenalty
        new_trust = (
            0.6 * previous_trust + 
            0.3 * behavior_similarity - 
            0.1 * risk_penalty
        )
        
        # Clamp trust score between 0 and 100
        new_trust = max(0, min(100, new_trust))
        
        return new_trust, risk_penalty
    
    def _get_previous_trust(self, user_id: str) -> float:
        """Get the previous trust score for a user, or initial trust if new user"""
        timeline = self.data_store.get_user_timeline(user_id)
        
        if not timeline or len(timeline) == 0:
            return self.initial_trust
        
        return timeline[-1]['trust_score']
    
    def _calculate_risk_penalty(self, session_log: dict) -> float:
        """
        Calculate total risk penalty for a session based on suspicious behaviors
        """
        penalty = 0
        
        # Check for login outside normal hours
        login_hour = session_log['login_hour']
        normal_start, normal_end = self.thresholds['normal_login_hours']
        
        if login_hour < normal_start or login_hour >= normal_end:
            penalty += self.penalties['login_outside_hours']
        
        # Check for sensitive file access
        sensitive_files = session_log['sensitive_files']
        if sensitive_files > self.thresholds['max_sensitive_files']:
            penalty += self.penalties['sensitive_file_access'] * sensitive_files
        
        # Check for large data downloads
        data_download_mb = session_log['data_download_mb']
        if data_download_mb > self.thresholds['max_data_download_mb']:
            download_factor = data_download_mb / self.thresholds['max_data_download_mb']
            penalty += self.penalties['large_data_download'] * min(download_factor, 3.0)  # Cap at 3x
        
        return penalty
    
    def get_risk_level(self, trust_score: float) -> str:
        """Classify risk level based on trust score"""
        if trust_score > 75:
            return "low"
        elif trust_score >= 40:
            return "medium"
        else:
            return "high"
    
    def get_action_recommendation(self, trust_score: float) -> str:
        """Get recommended action based on trust score"""
        if trust_score > 75:
            return "allow"
        elif trust_score >= 40:
            return "warn"
        else:
            return "restrict"
