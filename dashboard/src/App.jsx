import { useState, useEffect, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { Activity, Clock, Globe, ArrowUpRight } from 'lucide-react';

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#f43f5e', '#6366f1', '#14b8a6'];

function App() {
  const [visits, setVisits] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchVisits() {
      try {
        const response = await fetch('http://localhost:3000/api/visits');
        if (!response.ok) throw new Error('Failed to fetch data');
        const data = await response.json();
        setVisits(data.visits || []);
        setTotalCount(data.total || 0);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchVisits();
  }, []);

  const chartData = useMemo(() => {
    if (!visits || !visits.length) return [];
    
    const categoryCounts = visits.reduce((acc, visit) => {
      acc[visit.category] = (acc[visit.category] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(categoryCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [visits]);

  const categoryColorMap = useMemo(() => {
    const map = {};
    chartData.forEach((item, index) => {
      map[item.name] = COLORS[index % COLORS.length];
    });
    return map;
  }, [chartData]);

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner"></div>
        <p>Loading your information diet...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-state">
        <Activity size={48} />
        <p>Error: {error}</p>
        <p style={{fontSize: 12}}>Make sure the Go backend is running on port 3000.</p>
      </div>
    );
  }

  if (!visits || visits.length === 0) {
    return (
      <div className="empty-state">
        <Globe size={48} />
        <p>No visits recorded yet. Browse some articles with your extension!</p>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <header className="header">
        <Activity size={32} color="#3b82f6" />
        <h1>Nexus Diet</h1>
      </header>

      <div className="stats-grid">
        <div className="glass-panel stat-card">
          <div className="stat-label"><Globe size={16} color="#9ca3af" /> Total Pages Read</div>
          <div className="stat-value">{totalCount}</div>
        </div>
        <div className="glass-panel stat-card">
          <div className="stat-label"><Clock size={16} color="#9ca3af" /> Latest Visit</div>
          <div className="stat-value" style={{fontSize: 18, marginTop: 'auto', marginBottom: 4}}>
            {visits.length > 0 ? new Date(visits[0].timestamp).toLocaleDateString(undefined, {
              month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
            }) : 'No data'}
          </div>
        </div>
      </div>

      <div className="main-content">
        <div className="glass-panel chart-container">
          <div className="chart-title">Information Diet Breakdown (Recent 50)</div>
          
          <div className="legend-list">
            {chartData.map((entry, index) => {
              const percentage = ((entry.value / visits.length) * 100).toFixed(1);
              return (
                <div key={index} className="legend-item">
                  <div className="legend-color" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                  <span className="legend-name">{entry.name}</span>
                  <span className="legend-percent">{percentage}%</span>
                </div>
              );
            })}
          </div>

          <div style={{ flex: 1, height: 450, position: 'relative' }}>
            <ResponsiveContainer width="100%" height={450}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={100}
                  outerRadius={150}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#1f2937', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#f3f4f6' }}
                  itemStyle={{ color: '#f3f4f6' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-panel table-container">
          <div className="chart-title">Recent Pages</div>
          <table className="styled-table">
            <thead>
              <tr>
                <th>Page</th>
                <th>Category</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {visits.slice(0, 50).map((visit, index) => (
                <tr key={index}>
                  <td>
                    <span className="article-title">{visit.title || 'Untitled Page'}</span>
                    <a href={visit.url} target="_blank" rel="noreferrer" className="article-url">
                      {visit.url} <ArrowUpRight size={10} style={{marginLeft: 2, display: 'inline'}}/>
                    </a>
                  </td>
                  <td>
                    <span 
                      className="category-tag"
                      style={{ 
                        color: categoryColorMap[visit.category],
                        borderColor: `${categoryColorMap[visit.category]}44`,
                        background: `${categoryColorMap[visit.category]}11`
                      }}
                    >
                      {visit.category}
                    </span>
                  </td>
                  <td className="timestamp">
                    {new Date(visit.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}<br/>
                    <span style={{fontSize: 10, opacity: 0.7}}>{new Date(visit.timestamp).toLocaleDateString()}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default App;
