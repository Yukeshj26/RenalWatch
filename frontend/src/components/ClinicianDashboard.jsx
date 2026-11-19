import React, { useState } from 'react';
import { Filter, User, Calendar, AlertCircle, Clock } from 'lucide-react';

export default function ClinicianDashboard({ patients, onSelectPatient }) {
  const [filter, setFilter] = useState('all');
  const [showSilentFirst, setShowSilentFirst] = useState(false);

  const silentCount = patients.filter(p => p.is_silent).length;

  let filteredPatients = patients.filter(
    p => filter === 'all' || p.level === filter
  );

  if (showSilentFirst) {
    filteredPatients = [...filteredPatients].sort((a, b) => {
      // Prioritize silent patients first
      if (a.is_silent && !b.is_silent) return -1;
      if (!a.is_silent && b.is_silent) return 1;
      // Ranked using last known risk score descending
      if (b.score !== a.score) return b.score - a.score;
      // Then hours/days since last dialysis session descending
      const aHours = a.hours_since_session || (a.days_since_session * 24);
      const bHours = b.hours_since_session || (b.days_since_session * 24);
      return bHours - aHours;
    });
  }

  const stats = {
    total: patients.length,
    high: patients.filter(p => p.level === 'high').length,
    medium: patients.filter(p => p.level === 'medium').length,
    low: patients.filter(p => p.level === 'low').length,
  };

  return (
    <section id="dashboard" className="py-12 sm:py-16 px-4 sm:px-8 max-w-6xl mx-auto">
      {/* Header and Filter Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl sm:text-3xl font-heading font-bold text-ink">
            Clinician Triage Dashboard
          </h2>
          <p className="text-sm text-mute mt-1">
            Prioritized interdialytic patient queue sorted by urgency score
          </p>
        </div>

        {/* Filter chips */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all ${
              filter === 'all'
                ? 'bg-teal border-teal text-white shadow-sm'
                : 'bg-white border-line text-mute hover:border-teal/40'
            }`}
          >
            All ({stats.total})
          </button>
          <button
            onClick={() => setFilter('high')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all ${
              filter === 'high'
                ? 'bg-risk-high border-risk-high text-white shadow-sm'
                : 'bg-white border-line text-mute hover:border-risk-high/40'
            }`}
          >
            High Risk ({stats.high})
          </button>
          <button
            onClick={() => setFilter('medium')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all ${
              filter === 'medium'
                ? 'bg-risk-med border-risk-med text-white shadow-sm'
                : 'bg-white border-line text-mute hover:border-risk-med/40'
            }`}
          >
            Medium ({stats.medium})
          </button>
          <button
            onClick={() => setFilter('low')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all ${
              filter === 'low'
                ? 'bg-risk-low border-risk-low text-white shadow-sm'
                : 'bg-white border-line text-mute hover:border-risk-low/40'
            }`}
          >
            Low ({stats.low})
          </button>

          <div className="h-5 w-px bg-line mx-1 hidden sm:block" />

          {/* Silent Patients Filter Toggle */}
          <button
            type="button"
            onClick={() => setShowSilentFirst(prev => !prev)}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all ${
              showSilentFirst
                ? 'bg-amber-500 border-amber-600 text-white shadow-sm ring-2 ring-amber-300'
                : 'bg-white border-line text-ink hover:border-amber-400'
            }`}
            title="Escalate silent patients without recent check-ins"
          >
            <Clock size={13} className={showSilentFirst ? 'text-white' : 'text-amber-600'} />
            Show silent patients first
            {silentCount > 0 && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                  showSilentFirst ? 'bg-white text-amber-800' : 'bg-amber-100 text-amber-800'
                }`}
              >
                {silentCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Card List (Mobile-First View) */}
      <div className="space-y-3 md:hidden">
        {filteredPatients.length > 0 ? (
          filteredPatients.map(p => {
            const daysSinceText =
              p.days_since_session === 0
                ? 'Today'
                : p.days_since_session === 1
                ? '1 day ago'
                : `${p.days_since_session} days ago`;

            return (
              <div
                key={p.id}
                onClick={() => onSelectPatient(p.id)}
                className="p-4 rounded-2xl bg-white border border-line shadow-xs active:scale-[0.99] transition-all cursor-pointer space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-heading font-bold text-base text-ink">
                        {p.name}
                      </h3>
                      {p.is_silent && (
                        <span
                          className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs"
                          title={p.silent_reason || `No check-in for ${Math.round(p.hours_since_checkin)}h`}
                        >
                          <Clock size={11} className="text-amber-700 shrink-0" />
                          No check-in {p.hours_since_checkin ? `(${Math.round(p.hours_since_checkin)}h)` : ''}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-mute">
                      Age {p.age} {p.gender ? `· ${p.gender}` : ''}
                    </span>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap ${
                      p.level === 'high'
                        ? 'bg-risk-highBg text-risk-high animate-pulseRisk'
                        : p.level === 'medium'
                        ? 'bg-risk-medBg text-risk-med'
                        : 'bg-risk-lowBg text-risk-low'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                    {p.level.toUpperCase()} · {p.score}
                  </span>
                </div>

                {/* Primary Triage Reason Factors */}
                {p.factors && p.factors.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {p.factors.map((f, fIdx) => (
                      <span
                        key={fIdx}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-bg border border-line text-ink"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-teal shrink-0" />
                        <span>{f.reason}</span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-mute font-medium">All clinical metrics within safe baseline</p>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-line/60 text-xs text-mute">
                  <span className="flex items-center gap-1">
                    <Calendar size={13} className="text-teal" />
                    Last dialysis: <b className={p.days_since_session >= 3 ? 'text-risk-high' : 'text-teal-dark'}>{daysSinceText}</b>
                  </span>
                  <span className="text-teal font-bold flex items-center gap-1 text-[11px]">
                    Open Chart &rarr;
                  </span>
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-8 text-center bg-white rounded-2xl border border-line text-mute text-sm">
            No patients match the selected filter.
          </div>
        )}
      </div>

      {/* Main Table (Tablet & Desktop View) */}
      <div className="hidden md:block bg-white rounded-2xl shadow-md border border-line overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gradient-to-r from-tint-light to-tint/60 text-teal-dark text-xs uppercase font-bold tracking-wider border-b border-line">
                <th className="py-3.5 px-5">Patient</th>
                <th className="py-3.5 px-5">Risk Tier &amp; Score</th>
                <th className="py-3.5 px-5 hidden md:table-cell">Primary Triage Reason</th>
                <th className="py-3.5 px-5 text-right sm:text-left">Since Dialysis</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line text-sm">
              {filteredPatients.length > 0 ? (
                filteredPatients.map(p => {
                  const daysSinceText =
                    p.days_since_session === 0
                      ? 'Today'
                      : p.days_since_session === 1
                      ? '1 day ago'
                      : `${p.days_since_session} days ago`;

                  return (
                    <tr
                      key={p.id}
                      onClick={() => onSelectPatient(p.id)}
                      className="hover:bg-tint-light/70 cursor-pointer transition-colors group"
                    >
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-ink group-hover:text-teal transition-colors">
                            {p.name}
                          </span>
                          {p.is_silent && (
                            <span
                              className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs shrink-0"
                              title={p.silent_reason || `No check-in for ${Math.round(p.hours_since_checkin)}h`}
                            >
                              <Clock size={11} className="text-amber-700 shrink-0" />
                              No check-in {p.hours_since_checkin ? `(${Math.round(p.hours_since_checkin)}h)` : ''}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-mute mt-0.5">
                          Age {p.age} {p.gender ? `· ${p.gender}` : ''}
                        </div>
                      </td>

                      <td className="py-4 px-5">
                        <span
                          className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap ${
                            p.level === 'high'
                              ? 'bg-risk-highBg text-risk-high animate-pulseRisk'
                              : p.level === 'medium'
                              ? 'bg-risk-medBg text-risk-med'
                              : 'bg-risk-lowBg text-risk-low'
                          }`}
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-current" />
                          {p.level.toUpperCase()} · {p.score}
                        </span>
                      </td>

                      <td className="py-4 px-5 hidden md:table-cell max-w-lg">
                        {p.factors && p.factors.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {p.factors.map((f, fIdx) => (
                              <span
                                key={fIdx}
                                className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-bg border border-line text-ink shadow-2xs"
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-teal shrink-0" />
                                <span>{f.reason}</span>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-mute font-medium">All clinical metrics within safe baseline</span>
                        )}
                      </td>

                      <td className="py-4 px-5 text-right sm:text-left">
                        <span
                          className={`inline-block text-xs font-medium px-2.5 py-1 rounded-md ${
                            p.days_since_session >= 3
                              ? 'bg-risk-highBg text-risk-high font-semibold'
                              : 'bg-tint-light text-teal-dark'
                          }`}
                        >
                          {daysSinceText}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-mute text-sm">
                    No patients match the selected filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
