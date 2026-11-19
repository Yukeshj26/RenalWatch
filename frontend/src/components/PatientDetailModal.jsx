import React, { useState, useEffect } from 'react';
import {
  CheckCircle,
  Calendar,
  Plus,
  AlertCircle,
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  Utensils,
} from 'lucide-react';

export default function PatientDetailModal({ patientId, onQuickLog, onSessionUpdated }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionLoading, setSessionLoading] = useState(false);
  const [showFoodLog, setShowFoodLog] = useState(false);
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

      {/* Health Condition & Clinical Status Table with Measured Quantities */}
      <div className="space-y-2">
        <h4 className="text-xs font-bold uppercase tracking-wider text-mute">
          Health Condition &amp; Measured Quantities
        </h4>
        <div className="overflow-x-auto rounded-xl border border-line bg-white shadow-xs">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-tint/70 text-mute font-bold uppercase tracking-wider border-b border-line text-[10px]">
              <tr>
                <th className="py-2 px-3">Condition / Health Metric</th>
                <th className="py-2 px-3">Measured Quantity</th>
                <th className="py-2 px-3">Clinical Target</th>
                <th className="py-2 px-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line text-[11px]">
              <tr className="hover:bg-tint-light/40">
                <td className="py-2 px-3 font-semibold text-ink">Weight Gain (IDWG)</td>
                <td className="py-2 px-3 font-bold text-ink">
                  {data.current_weight} kg ({r.idwg_pct >= 0 ? '+' : ''}{r.idwg_pct}%)
                </td>
                <td className="py-2 px-3 text-mute">{data.dry_weight} kg (&lt; 4.0%)</td>
                <td className="py-2 px-3 text-right">
                  <span
                    className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                      r.idwg_pct >= 4
                        ? 'bg-risk-highBg text-risk-high'
                        : r.idwg_pct >= 2
                        ? 'bg-risk-medBg text-risk-med'
                        : 'bg-risk-lowBg text-risk-low'
                    }`}
                  >
                    {r.idwg_pct >= 4
                      ? `+${(data.current_weight - data.dry_weight).toFixed(1)}kg High`
                      : r.idwg_pct >= 2
                      ? 'Moderate'
                      : 'Safe'}
                  </span>
                </td>
              </tr>
              <tr className="hover:bg-tint-light/40">
                <td className="py-2 px-3 font-semibold text-ink">Blood Pressure</td>
                <td className="py-2 px-3 font-bold text-ink">
                  {data.bp_sys || 120} / {data.bp_dia || 80} mmHg
                </td>
                <td className="py-2 px-3 text-mute">&lt; 140/90 mmHg</td>
                <td className="py-2 px-3 text-right">
                  <span
                    className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                      (data.bp_sys || 120) >= 160
                        ? 'bg-risk-highBg text-risk-high'
                        : (data.bp_sys || 120) >= 140
                        ? 'bg-risk-medBg text-risk-med'
                        : 'bg-risk-lowBg text-risk-low'
                    }`}
                  >
                    {(data.bp_sys || 120) >= 160
                      ? 'Stage 2 High'
                      : (data.bp_sys || 120) >= 140
                      ? 'Stage 1 High'
                      : 'Controlled'}
                  </span>
                </td>
              </tr>
              <tr className="hover:bg-tint-light/40">
                <td className="py-2 px-3 font-semibold text-ink">Heart Rate</td>
                <td className="py-2 px-3 font-bold text-ink">{data.heart_rate || 72} bpm</td>
                <td className="py-2 px-3 text-mute">60–100 bpm</td>
                <td className="py-2 px-3 text-right">
                  <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-risk-lowBg text-risk-low">
                    Normal
                  </span>
                </td>
              </tr>
              <tr className="hover:bg-tint-light/40">
                <td className="py-2 px-3 font-semibold text-ink">Daily Fluid Intake</td>
                <td className="py-2 px-3 font-bold text-ink">
                  {data.nutrients_today ? data.nutrients_today.fluid : 0} mL
                </td>
                <td className="py-2 px-3 text-mute">&lt; {data.fluid_limit || 1000} mL</td>
                <td className="py-2 px-3 text-right">
                  <span
                    className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                      (data.nutrients_today?.fluid || 0) > (data.fluid_limit || 1000)
                        ? 'bg-risk-highBg text-risk-high'
                        : 'bg-risk-lowBg text-risk-low'
                    }`}
                  >
                    {(data.nutrients_today?.fluid || 0) > (data.fluid_limit || 1000)
                      ? 'Exceeded'
                      : 'Safe'}
                  </span>
                </td>
              </tr>
              <tr className="hover:bg-tint-light/40">
                <td className="py-2 px-3 font-semibold text-ink">Daily Potassium (K)</td>
                <td className="py-2 px-3 font-bold text-ink">
                  {data.nutrients_today ? data.nutrients_today.k : 0} mg
                </td>
                <td className="py-2 px-3 text-mute">&lt; 2000 mg</td>
                <td className="py-2 px-3 text-right">
                  <span
                    className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                      (data.nutrients_today?.k || 0) > 2000
                        ? 'bg-risk-highBg text-risk-high'
                        : 'bg-risk-lowBg text-risk-low'
                    }`}
                  >
                    {(data.nutrients_today?.k || 0) > 2000 ? 'Elevated' : 'Safe'}
                  </span>
                </td>
              </tr>
              <tr className="hover:bg-tint-light/40">
                <td className="py-2 px-3 font-semibold text-ink">Days Since Dialysis</td>
                <td className="py-2 px-3 font-bold text-ink">{data.days_since_session} days</td>
                <td className="py-2 px-3 text-mute">&le; 2 days</td>
                <td className="py-2 px-3 text-right">
                  <span
                    className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                      data.days_since_session >= 3
                        ? 'bg-risk-highBg text-risk-high'
                        : 'bg-risk-lowBg text-risk-low'
                    }`}
                  >
                    {data.days_since_session >= 3 ? 'Long Interval' : 'On Schedule'}
                  </span>
                </td>
              </tr>
              <tr className="hover:bg-tint-light/40">
                <td className="py-2 px-3 font-semibold text-ink">Reported Symptoms</td>
                <td colSpan={2} className="py-2 px-3 text-ink font-medium">
                  {data.symptoms && data.symptoms.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {data.symptoms.map((s, idx) => (
                        <span
                          key={idx}
                          className="px-1.5 py-0.5 bg-bg border border-line rounded text-[10px] font-semibold text-teal-dark"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-mute">None</span>
                  )}
                </td>
                <td className="py-2 px-3 text-right">
                  <span
                    className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                      data.symptoms && data.symptoms.length > 0
                        ? 'bg-risk-medBg text-risk-med'
                        : 'bg-risk-lowBg text-risk-low'
                    }`}
                  >
                    {data.symptoms && data.symptoms.length > 0
                      ? `${data.symptoms.length} Active`
                      : 'Clear'}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Collapsible Recent Logged Food Items Table (Hidden by Default, Expands on Click) */}
      <div className="p-4 rounded-xl border border-line bg-bg space-y-2.5 transition-all">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setShowFoodLog(!showFoodLog)}
            className="flex items-center gap-2 text-left group"
          >
            <div className="w-7 h-7 rounded-lg bg-tint text-teal flex items-center justify-center shrink-0">
              <Utensils size={14} />
            </div>
            <div>
              <h4 className="text-xs font-bold text-ink uppercase tracking-wider group-hover:text-teal transition-colors">
                Patient Food Intake Log
              </h4>
              <span className="text-[10px] text-mute block">
                {showFoodLog ? 'Tap to hide log' : 'Tap to expand itemized meal table'}
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setShowFoodLog(!showFoodLog)}
            className="px-2.5 py-1 rounded-lg border border-line bg-white hover:bg-tint-light text-ink text-xs font-semibold transition-all flex items-center gap-1 shadow-2xs"
          >
            {showFoodLog ? <ChevronUp size={13} className="text-teal" /> : <ChevronDown size={13} className="text-teal" />}
            {showFoodLog ? 'Hide Food Log' : 'View Food Log'}
          </button>
        </div>

        {showFoodLog && (
          <div className="pt-1 animate-fadeSlideUp">
            {data.recent_meals && data.recent_meals.length > 0 ? (
              <div className="overflow-x-auto rounded-xl border border-line bg-white shadow-xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-gradient-to-r from-tint-light to-tint/60 text-teal-dark font-bold uppercase tracking-wider border-b border-line text-[10px]">
                    <tr>
                      <th className="py-2 px-3">Food Item</th>
                      <th className="py-2 px-3">Quantity &amp; Serving</th>
                      <th className="py-2 px-3 text-right">Potassium (K)</th>
                      <th className="py-2 px-3 text-right">Fluid</th>
                      <th className="py-2 px-3 text-right">Phosphorus (P)</th>
                      <th className="py-2 px-3 text-right">Sodium (Na)</th>
                      <th className="py-2 px-3 text-right">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line text-[11px]">
                    {data.recent_meals.slice(0, 4).flatMap((m, mIdx) => {
                      if (Array.isArray(m.items) && m.items.length > 0) {
                        return m.items.map((it, itIdx) => (
                          <tr key={`${mIdx}-${itIdx}`} className="hover:bg-tint-light/40 transition-colors">
                            <td className="py-2 px-3 font-semibold text-ink capitalize">
                              {it.food}
                            </td>
                            <td className="py-2 px-3">
                              <span className="inline-block px-2 py-0.5 rounded-md bg-tint text-teal-dark font-bold text-[10px] border border-teal/20">
                                {it.qty ? `${it.qty} ${it.unit || 'serving'}` : (it.unit || '1 serving')}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-right text-ink font-semibold">{it.k} mg</td>
                            <td className="py-2 px-3 text-right text-teal-dark font-semibold">{it.fluid} mL</td>
                            <td className="py-2 px-3 text-right text-mute">{it.p} mg</td>
                            <td className="py-2 px-3 text-right text-mute">{it.na} mg</td>
                            <td className="py-2 px-3 text-right text-mute font-medium">{m.day}</td>
                          </tr>
                        ));
                      }
                      return (
                        <tr key={mIdx} className="hover:bg-tint-light/40 transition-colors">
                          <td className="py-2 px-3 font-semibold text-ink capitalize">{m.text}</td>
                          <td className="py-2 px-3">
                            <span className="inline-block px-2 py-0.5 rounded-md bg-tint text-teal-dark font-bold text-[10px] border border-teal/20">
                              1 serving
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right text-ink font-semibold">{m.k} mg</td>
                          <td className="py-2 px-3 text-right text-teal-dark font-semibold">{m.fluid} mL</td>
                          <td className="py-2 px-3 text-right text-mute">{m.p} mg</td>
                          <td className="py-2 px-3 text-right text-mute">{m.na} mg</td>
                          <td className="py-2 px-3 text-right text-mute font-medium">{m.day}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-mute py-2">No meals logged yet.</p>
            )}
          </div>
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
