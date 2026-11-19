import React, { useState, useEffect } from 'react';
import { CheckCircle, Calendar, Plus, AlertCircle, ArrowUpRight } from 'lucide-react';

export default function PatientDetailModal({ patientId, onQuickLog, onSessionUpdated }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!patientId) return;
    setLoading(true);
    fetch(`/api/patients/${patientId}`)
      .then(res => {
        if (!res.ok) throw new Error('Patient record not found');
        return res.json();
      })
      .then(d => {
        setData(d);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [patientId]);

  async function handleMarkSession() {
    if (!patientId) return;
    setSessionLoading(true);
    try {
      const res = await fetch(`/api/patients/${patientId}/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error('Failed to update session');
      // Refresh current patient details and notify parent
      const updated = await fetch(`/api/patients/${patientId}`).then(r => r.json());
      setData(updated);
      onSessionUpdated();
    } catch (err) {
      alert('Could not update dialysis session.');
    } finally {
      setSessionLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="py-12 text-center text-mute text-sm">
        <div className="inline-block w-6 h-6 border-2 border-teal border-t-transparent rounded-full animate-spin mb-3" />
        <p>Loading patient clinical profile...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-4 rounded-xl bg-risk-highBg text-risk-high text-xs">
        {error || 'Unable to load patient'}
      </div>
    );
  }

  const r = data.risk || { score: 0, level: 'low', factors: [] };
  const history = data.weight_history || [];
  const weights = history.map(h => h.weight).filter(w => typeof w === 'number');

  // Compute SVG Sparkline
  let sparkline = null;
  if (weights.length >= 2) {
    const dry = data.dry_weight;
    const allVals = [...weights, dry];
    const minW = Math.min(...allVals) - 0.5;
    const maxW = Math.max(...allVals) + 0.5;
    const width = 360;
    const height = 80;

    const scaleX = i => 15 + (i * (width - 30)) / (weights.length - 1);
    const scaleY = w => height - 14 - ((w - minW) / (maxW - minW || 1)) * (height - 28);

    const dryY = scaleY(dry);
    const points = weights.map((w, i) => `${scaleX(i)},${scaleY(w)}`).join(' ');

    sparkline = (
      <div className="p-4 rounded-xl bg-bg border border-line">
        <div className="flex items-center justify-between text-xs text-mute mb-2">
          <span className="font-semibold text-ink">7-Day Weight Trajectory</span>
          <span>Dashed Line = Target Dry Weight ({dry} kg)</span>
        </div>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-20 overflow-visible"
          role="img"
          aria-label="7-Day Weight Graph"
        >
          {/* Dry weight dashed line */}
          <line
            x1="10"
            x2={width - 10}
            y1={dryY}
            y2={dryY}
            stroke="#23805A"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />
          {/* Weight polyline */}
          <polyline
            fill="none"
            stroke="#0F7C8A"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={points}
          />
          {/* Data points */}
          {weights.map((w, i) => (
            <circle
              key={i}
              cx={scaleX(i)}
              cy={scaleY(w)}
              r="3.5"
              className="fill-teal stroke-white stroke-2"
            />
          ))}
        </svg>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Patient info bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-line">
        <div>
          <h3 className="text-xl font-heading font-bold text-ink flex items-center gap-2">
            {data.name}
            <span className="text-xs font-normal text-mute">
              Age {data.age} · {data.gender || 'N/A'}
            </span>
          </h3>
          <p className="text-xs text-mute mt-1">
            Target Dry Weight: <b className="text-ink">{data.dry_weight} kg</b> · Daily Fluid Limit: <b className="text-ink">{data.fluid_limit} mL</b> · Schedule: <b className="text-ink">{data.dialysis_schedule}</b>
          </p>
        </div>

        <span
          className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full whitespace-nowrap self-start sm:self-auto ${
            r.level === 'high'
              ? 'bg-risk-highBg text-risk-high animate-pulseRisk'
              : r.level === 'medium'
              ? 'bg-risk-medBg text-risk-med'
              : 'bg-risk-lowBg text-risk-low'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-current" />
          {r.level.toUpperCase()} · {r.score}/100
        </span>
      </div>

      {/* Weight Sparkline */}
      {sparkline}

      {/* 4-metric Clinical Status Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-tint-light p-3.5 rounded-xl border border-teal/15 text-center">
          <span className="block text-xl font-heading font-bold text-teal-dark">
            {data.nutrients_today ? data.nutrients_today.k : 0}
          </span>
          <span className="text-[10px] uppercase font-bold text-mute tracking-wider">
            Potassium Today (mg)
          </span>
        </div>
        <div className="bg-tint-light p-3.5 rounded-xl border border-teal/15 text-center">
          <span className="block text-xl font-heading font-bold text-teal-dark">
            {data.nutrients_today ? data.nutrients_today.fluid : 0}
          </span>
          <span className="text-[10px] uppercase font-bold text-mute tracking-wider">
            Fluid Today (mL)
          </span>
        </div>
        <div className="bg-tint-light p-3.5 rounded-xl border border-teal/15 text-center">
          <span className="block text-xl font-heading font-bold text-teal-dark">
            {r.idwg_pct}%
          </span>
          <span className="text-[10px] uppercase font-bold text-mute tracking-wider">
            IDWG Over Dry Wt
          </span>
        </div>
        <div className="bg-tint-light p-3.5 rounded-xl border border-teal/15 text-center">
          <span className="block text-xl font-heading font-bold text-teal-dark">
            {data.days_since_session}d
          </span>
          <span className="text-[10px] uppercase font-bold text-mute tracking-wider">
            Since Dialysis
          </span>
        </div>
      </div>

      {/* Clinical Factor Breakdown */}
      <div>
        <h4 className="text-xs font-bold uppercase tracking-wider text-mute mb-2">
          Clinical Factors Contributing to Urgency
        </h4>
        {r.factors && r.factors.length > 0 ? (
          <ul className="space-y-1.5 text-xs">
            {r.factors.map((f, idx) => (
              <li
                key={idx}
                className="flex items-center justify-between p-2 rounded-lg bg-bg border border-line"
              >
                <span className="text-ink font-medium">{f.reason}</span>
                <span className="font-bold text-teal-dark">+{f.points} pts</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-mute">No significant clinical risks identified.</p>
        )}
      </div>

      {/* Recent Meals */}
      <div>
        <h4 className="text-xs font-bold uppercase tracking-wider text-mute mb-2">
          Recent Meals Recorded
        </h4>
        {data.recent_meals && data.recent_meals.length > 0 ? (
          <div className="space-y-1.5 text-xs">
            {data.recent_meals.slice(0, 3).map((m, idx) => (
              <div
                key={idx}
                className="p-2.5 rounded-lg bg-bg border border-line flex items-center justify-between"
              >
                <div>
                  <span className="font-semibold text-ink capitalize">{m.text}</span>
                  <span className="block text-[11px] text-mute">{m.day}</span>
                </div>
                <div className="text-right text-[11px] text-mute">
                  <span>K: {m.k}mg</span> · <span>Fluid: {m.fluid}mL</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-mute">No meals logged yet.</p>
        )}
      </div>

      {/* Action Footer */}
      <div className="pt-4 border-t border-line flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={handleMarkSession}
          disabled={sessionLoading}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal hover:bg-teal-dark text-white font-semibold text-xs shadow-sm transition-all disabled:opacity-50"
        >
          <CheckCircle size={15} />
          {sessionLoading ? 'Recording...' : 'Mark Dialysis Completed Today'}
        </button>

        <button
          onClick={() => onQuickLog(data.id)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white border border-line hover:border-teal text-ink font-semibold text-xs transition-all"
        >
          <Plus size={15} className="text-teal" />
          Quick Log for {data.name.split(' ')[0]}
        </button>
      </div>
    </div>
  );
}
