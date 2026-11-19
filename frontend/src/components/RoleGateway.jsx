import React, { useState } from 'react';
import {
  User,
  Stethoscope,
  Sparkles,
  ShieldAlert,
  ArrowRight,
  Activity,
  Utensils,
  HeartPulse,
  Clock,
  UserCheck,
  CheckCircle2,
  Users,
  AlertTriangle,
  Lock,
} from 'lucide-react';

export default function RoleGateway({
  patients,
  onEnterAsPatient,
  onEnterAsClinician,
  onOpenLoginModal,
  onOpenRegisterModal,
  onOpenSafetyModal,
}) {
  const [selectedPatientId, setSelectedPatientId] = useState(patients[0]?.id || 1);
  const [loadingPatient, setLoadingPatient] = useState(false);
  const [loadingClinician, setLoadingClinician] = useState(false);

  async function handleQuickDemoPatientEnter() {
    setLoadingPatient(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'patient', patient_id: parseInt(selectedPatientId, 10) }),
      });
      const data = await res.json();
      if (res.ok) {
        onEnterAsPatient(data);
      }
    } catch (err) {
      console.error('Quick login failed:', err);
    } finally {
      setLoadingPatient(false);
    }
  }

  async function handleClinicianEnter() {
    setLoadingClinician(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'clinician' }),
      });
      const data = await res.json();
      if (res.ok) {
        onEnterAsClinician(data);
      }
    } catch (err) {
      console.error('Clinician login failed:', err);
    } finally {
      setLoadingClinician(false);
    }
  }

  return (
    <div className="pt-24 pb-20 px-4 sm:px-8 max-w-6xl mx-auto space-y-12 animate-fadeSlideUp">
      {/* Intro Hero Section */}
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-tint text-teal-dark text-xs font-semibold tracking-wide border border-teal/20 shadow-xs">
          <span className="w-2 h-2 rounded-full bg-teal animate-pulse" />
          RenalWatch Dialysis Care Ecosystem
        </div>

        <h1 className="text-3xl sm:text-5xl font-heading font-extrabold text-ink tracking-tight leading-tight">
          How would you like to enter{' '}
          <span className="text-teal underline decoration-teal/30 underline-offset-4">RenalWatch</span>?
        </h1>

        <p className="text-base sm:text-lg text-mute leading-relaxed">
          Choose your personalized portal to access targeted tools. Patients get private health tracking and diet guidance; clinicians get multi-patient cohort triage.
        </p>
      </div>

      {/* Two Portal Selection Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
        {/* CARD 1: PATIENT PORTAL */}
        <div className="relative rounded-3xl bg-white border-2 border-line hover:border-teal/50 shadow-lg hover:shadow-xl transition-all duration-300 p-7 sm:p-8 flex flex-col justify-between group">
          {/* Subtle top indicator */}
          <div className="absolute -top-3.5 left-7 px-3 py-1 rounded-full bg-teal text-white text-[11px] font-bold uppercase tracking-wider shadow-sm flex items-center gap-1.5">
            <User size={13} /> For Dialysis Patients
          </div>

          <div className="space-y-6 pt-2">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="w-14 h-14 rounded-2xl bg-tint flex items-center justify-center text-teal mb-4 group-hover:scale-105 transition-transform">
                  <HeartPulse size={28} />
                </div>
                <h2 className="text-2xl font-heading font-bold text-ink">
                  Patient Health Portal
                </h2>
                <p className="text-sm text-mute mt-1">
                  Private &amp; personalized daily self-management companion for individuals on hemodialysis.
                </p>
              </div>
            </div>

            {/* Feature List */}
            <div className="space-y-3 pt-2 border-t border-line">
              <div className="flex items-start gap-3 text-xs text-ink">
                <CheckCircle2 size={16} className="text-teal shrink-0 mt-0.5" />
                <div>
                  <strong className="font-semibold text-ink">Personal Vitals &amp; Weight Tracking:</strong>{' '}
                  <span className="text-mute">Daily weight logging vs dry weight to prevent fluid overload (IDWG%).</span>
                </div>
              </div>

              <div className="flex items-start gap-3 text-xs text-ink">
                <CheckCircle2 size={16} className="text-teal shrink-0 mt-0.5" />
                <div>
                  <strong className="font-semibold text-ink">Indian Food &amp; Nutrient Scanner:</strong>{' '}
                  <span className="text-mute">Deterministic IFCT potassium, phosphorus, sodium and fluid tracking.</span>
                </div>
              </div>

              <div className="flex items-start gap-3 text-xs text-ink">
                <CheckCircle2 size={16} className="text-teal shrink-0 mt-0.5" />
                <div>
                  <strong className="font-semibold text-ink">Dialysis Schedule Countdown:</strong>{' '}
                  <span className="text-mute">Live session countdown and personalized diet limits.</span>
                </div>
              </div>

              <div className="flex items-start gap-3 text-xs text-ink">
                <CheckCircle2 size={16} className="text-teal shrink-0 mt-0.5" />
                <div>
                  <strong className="font-semibold text-ink">Safety Firewall &amp; Red-Flag Warnings:</strong>{' '}
                  <span className="text-mute">Immediate instructions for chest pain or shortness of breath.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Area */}
          <div className="pt-6 mt-6 border-t border-line space-y-4">
            {/* Quick Demo Persona Dropdown */}
            <div className="p-3.5 rounded-2xl bg-tint-light border border-teal/20 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-teal-dark flex items-center gap-1.5">
                  <Sparkles size={14} className="text-teal" /> 1-Click Demo Patient Login
                </span>
                <span className="text-[10px] uppercase font-semibold text-mute">Instant Access</span>
              </div>
              <div className="flex gap-2">
                <select
                  value={selectedPatientId}
                  onChange={e => setSelectedPatientId(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl border border-line bg-white text-xs text-ink font-medium outline-none focus:border-teal"
                >
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.level.toUpperCase()} Risk · {p.score})
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleQuickDemoPatientEnter}
                  disabled={loadingPatient}
                  className="px-4 py-2 rounded-xl bg-teal hover:bg-teal-dark text-white text-xs font-semibold shadow-sm transition-all whitespace-nowrap flex items-center gap-1.5 disabled:opacity-50"
                >
                  {loadingPatient ? 'Entering...' : 'Enter Portal'}
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>

            {/* Standard Login / Register Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => onOpenLoginModal('patient')}
                className="w-full py-2.5 px-3 rounded-xl border border-teal/30 hover:border-teal hover:bg-tint text-teal-dark text-xs font-bold transition-all flex items-center justify-center gap-1.5"
              >
                <Lock size={14} />
                Sign In with Mobile / PIN
              </button>

              <button
                onClick={onOpenRegisterModal}
                className="w-full py-2.5 px-3 rounded-xl bg-white border border-line hover:border-teal/40 text-ink text-xs font-bold hover:bg-bg transition-all flex items-center justify-center gap-1.5"
              >
                <UserCheck size={14} className="text-teal" />
                Register New Patient
              </button>
            </div>
          </div>
        </div>

        {/* CARD 2: CLINICIAN PORTAL */}
        <div className="relative rounded-3xl bg-white border-2 border-line hover:border-teal/50 shadow-lg hover:shadow-xl transition-all duration-300 p-7 sm:p-8 flex flex-col justify-between group">
          {/* Subtle top indicator */}
          <div className="absolute -top-3.5 left-7 px-3 py-1 rounded-full bg-ink text-white text-[11px] font-bold uppercase tracking-wider shadow-sm flex items-center gap-1.5">
            <Stethoscope size={13} className="text-teal" /> For Care Team &amp; Nephrology
          </div>

          <div className="space-y-6 pt-2">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="w-14 h-14 rounded-2xl bg-teal/10 flex items-center justify-center text-teal-dark mb-4 group-hover:scale-105 transition-transform">
                  <Stethoscope size={28} />
                </div>
                <h2 className="text-2xl font-heading font-bold text-ink">
                  Clinician &amp; Care Team Portal
                </h2>
                <p className="text-sm text-mute mt-1">
                  Centralized multi-patient cohort triage &amp; early-warning surveillance for dialysis centers.
                </p>
              </div>
            </div>

            {/* Feature List */}
            <div className="space-y-3 pt-2 border-t border-line">
              <div className="flex items-start gap-3 text-xs text-ink">
                <CheckCircle2 size={16} className="text-teal shrink-0 mt-0.5" />
                <div>
                  <strong className="font-semibold text-ink">Ranked Urgency Queue (0–100):</strong>{' '}
                  <span className="text-mute">Sorts active patients by weight gain, potassium spikes, and missed sessions.</span>
                </div>
              </div>

              <div className="flex items-start gap-3 text-xs text-ink">
                <CheckCircle2 size={16} className="text-teal shrink-0 mt-0.5" />
                <div>
                  <strong className="font-semibold text-ink">Proactive Interdialytic Outreach:</strong>{' '}
                  <span className="text-mute">Provides one-line clinical reason for each flag to trigger timely phone check-ins.</span>
                </div>
              </div>

              <div className="flex items-start gap-3 text-xs text-ink">
                <CheckCircle2 size={16} className="text-teal shrink-0 mt-0.5" />
                <div>
                  <strong className="font-semibold text-ink">7-Day Sparklines &amp; Lab Histories:</strong>{' '}
                  <span className="text-mute">Inspect individual patient trajectories, BP records, and food logs.</span>
                </div>
              </div>

              <div className="flex items-start gap-3 text-xs text-ink">
                <CheckCircle2 size={16} className="text-teal shrink-0 mt-0.5" />
                <div>
                  <strong className="font-semibold text-ink">Dialysis Session Documentation:</strong>{' '}
                  <span className="text-mute">Log completed sessions, post-dialysis weight, and reset risk baselines.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Area */}
          <div className="pt-6 mt-6 border-t border-line space-y-4">
            <div className="p-3.5 rounded-2xl bg-bg border border-line text-xs text-mute flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Users size={16} className="text-teal" />
                <span>Monitoring <strong>{patients.length}</strong> active dialysis patients</span>
              </span>
              <span className="px-2 py-0.5 rounded-full bg-risk-highBg text-risk-high font-bold text-[11px]">
                {patients.filter(p => p.level === 'high').length} Urgent
              </span>
            </div>

            <button
              onClick={handleClinicianEnter}
              disabled={loadingClinician}
              className="w-full py-3.5 px-4 rounded-xl bg-teal hover:bg-teal-dark text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 group-hover:bg-teal-dark"
            >
              {loadingClinician ? (
                <span>Entering Clinician Portal...</span>
              ) : (
                <>
                  <span>Enter Clinician Triage Dashboard</span>
                  <ArrowRight size={17} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>

            <div className="text-center">
              <span className="text-[11px] text-mute">
                Authorized for Nephrologists, Dialysis Technicians, and Unit Staff Nurses
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Safety & Protocol Banner */}
      <div className="p-5 rounded-2xl bg-white border border-line shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-risk-highBg text-risk-high flex items-center justify-center shrink-0">
            <ShieldAlert size={20} />
          </div>
          <div>
            <h4 className="font-heading font-bold text-sm text-ink">
              Clinical Safety &amp; Emergency Escalation Protocol
            </h4>
            <p className="text-xs text-mute">
              Deterministic red-flag detector with zero hallucination. Severe breathlessness or chest pain triggers immediate emergency instructions.
            </p>
          </div>
        </div>

        <button
          onClick={onOpenSafetyModal}
          className="px-4 py-2 rounded-xl bg-tint text-teal-dark hover:bg-teal/15 text-xs font-bold transition-all whitespace-nowrap"
        >
          Review Safety Rules &rarr;
        </button>
      </div>
    </div>
  );
}
