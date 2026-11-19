import React, { useState, useEffect } from 'react';
import WhatIfRiskPanel from './WhatIfRiskPanel';
import {
  Activity,
  Utensils,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  Calendar,
  Phone,
  HeartPulse,
  Clock,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Plus,
} from 'lucide-react';

export default function PersonalizedPatientPortal({
  patient,
  onOpenLogModal,
  onOpenFoodModal,
  onOpenSafetyModal,
  onRefresh,
}) {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showFoodLog, setShowFoodLog] = useState(false);

  useEffect(() => {
    if (!patient?.id) return;
    setLoading(true);
    fetch(`/api/patients/${patient.id}/dashboard`)
      .then(async res => {
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const text = await res.text();
        return text ? JSON.parse(text) : null;
      })
      .then(d => {
        if (d) setDashboard(d);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error fetching dashboard:', err);
        setLoading(false);
      });
  }, [patient?.id, onRefresh]);

  if (loading || !dashboard) {
    return (
      <div className="py-24 text-center text-mute">
        <div className="inline-block w-8 h-8 border-3 border-teal border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-sm">Loading your personalized health dashboard...</p>
      </div>
    );
  }

  const p = dashboard.patient;
  const r = dashboard.risk;
  const nutrients = dashboard.nutrients_today;
  const history = dashboard.weight_history || [];
  const weights = history.map(h => h.weight).filter(w => typeof w === 'number');

  // Compute percentage of limits
  const fluidPct = Math.min(100, Math.round((nutrients.fluid / (p.fluid_limit || 1000)) * 100));
  const kPct = Math.min(100, Math.round((nutrients.k / 2000) * 100));

  // Flatten recent meals into individual food items with exact quantities
  const mealItems = [];
  if (dashboard.recent_meals && dashboard.recent_meals.length > 0) {
    dashboard.recent_meals.slice(0, 5).forEach(m => {
      if (Array.isArray(m.items) && m.items.length > 0) {
        m.items.forEach(it => {
          mealItems.push({
            day: m.day,
            food: it.food,
            qty: it.qty ? `${it.qty} ${it.unit || 'serving'}` : (it.unit || '1 serving'),
            k: it.k || 0,
            p: it.p || 0,
            na: it.na || 0,
            fluid: it.fluid || 0,
          });
        });
      } else {
        mealItems.push({
          day: m.day,
          food: m.text,
          qty: '1 serving',
          k: m.k || 0,
          p: m.p || 0,
          na: m.na || 0,
          fluid: m.fluid || 0,
        });
      }
    });
  }

  // Weight Sparkline
  let sparkline = null;
  if (weights.length >= 2) {
    const dry = p.dry_weight;
    const allVals = [...weights, dry];
    const minW = Math.min(...allVals) - 0.5;
    const maxW = Math.max(...allVals) + 0.5;
    const width = 400;
    const height = 90;

    const scaleX = i => 15 + (i * (width - 30)) / (weights.length - 1);
    const scaleY = w => height - 16 - ((w - minW) / (maxW - minW || 1)) * (height - 32);

    const dryY = scaleY(dry);
    const points = weights.map((w, i) => `${scaleX(i)},${scaleY(w)}`).join(' ');

    sparkline = (
      <div className="p-4 rounded-2xl bg-white border border-line shadow-sm space-y-2">
        <div className="flex items-center justify-between text-xs text-mute">
          <span className="font-bold text-ink flex items-center gap-1.5">
            <Activity size={14} className="text-teal" /> 7-Day Weight vs Dry Weight
          </span>
          <span className="text-[11px] text-teal-dark font-medium">
            Target Dry Weight: {dry} kg (Dashed line)
          </span>
        </div>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-24 overflow-visible"
          role="img"
          aria-label="Weight progression graph"
        >
          <line
            x1="10"
            x2={width - 10}
            y1={dryY}
            y2={dryY}
            stroke="#23805A"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />
          <polyline
            fill="none"
            stroke="#0F7C8A"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={points}
          />
          {weights.map((w, i) => (
            <circle
              key={i}
              cx={scaleX(i)}
              cy={scaleY(w)}
              r="4"
              className="fill-teal stroke-white stroke-2"
            />
          ))}
        </svg>
        <div className="flex justify-between text-[11px] text-mute pt-1 border-t border-line/60">
          <span>7 Days Ago: {weights[0]} kg</span>
          <span>Latest Log: <b className="text-ink">{p.current_weight} kg</b></span>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-24 pb-16 px-4 sm:px-8 max-w-6xl mx-auto space-y-8 animate-fadeSlideUp">
      {/* Welcome Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-tint-light via-tint/40 to-white border border-teal/20 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal/10 text-teal-dark text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-teal animate-pulse" />
            Personalized Patient Portal
          </div>
          <h1 className="text-2xl sm:text-4xl font-heading font-bold text-ink">
            Welcome back, {p.name}! 👋
          </h1>
          <p className="text-sm text-mute max-w-xl">
            Here is your daily monitoring summary for your interdialytic care. Stay within your dry weight and fluid targets to avoid complications before your next session.
          </p>
        </div>

        {/* Quick Vitals Capsule */}
        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
          <div className="bg-white/90 backdrop-blur-sm p-4 rounded-2xl border border-line shadow-sm min-w-[150px]">
            <span className="text-[11px] uppercase font-bold text-mute tracking-wider block">
              Next Dialysis
            </span>
            <span className="text-lg font-heading font-bold text-teal-dark mt-0.5 block flex items-center gap-1.5">
              <Calendar size={18} className="text-teal" />
              {dashboard.next_session}
            </span>
            <span className="text-[11px] text-mute">Schedule: {p.dialysis_schedule}</span>
          </div>

          <div className="bg-white/90 backdrop-blur-sm p-4 rounded-2xl border border-line shadow-sm min-w-[150px]">
            <span className="text-[11px] uppercase font-bold text-mute tracking-wider block">
              Weight Status
            </span>
            <span className="text-lg font-heading font-bold text-ink mt-0.5 block">
              {p.current_weight} kg
            </span>
            <span className="text-[11px] text-mute">
              Target: {p.dry_weight} kg ({r.idwg_pct >= 0 ? '+' : ''}{r.idwg_pct}% IDWG)
            </span>
          </div>
        </div>
      </div>

      {/* Mobile-First Fast Action Bar */}
      <div className="grid grid-cols-2 gap-3 sm:hidden">
        <button
          onClick={onOpenLogModal}
          className="p-3.5 rounded-2xl bg-teal text-white shadow-md active:scale-95 transition-all flex flex-col items-center justify-center text-center gap-1.5 touch-manipulation"
        >
          <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
            <Activity size={20} />
          </div>
          <span className="font-bold text-xs">Log Weight &amp; BP</span>
          <span className="text-[10px] text-white/80">Daily 1-Min Check-in</span>
        </button>

        <button
          onClick={onOpenFoodModal}
          className="p-3.5 rounded-2xl bg-white border border-teal/30 text-teal-dark shadow-xs active:scale-95 transition-all flex flex-col items-center justify-center text-center gap-1.5 touch-manipulation"
        >
          <div className="w-9 h-9 rounded-full bg-tint flex items-center justify-center text-teal">
            <Utensils size={20} />
          </div>
          <span className="font-bold text-xs">Check Food</span>
          <span className="text-[10px] text-mute">Nutrient Calculator</span>
        </button>
      </div>

      {/* Main Grid: Risk Overview & Today's Nutrient Gauges */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Personal Risk & Advice */}
        <div className="lg:col-span-5 space-y-6">
          {/* Personalized Risk Status Card */}
          <div className="p-6 rounded-2xl bg-white border border-line shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <h3 className="font-heading font-bold text-ink text-base flex items-center gap-2">
                <HeartPulse size={18} className="text-teal" /> Your Interdialytic Risk Score
              </h3>
              <span
                className={`text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap ${
                  r.level === 'high'
                    ? 'bg-risk-highBg text-risk-high animate-pulseRisk'
                    : r.level === 'medium'
                    ? 'bg-risk-medBg text-risk-med'
                    : 'bg-risk-lowBg text-risk-low'
                }`}
              >
                {r.level.toUpperCase()} · {r.score}/100
              </span>
            </div>

            {/* Health Condition & Measured Quantities (Mobile-First Adaptive Display) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-mute uppercase tracking-wider block">
                  Health Condition &amp; Measured Quantities
                </span>
                <span className="text-[10px] text-mute font-medium">Daily Clinical Log</span>
              </div>

              {/* Mobile Cards View (< sm) */}
              <div className="space-y-2 sm:hidden">
                {/* Weight / IDWG */}
                <div className="p-3 rounded-xl border border-line bg-white shadow-2xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-ink">Weight Gain (IDWG)</span>
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
                        ? `+${(p.current_weight - p.dry_weight).toFixed(1)}kg Overload`
                        : r.idwg_pct >= 2
                        ? 'Moderate'
                        : 'Within Target'}
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline text-xs">
                    <span className="text-base font-bold text-ink">{p.current_weight} kg <span className="text-xs font-semibold text-teal-dark">({r.idwg_pct >= 0 ? '+' : ''}{r.idwg_pct}%)</span></span>
                    <span className="text-[11px] text-mute">Target: {p.dry_weight} kg (&lt; 4%)</span>
                  </div>
                </div>

                {/* Blood Pressure */}
                <div className="p-3 rounded-xl border border-line bg-white shadow-2xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-ink">Blood Pressure</span>
                    <span
                      className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                        (p.bp_sys || 120) >= 160
                          ? 'bg-risk-highBg text-risk-high'
                          : (p.bp_sys || 120) >= 140
                          ? 'bg-risk-medBg text-risk-med'
                          : 'bg-risk-lowBg text-risk-low'
                      }`}
                    >
                      {(p.bp_sys || 120) >= 160
                        ? 'Stage 2 High'
                        : (p.bp_sys || 120) >= 140
                        ? 'Stage 1 High'
                        : 'Controlled'}
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline text-xs">
                    <span className="text-base font-bold text-ink">{p.bp_sys || 120} / {p.bp_dia || 80} <span className="text-xs font-normal text-mute">mmHg</span></span>
                    <span className="text-[11px] text-mute">Target: &lt; 140/90</span>
                  </div>
                </div>

                {/* Fluid & Potassium row */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 rounded-xl border border-line bg-white shadow-2xs space-y-1">
                    <span className="text-[10px] font-bold text-mute uppercase tracking-wider block">Fluid Intake</span>
                    <span className="text-base font-bold text-ink block">{nutrients.fluid} mL</span>
                    <span className="text-[10px] text-mute block">Limit: {p.fluid_limit} mL</span>
                  </div>

                  <div className="p-3 rounded-xl border border-line bg-white shadow-2xs space-y-1">
                    <span className="text-[10px] font-bold text-mute uppercase tracking-wider block">Potassium</span>
                    <span className="text-base font-bold text-ink block">{nutrients.k} mg</span>
                    <span className="text-[10px] text-mute block">Limit: 2000 mg</span>
                  </div>
                </div>

                {/* Days Since Dialysis */}
                <div className="p-2.5 rounded-xl border border-line bg-white flex items-center justify-between text-xs">
                  <span className="text-mute font-medium">Days Since Dialysis:</span>
                  <span className="font-bold text-ink">{dashboard.days_since_session ?? p.days_since_session} days</span>
                </div>
              </div>

              {/* Desktop Table View (>= sm) */}
              <div className="hidden sm:block overflow-x-auto rounded-xl border border-line bg-white shadow-xs">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-tint/70 text-mute font-bold uppercase tracking-wider border-b border-line text-[10px]">
                    <tr>
                      <th className="py-2 px-3">Condition / Metric</th>
                      <th className="py-2 px-3">Measured Quantity</th>
                      <th className="py-2 px-3">Safe Baseline</th>
                      <th className="py-2 px-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line text-[11px]">
                    <tr className="hover:bg-tint-light/40">
                      <td className="py-2 px-3 font-semibold text-ink">Weight Gain (IDWG)</td>
                      <td className="py-2 px-3 font-bold text-ink">
                        {p.current_weight} kg ({r.idwg_pct >= 0 ? '+' : ''}{r.idwg_pct}%)
                      </td>
                      <td className="py-2 px-3 text-mute">{p.dry_weight} kg (&lt; 4.0%)</td>
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
                            ? `+${(p.current_weight - p.dry_weight).toFixed(1)}kg Overload`
                            : r.idwg_pct >= 2
                            ? 'Moderate'
                            : 'Within Target'}
                        </span>
                      </td>
                    </tr>
                    <tr className="hover:bg-tint-light/40">
                      <td className="py-2 px-3 font-semibold text-ink">Blood Pressure</td>
                      <td className="py-2 px-3 font-bold text-ink">
                        {p.bp_sys || 120} / {p.bp_dia || 80} mmHg
                      </td>
                      <td className="py-2 px-3 text-mute">&lt; 140/90 mmHg</td>
                      <td className="py-2 px-3 text-right">
                        <span
                          className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                            (p.bp_sys || 120) >= 160
                              ? 'bg-risk-highBg text-risk-high'
                              : (p.bp_sys || 120) >= 140
                              ? 'bg-risk-medBg text-risk-med'
                              : 'bg-risk-lowBg text-risk-low'
                          }`}
                        >
                          {(p.bp_sys || 120) >= 160
                            ? 'Stage 2 High'
                            : (p.bp_sys || 120) >= 140
                            ? 'Stage 1 High'
                            : 'Controlled'}
                        </span>
                      </td>
                    </tr>
                    <tr className="hover:bg-tint-light/40">
                      <td className="py-2 px-3 font-semibold text-ink">Heart Rate</td>
                      <td className="py-2 px-3 font-bold text-ink">{p.heart_rate || 72} bpm</td>
                      <td className="py-2 px-3 text-mute">60–100 bpm</td>
                      <td className="py-2 px-3 text-right">
                        <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-risk-lowBg text-risk-low">
                          Normal
                        </span>
                      </td>
                    </tr>
                    <tr className="hover:bg-tint-light/40">
                      <td className="py-2 px-3 font-semibold text-ink">Fluid Accumulation</td>
                      <td className="py-2 px-3 font-bold text-ink">{nutrients.fluid} mL</td>
                      <td className="py-2 px-3 text-mute">&lt; {p.fluid_limit} mL</td>
                      <td className="py-2 px-3 text-right">
                        <span
                          className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                            nutrients.fluid > p.fluid_limit
                              ? 'bg-risk-highBg text-risk-high'
                              : 'bg-risk-lowBg text-risk-low'
                          }`}
                        >
                          {nutrients.fluid > p.fluid_limit
                            ? `+${nutrients.fluid - p.fluid_limit}mL Over`
                            : 'Within Limit'}
                        </span>
                      </td>
                    </tr>
                    <tr className="hover:bg-tint-light/40">
                      <td className="py-2 px-3 font-semibold text-ink">Potassium Load</td>
                      <td className="py-2 px-3 font-bold text-ink">{nutrients.k} mg</td>
                      <td className="py-2 px-3 text-mute">&lt; 2000 mg</td>
                      <td className="py-2 px-3 text-right">
                        <span
                          className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                            nutrients.k > 2000
                              ? 'bg-risk-highBg text-risk-high'
                              : nutrients.k > 1600
                              ? 'bg-risk-medBg text-risk-med'
                              : 'bg-risk-lowBg text-risk-low'
                          }`}
                        >
                          {nutrients.k > 2000 ? 'High' : 'Safe'}
                        </span>
                      </td>
                    </tr>
                    <tr className="hover:bg-tint-light/40">
                      <td className="py-2 px-3 font-semibold text-ink">Days Since Dialysis</td>
                      <td className="py-2 px-3 font-bold text-ink">
                        {dashboard.days_since_session ?? p.days_since_session} days
                      </td>
                      <td className="py-2 px-3 text-mute">&le; 2 days</td>
                      <td className="py-2 px-3 text-right">
                        <span
                          className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                            (dashboard.days_since_session ?? p.days_since_session) >= 3
                              ? 'bg-risk-highBg text-risk-high'
                              : 'bg-risk-lowBg text-risk-low'
                          }`}
                        >
                          {(dashboard.days_since_session ?? p.days_since_session) >= 3
                            ? 'Long Gap'
                            : 'On Track'}
                        </span>
                      </td>
                    </tr>
                    <tr className="hover:bg-tint-light/40">
                      <td className="py-2 px-3 font-semibold text-ink">Reported Symptoms</td>
                      <td colSpan={2} className="py-2 px-3 text-ink font-medium">
                        {p.symptoms && p.symptoms.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {p.symptoms.map((s, idx) => (
                              <span
                                key={idx}
                                className="px-1.5 py-0.5 bg-bg border border-line rounded text-[10px] font-semibold text-teal-dark"
                              >
                                {s}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-mute">None reported</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-right">
                        <span
                          className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                            p.symptoms && p.symptoms.length > 0
                              ? 'bg-risk-medBg text-risk-med'
                              : 'bg-risk-lowBg text-risk-low'
                          }`}
                        >
                          {p.symptoms && p.symptoms.length > 0
                            ? `${p.symptoms.length} Active`
                            : 'Clear'}
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Action buttons */}
            <div className="pt-2 flex flex-col sm:flex-row gap-2">
              <button
                onClick={onOpenLogModal}
                className="flex-1 py-2.5 px-4 rounded-xl bg-teal hover:bg-teal-dark text-white text-xs font-semibold shadow-sm transition-all flex items-center justify-center gap-1.5"
              >
                <Activity size={15} />
                Log Weight &amp; BP
              </button>
              <button
                onClick={onOpenFoodModal}
                className="flex-1 py-2.5 px-4 rounded-xl bg-tint hover:bg-teal/15 text-teal-dark text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
              >
                <Utensils size={15} />
                Check Meal
              </button>
            </div>
          </div>

          {/* Emergency Safety Alert Card */}
          <div className="p-5 rounded-2xl bg-risk-highBg/50 border border-risk-high/30 space-y-2">
            <div className="flex items-center gap-2 text-risk-high font-bold text-xs uppercase tracking-wider">
              <ShieldAlert size={16} /> Clinical Emergency Warning
            </div>
            <p className="text-xs text-ink/80 leading-relaxed">
              If you experience sudden <b>breathlessness</b>, <b>chest pain</b>, or <b>severe dizziness</b>, do not wait for your next session. Contact emergency medical services immediately.
            </p>
            <button
              onClick={onOpenSafetyModal}
              className="text-xs text-risk-high hover:underline font-bold inline-block pt-1"
            >
              Review multilingual emergency rules &rarr;
            </button>
          </div>
        </div>

        {/* Right Column: Gauges, Weight Chart, and Meals */}
        <div className="lg:col-span-7 space-y-6">
          {/* Daily Nutrient Progress Gauges */}
          <div className="p-6 rounded-2xl bg-white border border-line shadow-sm space-y-4">
            <h3 className="font-heading font-bold text-ink text-base flex items-center justify-between">
              <span>Today's Fluid &amp; Nutrient Tracking</span>
              <span className="text-xs font-normal text-mute">From logged meals</span>
            </h3>

            {/* Fluid Intake Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-ink">Fluid Intake: <b>{nutrients.fluid} mL</b></span>
                <span className="text-mute">Daily Limit: {p.fluid_limit} mL ({fluidPct}%)</span>
              </div>
              <div className="w-full h-3 bg-bg rounded-full overflow-hidden border border-line">
                <div
                  className={`h-full transition-all duration-500 ${
                    fluidPct > 100
                      ? 'bg-risk-high'
                      : fluidPct > 80
                      ? 'bg-risk-med'
                      : 'bg-teal'
                  }`}
                  style={{ width: `${fluidPct}%` }}
                />
              </div>
            </div>

            {/* Potassium Progress Bar */}
            <div className="space-y-1.5 pt-2">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-ink">Potassium Intake: <b>{nutrients.k} mg</b></span>
                <span className="text-mute">Threshold: 2000 mg ({kPct}%)</span>
              </div>
              <div className="w-full h-3 bg-bg rounded-full overflow-hidden border border-line">
                <div
                  className={`h-full transition-all duration-500 ${
                    kPct > 100
                      ? 'bg-risk-high'
                      : kPct > 75
                      ? 'bg-risk-med'
                      : 'bg-teal'
                  }`}
                  style={{ width: `${kPct}%` }}
                />
              </div>
            </div>

            {/* 4 Cards Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3">
              <div className="p-3 rounded-xl bg-tint-light text-center border border-teal/15">
                <span className="block text-lg font-heading font-bold text-teal-dark">{nutrients.k}</span>
                <span className="text-[10px] uppercase font-bold text-mute">Potassium (mg)</span>
              </div>
              <div className="p-3 rounded-xl bg-tint-light text-center border border-teal/15">
                <span className="block text-lg font-heading font-bold text-teal-dark">{nutrients.fluid}</span>
                <span className="text-[10px] uppercase font-bold text-mute">Fluid (mL)</span>
              </div>
              <div className="p-3 rounded-xl bg-tint-light text-center border border-teal/15">
                <span className="block text-lg font-heading font-bold text-teal-dark">{nutrients.p}</span>
                <span className="text-[10px] uppercase font-bold text-mute">Phosphorus (mg)</span>
              </div>
              <div className="p-3 rounded-xl bg-tint-light text-center border border-teal/15">
                <span className="block text-lg font-heading font-bold text-teal-dark">{nutrients.na}</span>
                <span className="text-[10px] uppercase font-bold text-mute">Sodium (mg)</span>
              </div>
            </div>
          </div>

          {/* 7-Day Weight Sparkline */}
          {sparkline}

          {/* Collapsible Food Log Section (Hidden by Default, Expands on Click) */}
          <div className="p-5 sm:p-6 rounded-2xl bg-white border border-line shadow-sm space-y-3 transition-all">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-line">
              <button
                type="button"
                onClick={() => setShowFoodLog(!showFoodLog)}
                className="flex items-center gap-3 text-left group transition-all"
              >
                <div className="w-9 h-9 rounded-xl bg-tint text-teal group-hover:bg-teal group-hover:text-white transition-all flex items-center justify-center shrink-0 shadow-xs">
                  <Utensils size={18} />
                </div>
                <div>
                  <h4 className="font-heading font-bold text-ink text-sm flex items-center gap-2 group-hover:text-teal transition-colors">
                    Food &amp; Meal Intake Log
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-tint-light text-teal-dark border border-teal/20">
                      {mealItems.length} logged item{mealItems.length === 1 ? '' : 's'}
                    </span>
                  </h4>
                  <p className="text-[11px] text-mute flex items-center gap-1.5 mt-0.5">
                    <span>{showFoodLog ? 'Tap to hide food table' : 'Tap to expand itemized food table'}</span>
                    <span className="text-teal font-bold underline">
                      {showFoodLog ? '▴ Collapse' : '▾ Click to View Log'}
                    </span>
                  </p>
                </div>
              </button>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setShowFoodLog(!showFoodLog)}
                  className="px-3.5 py-1.5 rounded-xl border border-line bg-bg hover:bg-tint-light hover:border-teal/30 text-ink text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs"
                >
                  {showFoodLog ? <ChevronUp size={14} className="text-teal" /> : <ChevronDown size={14} className="text-teal" />}
                  {showFoodLog ? 'Hide Food Log' : 'View Food Log'}
                </button>

                <button
                  onClick={onOpenFoodModal}
                  className="px-3.5 py-1.5 rounded-xl bg-teal hover:bg-teal-dark text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1"
                >
                  <Plus size={13} />
                  Check &amp; Log Meal
                </button>
              </div>
            </div>

            {/* Complete Food Log Table: Only visible when showFoodLog is true */}
            {showFoodLog && (
              <div className="pt-2 animate-fadeSlideUp">
                {mealItems && mealItems.length > 0 ? (
                  <>
                    {/* Mobile Food Cards (< sm) */}
                    <div className="space-y-2.5 sm:hidden">
                      {mealItems.map((item, idx) => (
                        <div key={idx} className="p-3 rounded-xl border border-line bg-white shadow-2xs space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="font-bold text-ink text-xs capitalize block">{item.food}</span>
                              <span className="text-[10px] text-mute">{item.day}</span>
                            </div>
                            <span className="inline-block px-2.5 py-0.5 rounded-md bg-tint text-teal-dark font-bold text-[11px] border border-teal/20">
                              {item.qty}
                            </span>
                          </div>
                          <div className="grid grid-cols-4 gap-1 text-center bg-tint-light/60 p-2 rounded-lg border border-teal/10 text-[10px]">
                            <div>
                              <span className="text-mute block text-[9px] uppercase font-bold">K</span>
                              <span className="font-bold text-ink">{item.k} mg</span>
                            </div>
                            <div>
                              <span className="text-mute block text-[9px] uppercase font-bold">Fluid</span>
                              <span className="font-bold text-teal-dark">{item.fluid} mL</span>
                            </div>
                            <div>
                              <span className="text-mute block text-[9px] uppercase font-bold">P</span>
                              <span className="font-semibold text-mute">{item.p} mg</span>
                            </div>
                            <div>
                              <span className="text-mute block text-[9px] uppercase font-bold">Na</span>
                              <span className="font-semibold text-mute">{item.na} mg</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Tablet & Desktop Wide Table (>= sm) */}
                    <div className="hidden sm:block overflow-x-auto rounded-xl border border-line bg-white shadow-xs">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-gradient-to-r from-tint-light to-tint/60 text-teal-dark font-bold uppercase tracking-wider border-b border-line text-[10px]">
                          <tr>
                            <th className="py-2.5 px-3">Food Item</th>
                            <th className="py-2.5 px-3">Quantity &amp; Serving</th>
                            <th className="py-2.5 px-3 text-right">Potassium (K)</th>
                            <th className="py-2.5 px-3 text-right">Fluid</th>
                            <th className="py-2.5 px-3 text-right">Phosphorus (P)</th>
                            <th className="py-2.5 px-3 text-right">Sodium (Na)</th>
                            <th className="py-2.5 px-3 text-right">Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-line text-[11px]">
                          {mealItems.map((item, idx) => (
                            <tr key={idx} className="hover:bg-tint-light/40 transition-colors">
                              <td className="py-2.5 px-3 font-semibold text-ink capitalize">
                                {item.food}
                              </td>
                              <td className="py-2.5 px-3">
                                <span className="inline-block px-2.5 py-0.5 rounded-md bg-tint text-teal-dark font-bold text-[11px] border border-teal/20">
                                  {item.qty}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-right text-ink font-semibold">
                                {item.k} mg
                              </td>
                              <td className="py-2.5 px-3 text-right text-teal-dark font-semibold">
                                {item.fluid} mL
                              </td>
                              <td className="py-2.5 px-3 text-right text-mute">
                                {item.p} mg
                              </td>
                              <td className="py-2.5 px-3 text-right text-mute">
                                {item.na} mg
                              </td>
                              <td className="py-2.5 px-3 text-right text-mute font-medium">
                                {item.day}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-mute py-4 text-center">
                    No meals recorded today. Tap "Check &amp; Log Meal" to add what you ate.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* "What would lower my risk?" Interactive Counterfactual & Food-Swap Panel */}
      <WhatIfRiskPanel
        patientId={p.id}
        currentRisk={r}
        onRefresh={onRefresh}
      />
    </div>
  );
}
