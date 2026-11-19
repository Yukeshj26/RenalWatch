import React, { useState, useEffect } from 'react';
import { Activity, Utensils, AlertTriangle, ShieldAlert, CheckCircle2, Calendar, Phone, HeartPulse, Clock, Sparkles } from 'lucide-react';

export default function PersonalizedPatientPortal({
  patient,
  onOpenLogModal,
  onOpenFoodModal,
  onOpenSafetyModal,
  onRefresh,
}) {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!patient?.id) return;
    setLoading(true);
    fetch(`/api/patients/${patient.id}/dashboard`)
      .then(res => res.json())
      .then(d => {
        setDashboard(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
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

            <p className="text-xs sm:text-sm text-ink leading-relaxed">
              {r.level === 'high' ? (
                <span className="text-risk-high font-semibold">
                  ⚠️ Caution: You have elevated risk today ({r.summary}). Please limit fluids strictly and call your care team if you feel unwell.
                </span>
              ) : r.level === 'medium' ? (
                <span className="text-risk-med font-semibold">
                  ⚡ Moderate attention: {r.summary}. Keep within your daily fluid and potassium limits.
                </span>
              ) : (
                <span className="text-risk-low font-semibold">
                  ✅ Excellent! Your fluid and weight metrics are currently within your safe personal thresholds.
                </span>
              )}
            </p>

            {/* Contributing factors */}
            {r.factors && r.factors.length > 0 && (
              <div className="space-y-1.5 pt-2 border-t border-line/60">
                <span className="text-[11px] font-bold text-mute uppercase tracking-wider block">
                  Identified Health Factors Today:
                </span>
                <ul className="space-y-1">
                  {r.factors.map((f, idx) => (
                    <li
                      key={idx}
                      className="text-xs p-2 rounded-lg bg-bg border border-line flex items-center justify-between"
                    >
                      <span className="text-ink">{f.reason}</span>
                      <span className="font-bold text-teal-dark">+{f.points} pts</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

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
              <ShieldAlert size={16} /> Hard-Coded Emergency Warning
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

          {/* Recent Meals Recorded */}
          <div className="p-6 rounded-2xl bg-white border border-line shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-line">
              <h4 className="font-heading font-bold text-ink text-sm flex items-center gap-2">
                <Utensils size={15} className="text-teal" /> My Recent Logged Meals
              </h4>
              <button
                onClick={onOpenFoodModal}
                className="text-xs text-teal font-semibold hover:underline"
              >
                + Log Meal
              </button>
            </div>

            {dashboard.recent_meals && dashboard.recent_meals.length > 0 ? (
              <div className="space-y-2">
                {dashboard.recent_meals.slice(0, 3).map((m, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-bg border border-line flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-semibold text-ink capitalize block">{m.text}</span>
                      <span className="text-[11px] text-mute">{m.day}</span>
                    </div>
                    <div className="text-right text-[11px] text-mute space-x-2">
                      <span className="inline-block px-2 py-0.5 rounded bg-white border border-line font-medium text-ink">
                        K: {m.k} mg
                      </span>
                      <span className="inline-block px-2 py-0.5 rounded bg-white border border-line font-medium text-ink">
                        Fluid: {m.fluid} mL
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-mute py-4 text-center">
                No meals recorded today. Tap "Check Meal" to add what you ate.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
