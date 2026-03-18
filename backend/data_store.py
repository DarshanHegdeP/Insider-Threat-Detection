"""
In-Memory Data Store with JSON Persistence
Stores user sessions, trust scores, and anomaly data
"""

import json
from datetime import datetime
from typing import List, Dict, Optional
import os

class DataStore:
    """
    In-memory data store for user sessions and trust scores
    Can optionally persist to JSON file
    """
    
    def __init__(self, persist_file: str = "threat_data.json"):
        self.persist_file = persist_file
        
        # In-memory storage
        # Structure: { "user_id": [ { session_id, log_data, trust_score, anomaly_score, timestamp }, ... ] }
        self.user_sessions: Dict[str, list] = {}
        
        # Load from file if it exists
        self.load_from_file()
    
    def store_session(self, user_id: str, session_id: str, log_data: dict, 
                     trust_score: float, anomaly_score: float, risk_penalty: float) -> None:
        """Store a session log with calculated scores"""
        
        if user_id not in self.user_sessions:
            self.user_sessions[user_id] = []
        
        timestamp = datetime.now().isoformat()
        
        session_record = {
            "session_id": session_id,
            "timestamp": timestamp,
            "log_data": log_data,
            "trust_score": trust_score,
            "anomaly_score": anomaly_score,
            "risk_penalty": risk_penalty
        }
        
        self.user_sessions[user_id].append(session_record)
        
        # Persist to file
        self.save_to_file()
    
    def get_user_timeline(self, user_id: str) -> List[Dict]:
        """Get trust score timeline for a user"""
        
        if user_id not in self.user_sessions:
            return []
        
        # Return timeline of trust scores
        timeline = []
        for session in self.user_sessions[user_id]:
            timeline.append({
                "timestamp": session['timestamp'],
                "session_id": session['session_id'],
                "trust_score": round(session['trust_score'], 2),
                "anomaly_score": round(session['anomaly_score'], 2),
                "risk_penalty": round(session['risk_penalty'], 2),
                "login_hour": session['log_data']['login_hour'],
                "files_accessed": session['log_data']['files_accessed'],
                "sensitive_files": session['log_data']['sensitive_files'],
                "data_download_mb": session['log_data']['data_download_mb'],
                "session_duration_min": session['log_data']['session_duration_min']
            })
        
        return timeline
    
    def get_users_below_threshold(self, threshold: float) -> List[Dict]:
        """Get all users with trust score below threshold (alerted users)"""
        
        alerted = []
        
        for user_id, sessions in self.user_sessions.items():
            if not sessions:
                continue
            
            latest_session = sessions[-1]
            trust_score = latest_session['trust_score']
            
            if trust_score < threshold:
                # Determine risk level
                if trust_score < 40:
                    risk_level = "high"
                elif trust_score < 75:
                    risk_level = "medium"
                else:
                    risk_level = "low"
                
                alerted.append({
                    "user_id": user_id,
                    "current_trust_score": round(trust_score, 2),
                    "risk_level": risk_level,
                    "latest_anomaly_score": round(latest_session['anomaly_score'], 2),
                    "latest_timestamp": latest_session['timestamp'],
                    "session_count": len(sessions),
                    "latest_session": {
                        "session_id": latest_session['session_id'],
                        "login_hour": latest_session['log_data']['login_hour'],
                        "files_accessed": latest_session['log_data']['files_accessed'],
                        "sensitive_files": latest_session['log_data']['sensitive_files'],
                        "data_download_mb": latest_session['log_data']['data_download_mb']
                    }
                })
        
        # Sort by trust score (lowest first = highest risk)
        alerted.sort(key=lambda x: x['current_trust_score'])
        
        return alerted
    
    def get_all_users(self) -> List[str]:
        """Get list of all user IDs"""
        return list(self.user_sessions.keys())
    
    def get_user_summary(self, user_id: str) -> Optional[Dict]:
        """Get summary statistics for a user"""
        
        if user_id not in self.user_sessions or not self.user_sessions[user_id]:
            return None
        
        sessions = self.user_sessions[user_id]
        latest = sessions[-1]
        
        # Calculate average anomaly score
        avg_anomaly = sum(s['anomaly_score'] for s in sessions) / len(sessions)
        
        return {
            "user_id": user_id,
            "session_count": len(sessions),
            "current_trust_score": round(latest['trust_score'], 2),
            "avg_anomaly_score": round(avg_anomaly, 2),
            "first_session": sessions[0]['timestamp'],
            "latest_session": latest['timestamp']
        }
    
    def save_to_file(self) -> None:
        """Save all data to JSON file"""
        try:
            with open(self.persist_file, 'w') as f:
                json.dump(self.user_sessions, f, indent=2)
        except Exception as e:
            print(f"Warning: Could not save data to {self.persist_file}: {e}")
    
    def load_from_file(self) -> None:
        """Load data from JSON file if it exists"""
        if os.path.exists(self.persist_file):
            try:
                with open(self.persist_file, 'r') as f:
                    self.user_sessions = json.load(f)
                print(f"Loaded data from {self.persist_file}")
            except Exception as e:
                print(f"Warning: Could not load data from {self.persist_file}: {e}")
    
    def clear_all(self) -> None:
        """Clear all stored data"""
        self.user_sessions = {}
        
        # Delete file if it exists
        if os.path.exists(self.persist_file):
            try:
                os.remove(self.persist_file)
            except Exception as e:
                print(f"Warning: Could not delete {self.persist_file}: {e}")
