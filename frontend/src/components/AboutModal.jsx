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
          <Layers size={14} className="text-teal" /> Two Architectural Pillars
        </h4>
        <div className="space-y-2 text-xs">
          <div className="p-2.5 rounded-lg bg-bg border border-line">
            <b className="text-ink">1. Patient Check-In Interface:</b> Simple 1-minute daily logging (weight, BP, heart rate, symptoms) with Web Speech API voice capture in English, Tamil, and Hindi.
          </div>
          <div className="p-2.5 rounded-lg bg-bg border border-line">
            <b className="text-ink">2. Food-to-Nutrient Engine:</b> Natural language meal parsing mapped against the Indian Food Composition Tables (IFCT) for potassium, phosphorus, sodium, and fluid. The AI parses language; the database computes numbers.
          </div>
        </div>
      </div>
    </div>
  );
}
