import { useMemo, useRef } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { Activity, Upload } from 'lucide-react';
import { useDemoData, PRESET_DATASETS } from './useDemoData';
import { generateInsights } from './insights';

/* ── Tone colours (consistent everywhere) ───────────────────────── */
const TONE_COLORS = {
  negative: '#ef4444',
  neutral:  '#f59e0b',
  positive: '#10b981',
};

/* ── Category colours ────────────────────────────────────────────── */
const CATEGORY_COLORS = {
  news:          '#3b82f6',
  climate:       '#10b981',
  finance:       '#f59e0b',
  tech:          '#8b5cf6',
  entertainment: '#ec4899',
  lifestyle:     '#14b8a6',
};

const catColor = (cat) => CATEGORY_COLORS[cat] || '#6b7280';

/* ── Tooltip styling (matches existing) ──────────────────────────── */
const tooltipStyle = {
  backgroundColor: '#1f2937',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '8px',
  color: '#f3f4f6',
};

/* ── Helpers ──────────────────────────────────────────────────────── */
function fmtMin(sec) {
  const m = Math.round(sec / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h}h ${r}m` : `${h}h`;
}

function CustomTooltipBar({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ ...tooltipStyle, padding: '10px 14px', fontSize: 13 }}>
      <p style={{ margin: 0, fontWeight: 600 }}>{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ margin: '4px 0 0', color: p.fill }}>
          {p.dataKey}: {fmtMin(p.value)}
        </p>
      ))}
    </div>
  );
}

function CustomTooltipTimeline({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ ...tooltipStyle, padding: '10px 14px', fontSize: 13 }}>
      <p style={{ margin: 0, fontWeight: 600 }}>{label}:00</p>
      {payload.filter((p) => p.value > 0).map((p) => (
        <p key={p.dataKey} style={{ margin: '4px 0 0', color: p.fill }}>
          {p.dataKey}: {fmtMin(p.value)}
        </p>
      ))}
    </div>
  );
}

/* ── Component ───────────────────────────────────────────────────── */
export default function DemoDashboard({ onExitDemo }) {
  const { rows, fileName, selectedPresetId, loading, error, loadPreset, loadFile } = useDemoData();
  const fileRef = useRef(null);

  /* ── Derived data ──────────────────────────────────────────────── */
  const totalSec = useMemo(() => rows.reduce((s, r) => s + r.seconds, 0), [rows]);

  // 1. Time by category (bar chart data)
  const categoryData = useMemo(() => {
    const map = {};
    rows.forEach((r) => {
      map[r.category] = (map[r.category] || 0) + r.seconds;
    });
    return Object.entries(map)
      .map(([name, seconds]) => ({ name, seconds }))
      .sort((a, b) => b.seconds - a.seconds);
  }, [rows]);

  // 2. Tone share (donut data)
  const toneData = useMemo(() => {
    const map = {};
    rows.forEach((r) => {
      map[r.tone] = (map[r.tone] || 0) + r.seconds;
    });
    return Object.entries(map)
      .map(([name, seconds]) => ({ name, seconds }))
      .sort((a, b) => b.seconds - a.seconds);
  }, [rows]);

  // 3. Hourly timeline stacked by tone
  const hourlyData = useMemo(() => {
    if (!rows.length) return [];
    const buckets = {};
    rows.forEach((r) => {
      const hour = parseInt(r.timestamp.split(' ')[1].split(':')[0], 10);
      if (!buckets[hour]) buckets[hour] = { hour, negative: 0, neutral: 0, positive: 0 };
      buckets[hour][r.tone] = (buckets[hour][r.tone] || 0) + r.seconds;
    });
    const hours = Object.keys(buckets).map(Number);
    const min = Math.min(...hours);
    const max = Math.max(...hours);
    const result = [];
    for (let h = min; h <= max; h++) {
      result.push(buckets[h] || { hour: h, negative: 0, neutral: 0, positive: 0 });
    }
    return result;
  }, [rows]);

  // 4. Insights
  const insights = useMemo(() => generateInsights(rows), [rows]);

  /* ── Loading / Error ───────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner"></div>
        <p>Loading sample data…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-state">
        <Activity size={48} />
        <p>Error: {error}</p>
      </div>
    );
  }

  /* ── Render ─────────────────────────────────────────────────────── */
  return (
    <div className="dashboard-container">
      {/* Header */}
      <header className="header" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
          <Activity size={32} color="#3b82f6" />
          <h1>Nexus Diet</h1>
          <span className="demo-badge">📊 Sample data</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <select
            className="demo-select"
            value={selectedPresetId}
            onChange={(e) => {
              if (e.target.value !== 'custom') {
                loadPreset(e.target.value);
              }
            }}
          >
            {PRESET_DATASETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
            {selectedPresetId === 'custom' && (
              <option value="custom" disabled>
                Custom: {fileName}
              </option>
            )}
          </select>
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            style={{ display: 'none' }}
            onChange={(e) => e.target.files?.[0] && loadFile(e.target.files[0])}
          />
          <button className="demo-btn" onClick={() => fileRef.current?.click()} title="Upload custom CSV">
            <Upload size={14} /> Upload CSV
          </button>
          {onExitDemo && (
            <button className="demo-btn demo-btn-ghost" onClick={onExitDemo}>
              Exit demo
            </button>
          )}
        </div>
      </header>

      {/* Stat cards */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="glass-panel stat-card">
          <div className="stat-label">⏱ Total tracked</div>
          <div className="stat-value">{fmtMin(totalSec)}</div>
        </div>
        <div className="glass-panel stat-card">
          <div className="stat-label">📄 Entries</div>
          <div className="stat-value">{rows.length}</div>
        </div>
        <div className="glass-panel stat-card">
          <div className="stat-label">📡 Platforms</div>
          <div className="stat-value">{new Set(rows.map((r) => r.platform)).size}</div>
        </div>
      </div>

      <div className="main-content">
        {/* ── 1. Time by Category (horizontal bar) ────────────────── */}
        <div className="glass-panel" style={{ padding: 24 }}>
          <div className="chart-title-inline">Time by Category</div>
          <ResponsiveContainer width="100%" height={categoryData.length * 52 + 40}>
            <BarChart
              data={categoryData}
              layout="vertical"
              margin={{ top: 8, right: 30, left: 10, bottom: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" horizontal={false} />
              <XAxis
                type="number"
                tickFormatter={fmtMin}
                tick={{ fill: '#9ca3af', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                dataKey="name"
                type="category"
                width={100}
                tick={{ fill: '#f3f4f6', fontSize: 13, textTransform: 'capitalize' }}
                axisLine={false}
                tickLine={false}
              />
              <RechartsTooltip content={<CustomTooltipBar />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
              <Bar dataKey="seconds" radius={[0, 6, 6, 0]} barSize={28}>
                {categoryData.map((entry) => (
                  <Cell key={entry.name} fill={catColor(entry.name)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* ── Row: Tone donut + Insights ──────────────────────────── */}
        <div className="demo-row">
          {/* 2. Tone donut */}
          <div className="glass-panel demo-col-chart">
            <div className="chart-title-inline">Tone Breakdown</div>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={toneData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={110}
                  paddingAngle={4}
                  dataKey="seconds"
                  stroke="none"
                >
                  {toneData.map((entry) => (
                    <Cell key={entry.name} fill={TONE_COLORS[entry.name] || '#6b7280'} />
                  ))}
                </Pie>
                <RechartsTooltip
                  formatter={(value) => fmtMin(value)}
                  contentStyle={tooltipStyle}
                  itemStyle={{ color: '#f3f4f6' }}
                />
                <Legend
                  formatter={(value) => {
                    const item = toneData.find((d) => d.name === value);
                    const pct = item ? Math.round((item.seconds / totalSec) * 100) : 0;
                    return `${value} (${pct}%)`;
                  }}
                  wrapperStyle={{ fontSize: 13, color: '#9ca3af' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* 4. Insight cards */}
          <div className="demo-col-insights">
            {insights.map((ins, i) => (
              <div key={i} className="glass-panel insight-card">
                <span className="insight-icon">{ins.icon}</span>
                <div>
                  <div className="insight-headline">{ins.headline}</div>
                  <div className="insight-body">{ins.body}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── 3. Hourly timeline ──────────────────────────────────── */}
        <div className="glass-panel" style={{ padding: 24 }}>
          <div className="chart-title-inline">Hourly Timeline</div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={hourlyData}
              margin={{ top: 8, right: 20, left: 10, bottom: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis
                dataKey="hour"
                tickFormatter={(h) => `${h}:00`}
                tick={{ fill: '#9ca3af', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={fmtMin}
                tick={{ fill: '#9ca3af', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <RechartsTooltip content={<CustomTooltipTimeline />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
              <Bar dataKey="negative" stackId="tone" fill={TONE_COLORS.negative} radius={[0, 0, 0, 0]} barSize={32} />
              <Bar dataKey="neutral"  stackId="tone" fill={TONE_COLORS.neutral}  radius={[0, 0, 0, 0]} barSize={32} />
              <Bar dataKey="positive" stackId="tone" fill={TONE_COLORS.positive} radius={[4, 4, 0, 0]} barSize={32} />
              <Legend
                wrapperStyle={{ fontSize: 13, color: '#9ca3af' }}
                formatter={(value) => value.charAt(0).toUpperCase() + value.slice(1)}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
