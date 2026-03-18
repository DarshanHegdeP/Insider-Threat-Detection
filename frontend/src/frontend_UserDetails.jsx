// 'use client';

// /**
//  * UserDetails Component - Individual User Analysis
//  * Shows trust score timeline and anomaly trends for a specific user
//  */

// import React, { useState, useEffect } from 'react';
// import axios from 'axios';
// import Charts from './frontend_Charts';
// import './frontend_UserDetails.css';

// const API_BASE = 'http://localhost:8000';

// function UserDetails({ userId, onBack }) {
//   const [userData, setUserData] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);

//   useEffect(() => {
//     const fetchUserData = async () => {
//       try {
//         setLoading(true);
//         const response = await axios.get(`${API_BASE}/trust/${userId}`);
//         setUserData(response.data);
//         setError(null);
//       } catch (err) {
//         setError('Failed to fetch user data: ' + err.message);
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchUserData();
    
//     // Auto-refresh every 5 seconds
//     const interval = setInterval(fetchUserData, 5000);
//     return () => clearInterval(interval);
//   }, [userId]);

//   if (loading) return <div className="loading">Loading user data...</div>;
//   if (error) return <div className="error-banner">⚠️ {error}</div>;
//   if (!userData) return <div className="error-banner">No data found</div>;

//   const timeline = userData.timeline || [];
//   const currentTrust = userData.current_trust_score;
  
//   // Calculate risk level
//   const getRiskLevel = (trust) => {
//     if (trust > 75) return 'low';
//     if (trust >= 40) return 'medium';
//     return 'high';
//   };
  
//   const riskLevel = getRiskLevel(currentTrust);

//   // Calculate statistics
//   const stats = {
//     sessionCount: timeline.length,
//     avgAnomaly: timeline.length > 0 
//       ? (timeline.reduce((sum, s) => sum + s.anomaly_score, 0) / timeline.length).toFixed(2)
//       : 0,
//     maxAnomaly: timeline.length > 0
//       ? Math.max(...timeline.map(s => s.anomaly_score)).toFixed(2)
//       : 0,
//     totalPenalty: timeline.length > 0
//       ? timeline.reduce((sum, s) => sum + s.risk_penalty, 0).toFixed(2)
//       : 0
//   };

//   return (
//     <div className="user-details-container">
//       <header className="details-header">
//         <button onClick={onBack} className="btn-back">← Back to Dashboard</button>
//         <h1>User Profile: {userId}</h1>
//       </header>

//       <div className="details-content">
        
//         {/* USER STATUS CARD */}
//         <div className={`status-card status-${riskLevel}`}>
//           <div className="status-main">
//             <div className="status-item">
//               <span className="label">Current Trust Score</span>
//               <span className="value">{currentTrust.toFixed(2)}</span>
//             </div>
//             <div className="status-item">
//               <span className="label">Risk Level</span>
//               <span className={`badge badge-${riskLevel}`}>
//                 {riskLevel.toUpperCase()}
//               </span>
//             </div>
//           </div>
//         </div>

//         {/* STATISTICS GRID */}
//         <div className="stats-grid">
//           <div className="stat-box">
//             <div className="stat-label">Total Sessions</div>
//             <div className="stat-value">{stats.sessionCount}</div>
//           </div>
//           <div className="stat-box">
//             <div className="stat-label">Avg Anomaly Score</div>
//             <div className="stat-value">{stats.avgAnomaly}</div>
//           </div>
//           <div className="stat-box">
//             <div className="stat-label">Max Anomaly Score</div>
//             <div className="stat-value">{stats.maxAnomaly}</div>
//           </div>
//           <div className="stat-box">
//             <div className="stat-label">Total Risk Penalty</div>
//             <div className="stat-value">{stats.totalPenalty}</div>
//           </div>
//         </div>

//         {/* CHARTS */}
//         <div className="charts-section">
//           <Charts timeline={timeline} userId={userId} />
//         </div>

//         {/* SESSION TIMELINE */}
//         {timeline.length > 0 && (
//           <div className="section session-timeline">
//             <h2>📋 Session Timeline (Most Recent First)</h2>
//             <div className="timeline-container">
//               {[...timeline].reverse().map((session, idx) => (
//                 <div key={idx} className="timeline-item">
//                   <div className="timeline-time">
//                     {new Date(session.timestamp).toLocaleString()}
//                   </div>
//                   <div className="timeline-content">
//                     <div className="timeline-row">
//                       <span className="label">Session ID:</span>
//                       <span className="value">{session.session_id}</span>
//                     </div>
//                     <div className="timeline-row">
//                       <span className="label">Trust Score:</span>
//                       <span className="value trust">{session.trust_score.toFixed(2)}</span>
//                     </div>
//                     <div className="timeline-row">
//                       <span className="label">Anomaly Score:</span>
//                       <span className="value anomaly">{session.anomaly_score.toFixed(2)}</span>
//                     </div>
//                     <div className="timeline-row">
//                       <span className="label">Risk Penalty:</span>
//                       <span className="value penalty">{session.risk_penalty.toFixed(2)}</span>
//                     </div>
//                     <div className="session-details">
//                       <span>🕐 Login: {session.login_hour}:00</span>
//                       <span>📁 Files: {session.files_accessed}</span>
//                       <span>🔒 Sensitive: {session.sensitive_files}</span>
//                       <span>⬇️ Download: {session.data_download_mb.toFixed(0)}MB</span>
//                       <span>⏱️ Duration: {session.session_duration_min}min</span>
//                     </div>
//                   </div>
//                 </div>
//               ))}
//             </div>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }

