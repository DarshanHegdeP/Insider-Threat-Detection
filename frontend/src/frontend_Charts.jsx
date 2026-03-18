/**
 * Charts Component - Data Visualization
 * Displays trust score and anomaly trends using Recharts
 */

import React from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import './frontend_Charts.css';

function Charts({ timeline, userId }) {
  if (!timeline || timeline.length === 0) {
    return <div className="no-data">No chart data available</div>;
  }

  // Prepare data for charts - limit to last 20 sessions for readability
  const chartData = timeline.slice(-20).map((session, idx) => ({
    sessionNum: idx + 1,
    trustScore: parseFloat(session.trust_score.toFixed(2)),
    anomalyScore: parseFloat((session.anomaly_score * 100).toFixed(2)),  // Scale to 0-100
    riskPenalty: parseFloat(session.risk_penalty.toFixed(2)),
    loginHour: session.login_hour,
    filesAccessed: session.files_accessed
  }));

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip">
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: {entry.value.toFixed(2)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="charts-wrapper">
      
      {/* TRUST SCORE TIMELINE */}
      <div className="chart-container">
        <h3>📈 Trust Score Timeline</h3>
        <p className="chart-description">Trust score progression over sessions. Higher is better (0-100 scale).</p>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ddd" />
            <XAxis 
              dataKey="sessionNum" 
              label={{ value: 'Session Number', position: 'insideBottomRight', offset: -5 }}
            />
            <YAxis 
              domain={[0, 100]}
              label={{ value: 'Trust Score', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="trustScore" 
              stroke="#10b981" 
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
              name="Trust Score"
              isAnimationActive={true}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* ANOMALY SCORE OVER TIME */}
      <div className="chart-container">
        <h3>🚨 Anomaly Score Timeline</h3>
        <p className="chart-description">Behavioral anomaly detection results. Higher values indicate more anomalous behavior (0-100 scale).</p>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ddd" />
            <XAxis 
              dataKey="sessionNum"
              label={{ value: 'Session Number', position: 'insideBottomRight', offset: -5 }}
            />
            <YAxis 
              domain={[0, 100]}
              label={{ value: 'Anomaly Score (%)', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="anomalyScore" 
              stroke="#ef4444" 
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
              name="Anomaly Score"
              isAnimationActive={true}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* TRUST vs ANOMALY COMPARISON */}
      <div className="chart-container">
        <h3>🔄 Trust Score vs Anomaly Score</h3>
        <p className="chart-description">Correlation between trust score and anomaly detection. They should be inverse.</p>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ddd" />
            <XAxis 
              dataKey="sessionNum"
              label={{ value: 'Session Number', position: 'insideBottomRight', offset: -5 }}
            />
            <YAxis 
              domain={[0, 100]}
              label={{ value: 'Score Value', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="trustScore" 
              stroke="#10b981" 
              name="Trust Score"
              isAnimationActive={true}
            />
            <Line 
              type="monotone" 
              dataKey="anomalyScore" 
              stroke="#ef4444" 
              name="Anomaly Score"
              isAnimationActive={true}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* RISK PENALTY DISTRIBUTION */}
      <div className="chart-container">
        <h3>⚠️ Risk Penalty Over Time</h3>
        <p className="chart-description">Accumulated risk penalties applied to trust score each session.</p>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ddd" />
            <XAxis 
              dataKey="sessionNum"
              label={{ value: 'Session Number', position: 'insideBottomRight', offset: -5 }}
            />
            <YAxis 
              label={{ value: 'Risk Penalty', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar 
              dataKey="riskPenalty" 
              fill="#f59e0b" 
              name="Risk Penalty"
              radius={[8, 8, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* BEHAVIOR METRICS */}
      <div className="chart-container">
        <h3>📊 Behavioral Metrics</h3>
        <p className="chart-description">Files accessed and login hour patterns across sessions.</p>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ddd" />
            <XAxis 
              dataKey="sessionNum"
              label={{ value: 'Session Number', position: 'insideBottomRight', offset: -5 }}
            />
            <YAxis 
              label={{ value: 'Count / Hour', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar 
              dataKey="filesAccessed" 
              fill="#3b82f6" 
              name="Files Accessed"
              radius={[8, 8, 0, 0]}
            />
            <Bar 
              dataKey="loginHour" 
              fill="#8b5cf6" 
              name="Login Hour (24h format)"
              radius={[8, 8, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

    </div>
  );
}

export default Charts;
