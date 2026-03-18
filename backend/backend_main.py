"""
FastAPI Backend for Adaptive Trust-Aware Insider Threat Detection System
Main server with API endpoints for session logging, trust queries, and alerts
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional
from datetime import datetime
import json

from trust_engine import TrustEngine
from anomaly_model import AnomalyDetector
from data_store import DataStore

# ============================================================================
# INITIALIZE FASTAPI APP
# ============================================================================
app = FastAPI(title="Insider Threat Detection System", version="1.0.0")

# Enable CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ============================================================================
# INITIALIZE ENGINES
# ============================================================================
data_store = DataStore()
trust_engine = TrustEngine(data_store)
anomaly_detector = AnomalyDetector(data_store)

# ============================================================================
# PYDANTIC MODELS
# ============================================================================
class SessionLog(BaseModel):
    user_id: str
    session_id: str
    login_hour: int
    files_accessed: int
    sensitive_files: int
    data_download_mb: float
    session_duration_min: int

class TrustRecord(BaseModel):
    timestamp: str
    trust_score: float
    anomaly_score: float
    risk_penalty: float

class UserTrustResponse(BaseModel):
    user_id: str
    current_trust_score: float
    timeline: List[TrustRecord]

class AlertUser(BaseModel):
    user_id: str
    current_trust_score: float
    risk_level: str
    latest_anomaly_score: float
    latest_session: Optional[Dict] = None

class AlertsResponse(BaseModel):
    total_users: int
    alerted_users: List[AlertUser]

# ============================================================================
# API ENDPOINTS
# ============================================================================

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "ok", "message": "Insider Threat Detection System is running"}

@app.post("/log")
async def log_session(log: SessionLog):
    """
    Accept a user session log and update trust score + anomaly detection
    
    Request body:
    {
        "user_id": "U101",
        "session_id": "S1001",
        "login_hour": 10,
        "files_accessed": 15,
        "sensitive_files": 0,
        "data_download_mb": 120.0,
        "session_duration_min": 40
    }
    """
    try:
        # Convert log to dict for processing
        log_dict = log.dict()
        
        # Run anomaly detection
        anomaly_score, is_anomaly = anomaly_detector.detect(log_dict)
        
        # Calculate trust score
        trust_score, risk_penalty = trust_engine.update_trust(log_dict, anomaly_score, is_anomaly)
        
        # Store the session log with results
        data_store.store_session(
            user_id=log.user_id,
            session_id=log.session_id,
            log_data=log_dict,
            trust_score=trust_score,
            anomaly_score=anomaly_score,
            risk_penalty=risk_penalty
        )
        
        return {
           "status": "success",
    "user_id": log.user_id,
    "session_id": log.session_id,
    "trust_score": float(round(trust_score, 2)),
    "anomaly_score": float(round(anomaly_score, 2)),
    "risk_penalty": float(round(risk_penalty, 2)),
    "is_anomalous": bool(is_anomaly),
    "message": "Session logged and analyzed"
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing log: {str(e)}")

@app.get("/trust/{user_id}")
async def get_user_trust(user_id: str):
    """
    Get trust score timeline for a specific user
    
    Response includes current trust score and historical timeline
    """
    try:
        timeline = data_store.get_user_timeline(user_id)
        
        if not timeline:
            raise HTTPException(status_code=404, detail=f"No data found for user {user_id}")
        
        # Get current trust score (last entry)
        current_trust = timeline[-1]['trust_score'] if timeline else 80.0
        
        return {
            "user_id": user_id,
            "current_trust_score": round(current_trust, 2),
            "timeline": timeline
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving trust data: {str(e)}")

@app.get("/alerts")
async def get_alerts(threshold: float = 75.0):
    """
    Get all users with trust score below threshold
    
    Query param: threshold (default 75.0)
    Returns list of alerted users sorted by risk level
    """
    try:
        alerted_users = data_store.get_users_below_threshold(threshold)
        
        return {
            "total_users": len(data_store.get_all_users()),
            "alerted_users": alerted_users,
            "threshold": threshold,
            "high_risk_count": len([u for u in alerted_users if u['current_trust_score'] < 40]),
            "warning_count": len([u for u in alerted_users if 40 <= u['current_trust_score'] <= 75])
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving alerts: {str(e)}")

@app.get("/users")
async def list_all_users():
    """Get list of all monitored users with summary stats"""
    try:
        users = data_store.get_all_users()
        
        user_summaries = []
        for user_id in users:
            timeline = data_store.get_user_timeline(user_id)
            if timeline:
                latest = timeline[-1]
                user_summaries.append({
                    "user_id": user_id,
                    "current_trust_score": round(latest['trust_score'], 2),
                    "session_count": len(timeline),
                    "latest_timestamp": latest['timestamp']
                })
        
        return {
            "total_users": len(user_summaries),
            "users": sorted(user_summaries, key=lambda x: x['current_trust_score'])
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving user list: {str(e)}")

@app.delete("/data")
async def reset_data():
    """Reset all stored data (for testing/demo purposes)"""
    try:
        data_store.clear_all()
        return {"status": "success", "message": "All data cleared"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error clearing data: {str(e)}")

# ============================================================================
# MAIN EXECUTION
# ============================================================================
if __name__ == "__main__":
    import uvicorn
    print("=" * 80)
    print("INSIDER THREAT DETECTION SYSTEM - BACKEND")
    print("=" * 80)
    print("\nStarting FastAPI server on http://localhost:8000")
    print("API Docs available at http://localhost:8000/docs")
    print("=" * 80)
    
    uvicorn.run(app, host="0.0.0.0", port=8000)
