import React, { useState } from 'react';
import { Filter, User, Calendar, AlertCircle } from 'lucide-react';

export default function ClinicianDashboard({ patients, onSelectPatient }) {
  const [filter, setFilter] = useState('all');

  const filteredPatients = patients.filter(
    p => filter === 'all' || p.level === filter
  );

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
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl shadow-md border border-line overflow-hidden">
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
                        <div className="font-semibold text-ink group-hover:text-teal transition-colors">
                          {p.name}
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

                      <td className="py-4 px-5 hidden md:table-cell max-w-md">
                        <span className="text-ink line-clamp-2 text-xs sm:text-sm leading-relaxed" title={p.summary}>
                          {p.summary || 'No acute concerns reported'}
                        </span>
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