// export default UserDetails;

'use client';

/**
 * UserDetails Component - Individual User Analysis
 * Shows trust score timeline and anomaly trends for a specific user
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Charts from './frontend_Charts';
import './frontend_UserDetails.css';

const API_BASE = 'http://localhost:8000';

function UserDetails({ userId, onBack }) {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false); // ✅ NEW
  const [error, setError] = useState(null);

  // Scroll to top only once when component mounts
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // ✅ Show loader ONLY on first load
        if (!hasLoaded) setLoading(true);

        const response = await axios.get(`${API_BASE}/trust/${userId}`);
        setUserData(response.data);
        setError(null);
        setHasLoaded(true); // ✅ Mark initial load complete
      } catch (err) {
        setError('Failed to fetch user data: ' + err.message);
      } finally {
        if (!hasLoaded) setLoading(false);
      }
    };

    fetchUserData();

    // Auto-refresh every 5 seconds (background refresh, no UI reset)
    const interval = setInterval(fetchUserData, 5000);
    return () => clearInterval(interval);
  }, [userId, hasLoaded]);

  if (loading) return <div className="loading">Loading user data...</div>;
  if (error) return <div className="error-banner">⚠️ {error}</div>;
  if (!userData) return <div className="error-banner">No data found</div>;

  const timeline = userData.timeline || [];
  const currentTrust = userData.current_trust_score;

  // Calculate risk level
  const getRiskLevel = (trust) => {
    if (trust > 75) return 'low';
    if (trust >= 40) return 'medium';
    return 'high';
  };

  const riskLevel = getRiskLevel(currentTrust);

  // Calculate statistics
  const stats = {
    sessionCount: timeline.length,
    avgAnomaly: timeline.length > 0
      ? (timeline.reduce((sum, s) => sum + s.anomaly_score, 0) / timeline.length).toFixed(2)
      : 0,
    maxAnomaly: timeline.length > 0
      ? Math.max(...timeline.map(s => s.anomaly_score)).toFixed(2)
      : 0,
    totalPenalty: timeline.length > 0
      ? timeline.reduce((sum, s) => sum + s.risk_penalty, 0).toFixed(2)
      : 0
  };

  return (
    <div className="user-details-container">
      <header className="details-header">
        <button onClick={onBack} className="btn-back">← Back to Dashboard</button>
        <h1>User Profile: {userId}</h1>
      </header>

      <div className="details-content">

        {/* USER STATUS CARD */}
        <div className={`status-card status-${riskLevel}`}>
          <div className="status-main">
            <div className="status-item">
              <span className="label">Current Trust Score</span>
              <span className="value">{currentTrust.toFixed(2)}</span>
            </div>
            <div className="status-item">
              <span className="label">Risk Level</span>
              <span className={`badge badge-${riskLevel}`}>
                {riskLevel.toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        {/* STATISTICS GRID */}
        <div className="stats-grid">
          <div className="stat-box">
            <div className="stat-label">Total Sessions</div>
            <div className="stat-value">{stats.sessionCount}</div>
          </div>
          <div className="stat-box">
            <div className="stat-label">Avg Anomaly Score</div>
            <div className="stat-value">{stats.avgAnomaly}</div>
          </div>
          <div className="stat-box">
            <div className="stat-label">Max Anomaly Score</div>
            <div className="stat-value">{stats.maxAnomaly}</div>
          </div>
          <div className="stat-box">
            <div className="stat-label">Total Risk Penalty</div>
            <div className="stat-value">{stats.totalPenalty}</div>
          </div>
        </div>

        {/* CHARTS */}
        <div className="charts-section">
          <Charts timeline={timeline} userId={userId} />
        </div>

        {/* SESSION TIMELINE */}
        {timeline.length > 0 && (
          <div className="section session-timeline">
            <h2>📋 Session Timeline (Most Recent First)</h2>
            <div className="timeline-container">
              {[...timeline].reverse().map((session, idx) => (
                <div key={idx} className="timeline-item">
                  <div className="timeline-time">
                    {new Date(session.timestamp).toLocaleString()}
                  </div>
                  <div className="timeline-content">
                    <div className="timeline-row">
                      <span className="label">Session ID:</span>
                      <span className="value">{session.session_id}</span>
                    </div>
                    <div className="timeline-row">
                      <span className="label">Trust Score:</span>
                      <span className="value trust">{session.trust_score.toFixed(2)}</span>
                    </div>
                    <div className="timeline-row">
                      <span className="label">Anomaly Score:</span>
                      <span className="value anomaly">{session.anomaly_score.toFixed(2)}</span>
                    </div>
                    <div className="timeline-row">
                      <span className="label">Risk Penalty:</span>
                      <span className="value penalty">{session.risk_penalty.toFixed(2)}</span>
                    </div>
                    <div className="session-details">
                      <span>🕐 Login: {session.login_hour}:00</span>
                      <span>📁 Files: {session.files_accessed}</span>
                      <span>🔒 Sensitive: {session.sensitive_files}</span>
                      <span>⬇️ Download: {session.data_download_mb.toFixed(0)}MB</span>
                      <span>⏱️ Duration: {session.session_duration_min}min</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default UserDetails;
