// 'use client';

// /**
//  * Dashboard Component - Main Admin Interface
//  * Shows overview of all users, alerts, and key metrics
//  */

// import React, { useState, useEffect } from 'react';
// import axios from 'axios';
// import UserDetails from './frontend_UserDetails';
// import './frontend_Dashboard.css';

// const API_BASE = 'http://localhost:8000';

// function Dashboard() {
//   const [users, setUsers] = useState([]);
//   const [alerts, setAlerts] = useState([]);
//   const [selectedUser, setSelectedUser] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);
//   const [threshold, setThreshold] = useState(75);

//   // Fetch all users on mount
//   useEffect(() => {
//     fetchData();
    
//     // Auto-refresh every 5 seconds
//     const interval = setInterval(fetchData, 5000);
//     return () => clearInterval(interval);
//   }, [threshold]);

//   const fetchData = async () => {
//     try {
//       setLoading(true);
      
//       // Fetch users list
//       const usersRes = await axios.get(`${API_BASE}/users`);
//       setUsers(usersRes.data.users || []);
      
//       // Fetch alerts
//       const alertsRes = await axios.get(`${API_BASE}/alerts`, {
//         params: { threshold }
//       });
//       setAlerts(alertsRes.data.alerted_users || []);
      
//       setError(null);
//     } catch (err) {
//       setError('Failed to fetch data: ' + err.message);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleResetData = async () => {
//     if (window.confirm('Clear all stored data? This cannot be undone.')) {
//       try {
//         await axios.delete(`${API_BASE}/data`);
//         setUsers([]);
//         setAlerts([]);
//         setSelectedUser(null);
//         alert('Data cleared successfully');
//       } catch (err) {
//         alert('Failed to clear data: ' + err.message);
//       }
//     }
//   };

//   const handleUserClick = (userId) => {
//     setSelectedUser(userId);
//   };

//   if (selectedUser) {
//     return <UserDetails userId={selectedUser} onBack={() => setSelectedUser(null)} />;
//   }

//   return (
//     <div className="dashboard-container">
//       <header className="dashboard-header">
//         <h1>🛡️ Insider Threat Detection System</h1>
//         <div className="header-info">
//           <span className="status-badge green">● System Active</span>
//           <span className="last-update">Updated: {new Date().toLocaleTimeString()}</span>
//         </div>
//       </header>

//       <div className="dashboard-content">
        
//         {/* CONTROLS */}
//         <div className="controls-section">
//           <div className="threshold-control">
//             <label>Alert Threshold (Trust Score): </label>
//             <input 
//               type="range" 
//               min="0" 
//               max="100" 
//               value={threshold}
//               onChange={(e) => setThreshold(Number(e.target.value))}
//               className="slider"
//             />
//             <span className="threshold-value">{threshold}</span>
//           </div>
          
//           <div className="action-buttons">
//             <button onClick={fetchData} className="btn btn-refresh">
//               🔄 Refresh
//             </button>
//             <button onClick={handleResetData} className="btn btn-danger">
//               🗑️ Clear Data
//             </button>
//           </div>
//         </div>

//         {/* ERROR MESSAGE */}
//         {error && (
//           <div className="error-banner">
//             ⚠️ {error}
//           </div>
//         )}

//         {/* LOADING STATE */}
//         {loading && <div className="loading">Loading data...</div>}

//         {/* KEY METRICS */}
//         {!loading && (
//           <>
//             <div className="metrics-grid">
//               <div className="metric-card">
//                 <div className="metric-label">Total Users</div>
//                 <div className="metric-value">{users.length}</div>
//               </div>
              
//               <div className="metric-card alert">
//                 <div className="metric-label">Alerted Users</div>
//                 <div className="metric-value">{alerts.length}</div>
//               </div>
              
//               <div className="metric-card danger">
//                 <div className="metric-label">High Risk (&lt;40)</div>
//                 <div className="metric-value">
//                   {alerts.filter(u => u.current_trust_score < 40).length}
//                 </div>
//               </div>
              
//               <div className="metric-card warning">
//                 <div className="metric-label">Medium Risk (40-75)</div>
//                 <div className="metric-value">
//                   {alerts.filter(u => u.current_trust_score >= 40 && u.current_trust_score <= 75).length}
//                 </div>
//               </div>
//             </div>

