import React from 'react';
import { Activity, Utensils, AlertTriangle, ArrowRight } from 'lucide-react';

export default function Hero({ topPatients, onOpenModal, onSelectPatient }) {
  return (
    <section id="home" className="relative pt-24 pb-20 sm:pt-28 sm:pb-24 px-4 sm:px-8 bg-gradient-to-b from-tint-light to-bg overflow-hidden">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
        {/* Left Column: Heading and CTAs */}
        <div className="lg:col-span-7 space-y-5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-tint text-teal-dark text-xs font-semibold tracking-wide">
            <span className="w-2 h-2 rounded-full bg-teal animate-pulse" />
            Interdialytic Early-Warning Platform
          </div>

          <h1 className="text-3xl sm:text-5xl font-heading font-bold text-ink leading-tight">
            Spot fluid &amp; potassium trouble{' '}
            <em className="text-teal not-italic underline decoration-teal/30 underline-offset-4">before</em>{' '}
            the next dialysis session.
          </h1>

          <p className="text-base sm:text-lg text-mute max-w-xl">
            Patients log weight, blood pressure, and meals in a minute. Clinicians see who needs a call first — with the exact clinical reason in one line.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={() => onOpenModal('log')}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-teal hover:bg-teal-dark text-white font-semibold text-sm shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all"
            >
              <Activity size={17} />
              Log My Health
            </button>
            <button
              onClick={() => onOpenModal('food')}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white hover:bg-tint text-teal border border-teal font-semibold text-sm shadow-sm hover:-translate-y-0.5 transition-all"
            >
              <Utensils size={17} />
              Check a Meal
            </button>
          </div>

          <p className="text-xs text-mute/80 pt-1">
            * Demonstration uses 100% synthetic patient cohorts. Not an autonomous medical diagnostic device.
          </p>
        </div>

        {/* Right Column: Needs Attention Card */}
        <div className="lg:col-span-5">
          <div className="bg-white rounded-2xl p-6 shadow-xl border border-line">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-line">
              <div className="flex items-center gap-2 text-risk-high font-bold text-sm font-heading">
                <AlertTriangle size={18} />
                <span>Needs Attention Today</span>
              </div>
              <span className="text-xs text-mute font-medium">Top Priority</span>
            </div>

            <div className="space-y-3">
              {topPatients && topPatients.length > 0 ? (
                topPatients.map(p => (
                  <div
                    key={p.id}
                    onClick={() => onSelectPatient(p.id)}
                    className="p-3.5 rounded-xl border border-line hover:border-teal/50 hover:bg-tint-light/60 transition-all cursor-pointer flex items-center justify-between gap-3 group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-ink text-sm group-hover:text-teal transition-colors">
                          {p.name}
                        </span>
                        <span className="text-xs text-mute">Age {p.age}</span>
                      </div>
                      <p className="text-xs text-mute truncate mt-0.5" title={p.summary}>
                        {p.summary || 'Monitoring baseline'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap ${
                          p.level === 'high'
                            ? 'bg-risk-highBg text-risk-high animate-pulseRisk'
                            : p.level === 'medium'
                            ? 'bg-risk-medBg text-risk-med'
                            : 'bg-risk-lowBg text-risk-low'
                        }`}
                      >
                        {p.level.toUpperCase()} · {p.score}
                      </span>
                      <ArrowRight size={14} className="text-mute group-hover:text-teal group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-mute text-center py-6">No urgent patient flags.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Wave bottom decoration */}
      <svg
        className="absolute left-0 bottom-0 w-full h-10 sm:h-14 text-bg pointer-events-none"
        viewBox="0 0 1200 120"
        preserveAspectRatio="none"
        fill="currentColor"
      >
        <path d="M0,0 C150,90 350,-40 500,45 C650,130 900,10 1200,60 L1200,120 L0,120 Z" />
      </svg>
    </section>
  );
}
