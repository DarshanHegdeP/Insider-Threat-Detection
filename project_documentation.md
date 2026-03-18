# 🛡️ Insider Threat Detection System — Full Project Documentation

## Table of Contents
1. [Project Overview](#1-project-overview)
2. [System Architecture](#2-system-architecture)
3. [Backend — Deep Dive](#3-backend--deep-dive)
   - [backend_main.py — FastAPI Server](#31-backend_mainpy--fastapi-server)
   - [trust_engine.py — Trust Score Engine](#32-trust_enginepy--trust-score-engine)
   - [anomaly_model.py — ML Anomaly Detector](#33-anomaly_modelpy--ml-anomaly-detector)
   - [data_store.py — Data Persistence Layer](#34-data_storepy--data-persistence-layer)
4. [REST API Reference](#4-rest-api-reference)
5. [Frontend — React Components](#5-frontend--react-components)
6. [Data Flow — End to End](#6-data-flow--end-to-end)
7. [Testing](#7-testing)
8. [Running the System](#8-running-the-system)

---

## 1. Project Overview

The **Insider Threat Detection System** is a full-stack web application that monitors user session activity within an organization and flags potentially malicious or abnormal behavior in real time.

**The Core Idea:**  
Every time a user logs in and does work, their session is recorded (files accessed, data downloaded, login time, etc.). The system runs this data through two engines:
1. A **Machine Learning Anomaly Detector** (Isolation Forest) — finds statistically unusual sessions.
2. A **Trust Score Engine** — maintains a running trust score (0–100) per user that decays when anomalies are detected.

Security teams can monitor the React dashboard to see who is at risk and drill into individual user histories.

**Tech Stack:**

| Layer | Technology |
|-------|-----------|
| Backend API | Python, FastAPI, Uvicorn |
| ML Model | scikit-learn (Isolation Forest) |
| Data Store | In-memory Python dict + JSON file |
| Frontend | React (JSX), Recharts, Axios |
| Styling | Vanilla CSS |

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        React Frontend                           │
│  Dashboard.jsx ──→ UserDetails.jsx ──→ Charts.jsx               │
│        │                  │                                     │
│   (Axios REST calls)   (Axios REST calls)                       │
└───────────────────────────┬─────────────────────────────────────┘
                            │  HTTP (localhost:8000)
┌───────────────────────────▼─────────────────────────────────────┐
│                     FastAPI Backend (backend_main.py)            │
│                                                                  │
│  POST /log  ──→  AnomalyDetector.detect()                       │
│                  TrustEngine.update_trust()                      │
│                  DataStore.store_session()                       │
│                                                                  │
│  GET /trust/:id  ──→  DataStore.get_user_timeline()             │
│  GET /alerts     ──→  DataStore.get_users_below_threshold()      │
│  GET /users      ──→  DataStore.get_all_users()                  │
└──────────────────────────────────────────────────────────────────┘
         │                    │                   │
┌────────▼──────┐   ┌─────────▼──────┐  ┌────────▼──────────────┐
│ trust_engine  │   │ anomaly_model  │  │      data_store        │
│  TrustEngine  │   │ AnomalyDetect  │  │  In-memory dict        │
│               │   │ Isolation For  │  │  + threat_data.json    │
└───────────────┘   └────────────────┘  └───────────────────────-┘
```

### Module Dependency Graph

```
backend_main.py
├── trust_engine.py  (TrustEngine class)
├── anomaly_model.py (AnomalyDetector class)
└── data_store.py    (DataStore class)

anomaly_model.py
├── sklearn (IsolationForest)
└── numpy

data_store.py
├── json, os, datetime (stdlib)
└── threat_data.json  (file, auto-created)
```

---

## 3. Backend — Deep Dive

### 3.1 [backend_main.py](file:///c:/Users/darsh/OneDrive/Desktop/insider-threat-system/backend/backend_main.py) — FastAPI Server

**File:** [backend_main.py](file:///c:/Users/darsh/OneDrive/Desktop/insider-threat-system/backend/backend_main.py)  
**Size:** 228 lines  
**Purpose:** Entry point for the entire backend. Starts the web server, wires together the three engines, and exposes the REST API.

#### Initialization (lines 34–36)

```python
data_store = DataStore()
trust_engine = TrustEngine(data_store)      # needs data_store to read previous trust
anomaly_detector = AnomalyDetector(data_store)
```

All three engines are instantiated as **module-level singletons**, meaning they share state for the lifetime of the server process.

#### CORS Configuration

```python
app.add_middleware(CORSMiddleware, allow_origins=["*"], ...)
```

All origins are permitted to call the API. This is intentional for a development/demo project so the React dev server on port 3000 can call the backend on port 8000 without CORS errors.

#### Pydantic Models (Request/Response Schemas)

| Model | Purpose |
|-------|---------|
| [SessionLog](file:///c:/Users/darsh/OneDrive/Desktop/insider-threat-system/backend/backend_main.py#41-49) | Input schema for `POST /log` |
| [TrustRecord](file:///c:/Users/darsh/OneDrive/Desktop/insider-threat-system/backend/backend_main.py#50-55) | Single entry in a user's timeline |
| [UserTrustResponse](file:///c:/Users/darsh/OneDrive/Desktop/insider-threat-system/backend/backend_main.py#56-60) | Response for `GET /trust/{user_id}` |
| [AlertUser](file:///c:/Users/darsh/OneDrive/Desktop/insider-threat-system/backend/backend_main.py#61-67) | One alerted user object |
| [AlertsResponse](file:///c:/Users/darsh/OneDrive/Desktop/insider-threat-system/backend/backend_main.py#68-71) | Response for `GET /alerts` |

#### Core Session Processing Logic (`POST /log`, lines 97–129)

```python
# 1. Run anomaly detection → anomaly_score (0.0–1.0), is_anomaly (bool)
anomaly_score, is_anomaly = anomaly_detector.detect(log_dict)

# 2. Feed into trust engine → new_trust_score, how much was penalized
trust_score, risk_penalty = trust_engine.update_trust(log_dict, anomaly_score, is_anomaly)

# 3. Persist everything
data_store.store_session(...)
```

This three-step pipeline happens synchronously for every session log received.

---

### 3.2 [trust_engine.py](file:///c:/Users/darsh/OneDrive/Desktop/insider-threat-system/backend/trust_engine.py) — Trust Score Engine

**File:** [trust_engine.py](file:///c:/Users/darsh/OneDrive/Desktop/insider-threat-system/backend/trust_engine.py)  
**Size:** 118 lines  
**Class:** [TrustEngine](file:///c:/Users/darsh/OneDrive/Desktop/insider-threat-system/backend/trust_engine.py#6-118)

#### The Trust Formula

```
Trust(t) = 0.6 × Trust(t-1)  +  0.3 × BehaviorSimilarity  −  0.1 × RiskPenalty
```

| Term | Meaning |
|------|---------|
| [Trust(t-1)](file:///c:/Users/darsh/OneDrive/Desktop/insider-threat-system/backend/backend_main.py#50-55) | Previous trust score (or 80.0 for new users) |
| `BehaviorSimilarity` | `max(0, 100 − anomaly_score × 10)` — higher when session looks normal |
| `RiskPenalty` | Sum of rule-based deductions for suspicious behaviors (see below) |

The formula **persists memory**: old trust decays slowly (×0.6) — it cannot spike back up overnight. If a user is anomalous repeatedly their score trends toward 0.

#### Risk Penalties (rule-based, [_calculate_risk_penalty](file:///c:/Users/darsh/OneDrive/Desktop/insider-threat-system/backend/trust_engine.py#75-100))

| Behavior | Condition | Penalty |
|----------|-----------|---------|
| Off-hours login | `login_hour < 8` or `login_hour >= 18` | −10 |
| Excessive sensitive file access | `sensitive_files > 2` | −15 × count |
| Large data download | `data_download_mb > 500` | −20 × `min(download_factor, 3.0)` |

The total penalty is capped indirectly — download penalty has a 3× cap to prevent a single massive download from destroying a user's trust in one shot.

#### Risk Level Classification ([get_risk_level](file:///c:/Users/darsh/OneDrive/Desktop/insider-threat-system/backend/trust_engine.py#101-109))

| Trust Score | Risk Level |
|------------|-----------|
| > 75 | [low](file:///c:/Users/darsh/OneDrive/Desktop/insider-threat-system/backend/data_store.py#74-115) |
| 40 – 75 | `medium` |
| < 40 | `high` |

#### Action Recommendations ([get_action_recommendation](file:///c:/Users/darsh/OneDrive/Desktop/insider-threat-system/backend/trust_engine.py#110-118))

| Trust Score | Recommended Action |
|------------|-------------------|
| > 75 | `allow` |
| 40 – 75 | `warn` |
| < 40 | `restrict` |

---

### 3.3 [anomaly_model.py](file:///c:/Users/darsh/OneDrive/Desktop/insider-threat-system/backend/anomaly_model.py) — ML Anomaly Detector

**File:** [anomaly_model.py](file:///c:/Users/darsh/OneDrive/Desktop/insider-threat-system/backend/anomaly_model.py)  
**Size:** 133 lines  
**Class:** [AnomalyDetector](file:///c:/Users/darsh/OneDrive/Desktop/insider-threat-system/backend/anomaly_model.py#10-133)  
**Algorithm:** Isolation Forest (`sklearn.ensemble.IsolationForest`)

#### How Isolation Forest Works (Plain English)

Isolation Forest builds many random decision trees. Normal data points are hard to isolate (they live in dense clusters and require many splits). Anomalous points are easy to isolate (outliers get separated in very few splits). The algorithm uses **path length** as an anomaly signal — shorter path = more anomalous.

#### Feature Vector (5 features extracted per session)

| Feature | Source Field |
|---------|-------------|
| Login hour (0–23) | `login_hour` |
| Files accessed | `files_accessed` |
| Sensitive files accessed | `sensitive_files` |
| Data downloaded (MB) | `data_download_mb` |
| Session duration (min) | `session_duration_min` |

#### Lifecycle / Training Strategy

The model uses a **lazy bootstrap** approach to avoid issues with too little data:

```
Sessions 1–4  → Return (0.0, False) immediately. No scoring yet.
Session 5     → Fit the Isolation Forest on the 5 collected samples. Return (0.0, False).
Session 6+    → Score all subsequent sessions using the fitted model.
```

> [!NOTE]
> The model currently does **not** retrain after the initial fit. A [_retrain_model()](file:///c:/Users/darsh/OneDrive/Desktop/insider-threat-system/backend/anomaly_model.py#87-95) method exists but is not called automatically — it can be wired in for online/adaptive learning.

#### Score Conversion

```python
raw_score = model.score_samples(features)[0]   # sklearn raw: negative, closer to 0 = more anomalous
anomaly_score = max(0.0, -raw_score)            # flip sign
anomaly_score = min(1.0, anomaly_score)         # clamp to [0, 1]
is_anomalous = anomaly_score > 0.5              # threshold
```

- `anomaly_score = 0.0` → perfectly normal session
- `anomaly_score = 1.0` → maximally anomalous

#### Human-Readable Explanation ([get_anomaly_explanation](file:///c:/Users/darsh/OneDrive/Desktop/insider-threat-system/backend/anomaly_model.py#96-133))

This method takes a session and produces a string like:  
`"Anomaly score 0.87: login at 2:00 (outside 8AM-6PM), large data download (2500 MB)"`

It checks the same thresholds the trust engine uses (off-hours, high file access, large downloads, long session).

---

### 3.4 [data_store.py](file:///c:/Users/darsh/OneDrive/Desktop/insider-threat-system/backend/data_store.py) — Data Persistence Layer

**File:** [data_store.py](file:///c:/Users/darsh/OneDrive/Desktop/insider-threat-system/backend/data_store.py)  
**Size:** 169 lines  
**Class:** [DataStore](file:///c:/Users/darsh/OneDrive/Desktop/insider-threat-system/backend/data_store.py#11-169)

#### In-Memory Data Structure

```python
user_sessions: Dict[str, List[Dict]] = {
    "U101": [
        {
            "session_id": "S1001",
            "timestamp": "2025-03-19T00:10:00.000",
            "log_data": { ...original session fields... },
            "trust_score": 78.0,
            "anomaly_score": 0.12,
            "risk_penalty": 0.0
        },
        ...  # more sessions, chronological order
    ],
    "U102": [ ... ]
}
```

Each user maps to a **list of session records in chronological order**. The latest session is always `sessions[-1]`.

#### JSON Persistence

Every time [store_session()](file:///c:/Users/darsh/OneDrive/Desktop/insider-threat-system/backend/data_store.py#27-49) is called, the entire `user_sessions` dict is serialized to [threat_data.json](file:///c:/Users/darsh/OneDrive/Desktop/insider-threat-system/backend/threat_data.json) (in the backend directory). On server startup, [load_from_file()](file:///c:/Users/darsh/OneDrive/Desktop/insider-threat-system/backend/data_store.py#149-158) rehydrates the dict from this file — so data survives server restarts.

#### Key Methods

| Method | What it Does |
|--------|-------------|
| [store_session()](file:///c:/Users/darsh/OneDrive/Desktop/insider-threat-system/backend/data_store.py#27-49) | Appends a new session record + auto-saves to JSON |
| [get_user_timeline()](file:///c:/Users/darsh/OneDrive/Desktop/insider-threat-system/backend/data_store.py#50-73) | Returns flattened list of score/behavior records for one user |
| [get_users_below_threshold(threshold)](file:///c:/Users/darsh/OneDrive/Desktop/insider-threat-system/backend/data_store.py#74-115) | Returns all users whose **latest** trust score is below threshold, sorted by score ascending (worst first) |
| [get_all_users()](file:///c:/Users/darsh/OneDrive/Desktop/insider-threat-system/backend/data_store.py#116-119) | Returns list of all known user IDs |
| [get_user_summary()](file:///c:/Users/darsh/OneDrive/Desktop/insider-threat-system/backend/data_store.py#120-140) | Returns stats: session count, current trust, avg anomaly |
| [save_to_file()](file:///c:/Users/darsh/OneDrive/Desktop/insider-threat-system/backend/data_store.py#141-148) | Writes all data to [threat_data.json](file:///c:/Users/darsh/OneDrive/Desktop/insider-threat-system/backend/threat_data.json) |
| [load_from_file()](file:///c:/Users/darsh/OneDrive/Desktop/insider-threat-system/backend/data_store.py#149-158) | Reads [threat_data.json](file:///c:/Users/darsh/OneDrive/Desktop/insider-threat-system/backend/threat_data.json) on startup |
| [clear_all()](file:///c:/Users/darsh/OneDrive/Desktop/insider-threat-system/backend/data_store.py#159-169) | Wipes in-memory dict and deletes the JSON file |

---

## 4. REST API Reference

**Base URL:** `http://localhost:8000`  
**Auto-generated docs:** `http://localhost:8000/docs` (Swagger UI)

---

### `GET /health`
Health check.

**Response:**
```json
{ "status": "ok", "message": "Insider Threat Detection System is running" }
```

---

### `POST /log`
Submit a new user session for analysis. This is the **main ingestion endpoint**.

**Request Body:**
```json
{
  "user_id": "U101",
  "session_id": "S1001",
  "login_hour": 10,
  "files_accessed": 15,
  "sensitive_files": 0,
  "data_download_mb": 120.0,
  "session_duration_min": 40
}
```

| Field | Type | Description |
|-------|------|-------------|
| `user_id` | string | Unique employee identifier |
| `session_id` | string | Unique session identifier |
| `login_hour` | int | Hour of login (0–23, 24h clock) |
| `files_accessed` | int | Total files accessed this session |
| `sensitive_files` | int | Number of sensitive/classified files accessed |
| `data_download_mb` | float | Total data downloaded in megabytes |
| `session_duration_min` | int | Session length in minutes |

**Response:**
```json
{
  "status": "success",
  "user_id": "U101",
  "session_id": "S1001",
  "trust_score": 78.0,
  "anomaly_score": 0.12,
  "risk_penalty": 0.0,
  "is_anomalous": false,
  "message": "Session logged and analyzed"
}
```

---

### `GET /trust/{user_id}`
Retrieve the full trust score timeline for a user.

**Example:** `GET /trust/U101`

**Response:**
```json
{
  "user_id": "U101",
  "current_trust_score": 67.32,
  "timeline": [
    {
      "timestamp": "2025-03-19T00:10:00",
      "session_id": "S1001",
      "trust_score": 80.0,
      "anomaly_score": 0.0,
      "risk_penalty": 0.0,
      "login_hour": 10,
      "files_accessed": 15,
      "sensitive_files": 0,
      "data_download_mb": 120.0,
      "session_duration_min": 40
    }
  ]
}
```

Returns `404` if user has no recorded sessions.

---

### `GET /alerts`
Get all users whose trust score is below an alert threshold.

**Query Params:** [threshold](file:///c:/Users/darsh/OneDrive/Desktop/insider-threat-system/backend/data_store.py#74-115) (float, default `75.0`)

**Example:** `GET /alerts?threshold=75`

**Response:**
```json
{
  "total_users": 5,
  "alerted_users": [
    {
      "user_id": "U101",
      "current_trust_score": 22.5,
      "risk_level": "high",
      "latest_anomaly_score": 0.91,
      "latest_timestamp": "2025-03-19T00:15:00",
      "session_count": 3,
      "latest_session": {
        "session_id": "S1003",
        "login_hour": 2,
        "files_accessed": 120,
        "sensitive_files": 6,
        "data_download_mb": 2500.0
      }
    }
  ],
  "threshold": 75.0,
  "high_risk_count": 1,
  "warning_count": 2
}
```

Users are sorted **lowest trust score first** (highest risk first).

---

### `GET /users`
Get a summary of all monitored users.

**Response:**
```json
{
  "total_users": 3,
  "users": [
    {
      "user_id": "U101",
      "current_trust_score": 22.5,
      "session_count": 3,
      "latest_timestamp": "2025-03-19T00:15:00"
    }
  ]
}
```

Sorted by trust score ascending (riskiest first).

---

### `DELETE /data`
Wipe all stored data (for testing/demo). Clears memory and deletes [threat_data.json](file:///c:/Users/darsh/OneDrive/Desktop/insider-threat-system/backend/threat_data.json).

**Response:** `{ "status": "success", "message": "All data cleared" }`

---

## 5. Frontend — React Components

**Location:** `frontend/src/`  
**Framework:** React (Create React App)  
**Key libraries:** `axios` (HTTP), `recharts` (charts), `date-fns` (date formatting)

### Component Tree

```
frontend_App.jsx
└── frontend_Dashboard.jsx    (main view)
    └── frontend_UserDetails.jsx  (user drill-down)
        └── frontend_Charts.jsx   (chart panels)
```

---

### `frontend_Dashboard.jsx` — Admin Dashboard

The home screen. Polls the backend every **5 seconds** using `setInterval`.

**State:**
| State | Description |
|-------|-------------|
| `users` | All users from `/users` endpoint |
| `alerts` | Alerted users from `/alerts` endpoint |
| `selectedUser` | If set, renders `UserDetails` instead |
| `threshold` | Adjustable alert threshold (default 75) |
| `hasLoaded` | Prevents showing spinner on background refreshes |

**UI Sections:**
- **Header** — System title + "System Active" badge + live timestamp
- **Controls** — Threshold slider (0–100) + Refresh + Clear Data buttons
- **Metrics Grid** — 4 KPI cards: Total Users / Alerted / High Risk / Medium Risk
- **Alerts Table** — Users below threshold with User ID, Trust Score, Risk Badge, Anomaly Score, Sessions, "View Details" button
- **All Users Table** — Every monitored user with drill-down button

**Smart loading:** The `hasLoaded` flag prevents the full loading spinner from flashing on every background re-fetch. Only the initial load shows a spinner.

---

### `frontend_UserDetails.jsx` — User Drill-Down Page

Detailed analysis page for one user. Fetches `GET /trust/{user_id}`.

**UI Sections:**
- **User Status Card** — Large trust score display with ring/gauge, risk level badge
- **Statistics Cards** — Total sessions, avg anomaly, total data downloaded, total sensitive files
- **Charts Panel** — Renders `frontend_Charts.jsx`
- **Session Timeline** — Reverse-chronological table of all sessions with all raw metrics

---

### `frontend_Charts.jsx` — Recharts Visualizations

Renders 5 interactive charts for a user's timeline data:

| Chart | Type | Shows |
|-------|------|-------|
| Trust Score Timeline | Line | Trust score across sessions |
| Anomaly Score Timeline | Line | Anomaly score across sessions |
| Trust vs Anomaly | Dual Line | Overlay comparison |
| Risk Penalty Distribution | Bar | Penalty per session |
| Behavioral Metrics | Dual Bar | Files accessed + data downloaded |

All charts use `ResponsiveContainer` so they resize with the browser window and include custom tooltips on hover.

---

### `frontend_App.jsx` — Root Component

Simple wrapper that renders `<Dashboard />`. Entry point loaded by `frontend_index.jsx`.

---

## 6. Data Flow — End to End

### Session Ingestion Flow

```
1. External source (SIEM, test script, or manual API call)
        │
        ▼ POST /log  { user_id, session_id, login_hour, ... }
2. backend_main.py: log_session()
        │
        ├──► anomaly_model.py: AnomalyDetector.detect()
        │         ├── Extract 5 features as numpy array
        │         ├── If < 5 sessions → return (0.0, False)
        │         ├── If == 5 sessions → fit model → return (0.0, False)
        │         └── else → score_samples() → anomaly_score [0–1]
        │
        ├──► trust_engine.py: TrustEngine.update_trust()
        │         ├── Fetch previous trust score from data_store
        │         ├── BehaviorSimilarity = max(0, 100 - anomaly_score * 10)
        │         ├── RiskPenalty = sum of rule violations
        │         └── new_trust = 0.6*prev + 0.3*behavior - 0.1*penalty
        │
        └──► data_store.py: DataStore.store_session()
                  ├── Append to in-memory dict
                  └── Save entire dict to threat_data.json
        │
        ▼  JSON Response: { trust_score, anomaly_score, risk_penalty, is_anomalous }
```

### Dashboard Polling Flow

```
React Dashboard (every 5 seconds)
        │
        ├── GET /users  →  DataStore.get_all_users() + latest session per user
        └── GET /alerts?threshold=75  →  DataStore.get_users_below_threshold(75)
                                          sorted by trust score ascending
```

---

## 7. Testing

**File:** [test_system.py](file:///c:/Users/darsh/OneDrive/Desktop/insider-threat-system/backend/test_system.py)

A standalone Python script (using `requests`) that hits the live backend with three specifically crafted sessions to demonstrate the full risk spectrum:

| Test | User | Scenario | Expected Risk |
|------|------|----------|--------------|
| Normal Session | U101/S1001 | Login 10am, 15 files, 120MB | Low — normal work |
| Drift Session | U101/S1002 | Login 7pm, 35 files, 250MB | Medium — slightly off-hours |
| Malicious Session | U101/S1003 | Login 2am, 120 files, 6 sensitive, 2500MB | High — clear threat |

After the 3 sessions, it also tests:
- `GET /trust/U101` — user timeline
- `GET /alerts?threshold=75` — alert query
- `GET /users` — all users list

**To run:**
```
python test_system.py
```
(The backend must already be running.)

---

## 8. Running the System

### Prerequisites

```
Python 3.9+   → pip install -r requirements.txt
Node.js 16+   → npm install (inside frontend/)
```

### Step 1 — Start Backend

```powershell
cd backend
pip install -r requirements.txt
python backend_main.py
# → Running on http://localhost:8000
# → Docs at http://localhost:8000/docs
```

### Step 2 — Start Frontend

```powershell
cd frontend
npm install
npm start
# → Running on http://localhost:3000
```

### Step 3 — Ingest Test Data

```powershell
cd backend
python test_system.py
```

### Step 4 — View Dashboard

Open **http://localhost:3000** in your browser.

### Dependencies Summary

**Python (`requirements.txt`):**
```
fastapi==0.104.1
uvicorn==0.24.0
scikit-learn==1.3.2
numpy==1.26.2
pydantic==1.10.13
```

**Node (`package.json`):**
```
react, react-dom, axios, recharts, date-fns
```

---

> **Data persistence:** Session data is automatically saved to `backend/threat_data.json` and reloaded on server restart. Use `DELETE /data` or `🗑️ Clear Data` on the dashboard to reset everything.