//             {/* ALERTS TABLE */}
//             {alerts.length > 0 && (
//               <div className="section alerted-users">
//                 <h2>⚠️ Alerted Users (Trust &lt; {threshold})</h2>
//                 <div className="table-container">
//                   <table className="users-table">
//                     <thead>
//                       <tr>
//                         <th>User ID</th>
//                         <th>Trust Score</th>
//                         <th>Risk Level</th>
//                         <th>Anomaly Score</th>
//                         <th>Sessions</th>
//                         <th>Action</th>
//                       </tr>
//                     </thead>
//                     <tbody>
//                       {alerts.map(user => (
//                         <tr key={user.user_id} className={`risk-${user.risk_level}`}>
//                           <td><strong>{user.user_id}</strong></td>
//                           <td>{user.current_trust_score.toFixed(2)}</td>
//                           <td>
//                             <span className={`badge badge-${user.risk_level}`}>
//                               {user.risk_level.toUpperCase()}
//                             </span>
//                           </td>
//                           <td>{user.latest_anomaly_score.toFixed(2)}</td>
//                           <td>{user.session_count}</td>
//                           <td>
//                             <button 
//                               onClick={() => handleUserClick(user.user_id)}
//                               className="btn btn-small"
//                             >
//                               View Details →
//                             </button>
//                           </td>
//                         </tr>
//                       ))}
//                     </tbody>
//                   </table>
//                 </div>
//               </div>
//             )}

//             {/* ALL USERS TABLE */}
//             {users.length > 0 && (
//               <div className="section all-users">
//                 <h2>📊 All Monitored Users</h2>
//                 <div className="table-container">
//                   <table className="users-table">
//                     <thead>
//                       <tr>
//                         <th>User ID</th>
//                         <th>Trust Score</th>
//                         <th>Sessions</th>
//                         <th>Last Activity</th>
//                         <th>Action</th>
//                       </tr>
//                     </thead>
//                     <tbody>
//                       {users.map(user => (
//                         <tr key={user.user_id}>
//                           <td><strong>{user.user_id}</strong></td>
//                           <td className={user.current_trust_score < 75 ? 'low-trust' : ''}>
//                             {user.current_trust_score.toFixed(2)}
//                           </td>
//                           <td>{user.session_count}</td>
//                           <td>{new Date(user.latest_timestamp).toLocaleString()}</td>
//                           <td>
//                             <button 
//                               onClick={() => handleUserClick(user.user_id)}
//                               className="btn btn-small"
//                             >
//                               View →
//                             </button>
//                           </td>
//                         </tr>
//                       ))}
//                     </tbody>
//                   </table>
//                 </div>
//               </div>
//             )}

//             {users.length === 0 && (
//               <div className="empty-state">
//                 <p>No user data yet. Send session logs to see data here.</p>
//               </div>
//             )}
//           </>
//         )}
//       </div>
//     </div>
//   );
// }

// export default Dashboard;

'use client';

