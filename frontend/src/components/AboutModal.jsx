import React from 'react';
import { Layers, Database, Cpu, ShieldCheck, HeartHandshake } from 'lucide-react';

export default function AboutModal() {
  return (
    <div className="space-y-5 text-sm">
      <div>
        <h3 className="font-heading font-bold text-teal-dark text-lg mb-1 flex items-center gap-2">
          💧 About RenalWatch
        </h3>
        <p className="text-xs text-mute leading-relaxed">
          In end-stage renal disease (ESRD), the majority of emergency hospital admissions occur during the <b>interdialytic gap</b> (specifically the long 3-day weekend interval). Patients face fluid overload or potassium spikes with little or no early warning.
        </p>
      </div>

      <div>
        <h4 className="text-xs font-bold uppercase tracking-wider text-mute mb-2 flex items-center gap-1.5">
          <Layers size={14} className="text-teal" /> Five Architectural Pillars
        </h4>
        <div className="space-y-2 text-xs">
          <div className="p-2.5 rounded-lg bg-bg border border-line">
            <b className="text-ink">1. Patient Check-In Interface:</b> Simple 1-minute daily logging (weight, BP, heart rate, symptoms) with Web Speech API voice capture in English, Tamil, and Hindi.
          </div>
          <div className="p-2.5 rounded-lg bg-bg border border-line">
            <b className="text-ink">2. Food-to-Nutrient Engine:</b> Natural language meal parsing mapped against the Indian Food Composition Tables (IFCT) for potassium, phosphorus, sodium, and fluid. The AI parses language; the database computes numbers.
          </div>
          <div className="p-2.5 rounded-lg bg-bg border border-line">
            <b className="text-ink">3. Transparent Risk Engine:</b> 70% rule-based clinical scoring + 30% lightweight Logistic Regression model trained on synthetic clinical trajectories.
          </div>
          <div className="p-2.5 rounded-lg bg-bg border border-line">
            <b className="text-ink">4. Clinician Priority Dashboard:</b> Color-coded priority queue with a 1-line reason for each triage flag so care teams know who to call first.
          </div>
          <div className="p-2.5 rounded-lg bg-bg border border-line">
            <b className="text-ink">5. Hard-Coded Safety Firewall:</b> Zero AI hallucination risk for critical life-threatening emergencies.
          </div>
        </div>
      </div>

      <div className="p-3.5 rounded-xl bg-tint-light border border-teal/20 text-xs space-y-1 text-ink">
        <h5 className="font-bold text-teal-dark flex items-center gap-1.5">
          <Cpu size={14} /> Technology Stack
        </h5>
        <p className="text-mute">
          <b>Frontend:</b> React 18, Vite, Tailwind CSS, Lucide React, HTML5 Canvas VFX<br />
          <b>Backend:</b> Python 3.10+, FastAPI, SQLite (WAL mode), Scikit-Learn Logistic Regression<br />
          <b>Data:</b> 100% Synthetic clinically grounded cohorts
        </p>
      </div>

      <div className="p-3 rounded-lg bg-bg border border-line text-xs text-mute leading-relaxed">
        <b>Proof of Concept:</b> Designed for demonstration. Not evaluated on live patient populations. Proposes a prospective clinical pilot with partner hemodialysis centers as the next milestone.
      </div>
    </div>
  );
}
