import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  TrendingDown,
  ArrowRight,
  ShieldAlert,
  AlertCircle,
  CheckCircle2,
  Utensils,
  Droplets,
  Heart,
  Activity,
  Calendar,
  Info,
  RefreshCw,
  ChevronRight,
} from 'lucide-react';

export default function WhatIfRiskPanel({ patientId, currentRisk, onRefresh }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  function fetchWhatIf() {
    if (!patientId) return;
    setLoading(true);
    setError(null);
    fetch(`/api/patients/${patientId}/what-if`)
      .then(async res => {
        if (!res.ok) throw new Error('Failed to fetch what-if analysis');
        const text = await res.text();
        return text ? JSON.parse(text) : null;
      })
      .then(d => {
        setData(d);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error in what-if fetch:', err);
        setError(err.message || 'Unable to load simulation');
        setLoading(false);
      });
  }

  useEffect(() => {
    fetchWhatIf();
  }, [patientId, onRefresh]);

  const categoryIcons = {
    'Dietary Potassium': <Utensils size={14} className="text-amber-600" />,
    'Fluid & Weight': <Droplets size={14} className="text-sky-600" />,
    'Dialysis Adherence': <Calendar size={14} className="text-emerald-600" />,
    'Blood Pressure': <Heart size={14} className="text-rose-600" />,
    'Symptoms': <Activity size={14} className="text-purple-600" />,
    'Fluid Allowance': <Droplets size={14} className="text-teal" />,
  };

  return (
    <div className="p-5 sm:p-7 rounded-3xl bg-white border border-teal/20 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-line">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal/10 text-teal-dark text-xs font-bold mb-1.5">
            <Sparkles size={14} className="text-teal" />
            Interactive Clinical Simulation
          </div>
          <h3 className="font-heading font-bold text-xl text-ink flex items-center gap-2">
            What Would Lower My Risk?
          </h3>
          <p className="text-xs sm:text-sm text-mute mt-0.5">
            Counterfactual projections showing how specific actions would reduce your risk score today
          </p>
        </div>

        <button
          type="button"
          onClick={fetchWhatIf}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-line bg-bg hover:bg-tint hover:border-teal/40 text-xs font-semibold text-teal-dark self-start sm:self-auto transition-all disabled:opacity-50"
          title="Recalculate simulations"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Simulating...' : 'Recalculate'}
        </button>
      </div>

      {/* Mandatory Care-Team Guidance Notice */}
      <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/80 text-amber-950 flex items-start gap-3 text-xs leading-relaxed">
        <Info size={16} className="text-amber-600 shrink-0 mt-0.5" />
        <div>
          <strong className="font-bold block text-amber-900">
            Educational simulations only — discuss with your care team
          </strong>
          <span>
            These calculations project potential risk reductions based on your current inputs. 
            Do not alter your dialysis schedule, dry weight goal, or fluid limits without consulting your nephrologist or renal care team.
          </span>
        </div>
      </div>

      {loading && !data ? (
        <div className="py-12 text-center text-mute space-y-2">
          <div className="inline-block w-6 h-6 border-2 border-teal border-t-transparent rounded-full animate-spin" />
          <p className="text-xs">Computing counterfactual risk pathways...</p>
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-risk-highBg border border-risk-high/30 text-risk-high text-xs">
          {error}
        </div>
      ) : data ? (
        <div className="space-y-6">
          {/* Action Impact Ranking Cards with Graphical Bars */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-mute block">
                Ranked Actions By Projected Risk Drop
              </span>
              <span className="text-[11px] text-mute font-medium">
                Current score: <b className="text-ink">{data.current_score}/100</b>
              </span>
            </div>

            {data.scenarios && data.scenarios.length > 0 ? (
              <div className="space-y-3">
                {data.scenarios.map((sc, idx) => {
                  // Percentage bar calculation relative to current score
                  const maxDrop = Math.max(1, data.current_score);
                  const barWidth = Math.min(100, Math.max(12, Math.round((sc.score_drop / maxDrop) * 100)));

                  return (
                    <div
                      key={sc.id || idx}
                      className="p-4 rounded-2xl border border-line bg-gradient-to-br from-white to-tint-light/20 shadow-2xs space-y-3 hover:border-teal/30 transition-all"
                    >
                      {/* Title & Score Drop Pill */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-white border border-line text-mute">
                              {categoryIcons[sc.category] || <Sparkles size={12} className="text-teal" />}
                              {sc.category}
                            </span>
                            <h4 className="font-heading font-bold text-sm text-ink">
                              {sc.title}
                            </h4>
                          </div>
                          <p className="text-xs text-mute">
                            {sc.description}
                          </p>
                        </div>

                        {/* Drop badge */}
                        <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
                          <span className="text-xs text-mute font-medium">
                            {sc.current_score} &rarr; <b className="text-ink">{sc.new_score}</b>
                          </span>
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 font-extrabold text-xs shadow-2xs">
                            <TrendingDown size={14} className="text-emerald-600" />
                            -{sc.score_drop} pts
                          </span>
                        </div>
                      </div>

                      {/* Visual Impact Bar */}
                      <div className="space-y-1">
                        <div className="h-2 w-full bg-bg rounded-full overflow-hidden border border-line/60">
                          <div
                            className="h-full bg-gradient-to-r from-teal to-emerald-500 rounded-full transition-all duration-500"
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] text-mute font-semibold">
                          <span>Current: {sc.current_value}</span>
                          <span className="text-teal-dark font-bold">Target: {sc.target_value}</span>
                        </div>
                      </div>

                      {/* Care team talking point */}
                      <div className="pt-2 border-t border-line/60 flex items-start gap-1.5 text-[11px] text-teal-dark">
                        <span className="font-bold text-mute shrink-0">Discuss with care team:</span>
                        <span>{sc.action_text}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-tint-light text-center text-xs text-teal-dark font-medium">
                All clinical metrics are currently in optimal target range! Maintaining your current regimen keeps your risk low.
              </div>
            )}
          </div>

          {/* Kidney-Friendly Food-Swap Suggester */}
          {data.food_swaps && data.food_swaps.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-line">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-ink block flex items-center gap-1.5">
                    <Utensils size={14} className="text-teal" />
                    Kidney-Friendly Food Swaps (Based on Logged Diet)
                  </span>
                  <span className="text-[11px] text-mute">
                    Low-potassium alternatives of the same culinary category to help keep potassium under 2,000 mg/day
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {data.food_swaps.map((sw, swIdx) => (
                  <div
                    key={swIdx}
                    className="p-4 rounded-2xl border-2 border-line/80 bg-white shadow-2xs space-y-3"
                  >
                    {/* Logged high-K food */}
                    <div className="flex items-center justify-between p-2.5 rounded-xl bg-amber-50/60 border border-amber-200">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-amber-800 tracking-wider block">
                          Logged Item ({sw.category})
                        </span>
                        <span className="text-sm font-bold text-ink">
                          {sw.logged_food}
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded-md bg-amber-200/80 text-amber-900 font-extrabold text-xs">
                        {sw.logged_k} mg K / {sw.unit}
                      </span>
                    </div>

                    {/* Alternatives list */}
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-mute block">
                        Recommended Lower-Potassium Swaps:
                      </span>

                      {sw.alternatives.map((alt, altIdx) => (
                        <div
                          key={altIdx}
                          className="p-2.5 rounded-xl border border-line bg-tint-light/40 flex items-center justify-between gap-2"
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded-full bg-white border border-teal/30 flex items-center justify-center text-teal shrink-0">
                              <CheckCircle2 size={12} />
                            </div>
                            <div>
                              <span className="text-xs font-bold text-teal-dark block">
                                {alt.food}
                              </span>
                              <span className="text-[10px] text-mute">
                                {alt.k} mg K per {alt.unit}
                              </span>
                            </div>
                          </div>

                          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 shrink-0">
                            Save {alt.k_saved} mg K
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Disclaimer reminder */}
                    <span className="text-[10px] text-mute block italic">
                      Always discuss serving sizes and dietary swaps with your renal dietitian.
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