/**
 * Dashboard Component - Main Admin Interface
 * Shows overview of all users, alerts, and key metrics
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import UserDetails from './frontend_UserDetails';
import './frontend_Dashboard.css';

const API_BASE = 'http://localhost:8000';

function Dashboard() {
  const [users, setUsers] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false); // ✅ NEW
  const [error, setError] = useState(null);
  const [threshold, setThreshold] = useState(75);

  // Scroll to top once on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Fetch all users
  useEffect(() => {
    const fetchData = async () => {
      try {
        // ✅ Only show loader on first load
        if (!hasLoaded) setLoading(true);

        const usersRes = await axios.get(`${API_BASE}/users`);
        setUsers(usersRes.data.users || []);

        const alertsRes = await axios.get(`${API_BASE}/alerts`, {
          params: { threshold }
        });
        setAlerts(alertsRes.data.alerted_users || []);

        setError(null);
        setHasLoaded(true);
      } catch (err) {
        setError('Failed to fetch data: ' + err.message);
      } finally {
        if (!hasLoaded) setLoading(false);
      }
    };

    fetchData();

    // Auto-refresh every 5 seconds (background refresh)
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [threshold, hasLoaded]);

  const handleResetData = async () => {
    if (window.confirm('Clear all stored data? This cannot be undone.')) {
      try {
        await axios.delete(`${API_BASE}/data`);
        setUsers([]);
        setAlerts([]);
        setSelectedUser(null);
        setHasLoaded(false); // reset loading state
        setLoading(true);
        alert('Data cleared successfully');
      } catch (err) {
        alert('Failed to clear data: ' + err.message);
      }
    }
  };

  const handleUserClick = (userId) => {
    setSelectedUser(userId);
  };

  if (selectedUser) {
    return <UserDetails userId={selectedUser} onBack={() => setSelectedUser(null)} />;
  }

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>🛡️ Insider Threat Detection System</h1>
        <div className="header-info">
          <span className="status-badge green">● System Active</span>
          <span className="last-update">Updated: {new Date().toLocaleTimeString()}</span>
        </div>
      </header>

      <div className="dashboard-content">

        {/* CONTROLS */}
        <div className="controls-section">
          <div className="threshold-control">
            <label>Alert Threshold (Trust Score): </label>
            <input
              type="range"
              min="0"
              max="100"
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              className="slider"
            />
            <span className="threshold-value">{threshold}</span>
          </div>

          <div className="action-buttons">
            <button onClick={() => setHasLoaded(false)} className="btn btn-refresh">
              🔄 Refresh
            </button>
            <button onClick={handleResetData} className="btn btn-danger">
              🗑️ Clear Data
            </button>
          </div>
        </div>

        {/* ERROR */}
        {error && <div className="error-banner">⚠️ {error}</div>}

        {/* LOADING (only first load) */}
        {loading && <div className="loading">Loading data...</div>}

        {!loading && (
          <>
            {/* METRICS */}
            <div className="metrics-grid">
              <div className="metric-card">
                <div className="metric-label">Total Users</div>
                <div className="metric-value">{users.length}</div>
              </div>

              <div className="metric-card alert">
                <div className="metric-label">Alerted Users</div>
                <div className="metric-value">{alerts.length}</div>
              </div>

              <div className="metric-card danger">
                <div className="metric-label">High Risk (&lt;40)</div>
                <div className="metric-value">
                  {alerts.filter(u => u.current_trust_score < 40).length}
                </div>
              </div>

              <div className="metric-card warning">
                <div className="metric-label">Medium Risk (40–75)</div>
                <div className="metric-value">
                  {alerts.filter(u => u.current_trust_score >= 40 && u.current_trust_score <= 75).length}
                </div>
              </div>
            </div>

            {/* ALERTS TABLE */}
            {alerts.length > 0 && (
              <div className="section alerted-users">
                <h2>⚠️ Alerted Users (Trust &lt; {threshold})</h2>
                <div className="table-container">
                  <table className="users-table">
                    <thead>
                      <tr>
                        <th>User ID</th>
                        <th>Trust Score</th>
                        <th>Risk Level</th>
                        <th>Anomaly Score</th>
                        <th>Sessions</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {alerts.map(user => (
                        <tr key={user.user_id} className={`risk-${user.risk_level}`}>
                          <td><strong>{user.user_id}</strong></td>
                          <td>{user.current_trust_score.toFixed(2)}</td>
                          <td>
                            <span className={`badge badge-${user.risk_level}`}>
                              {user.risk_level.toUpperCase()}
                            </span>
                          </td>
                          <td>{user.latest_anomaly_score.toFixed(2)}</td>
                          <td>{user.session_count}</td>
                          <td>
                            <button
                              onClick={() => handleUserClick(user.user_id)}
                              className="btn btn-small"
                            >
                              View Details →
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ALL USERS */}
            {users.length > 0 && (
              <div className="section all-users">
                <h2>📊 All Monitored Users</h2>
                <div className="table-container">
                  <table className="users-table">
                    <thead>
                      <tr>
                        <th>User ID</th>
                        <th>Trust Score</th>
                        <th>Sessions</th>
                        <th>Last Activity</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map(user => (
                        <tr key={user.user_id}>
                          <td><strong>{user.user_id}</strong></td>
                          <td className={user.current_trust_score < 75 ? 'low-trust' : ''}>
                            {user.current_trust_score.toFixed(2)}
                          </td>
                          <td>{user.session_count}</td>
                          <td>{new Date(user.latest_timestamp).toLocaleString()}</td>
                          <td>
                            <button
                              onClick={() => handleUserClick(user.user_id)}
                              className="btn btn-small"
                            >
                              View →
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {users.length === 0 && (
              <div className="empty-state">
                <p>No user data yet. Send session logs to see data here.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
