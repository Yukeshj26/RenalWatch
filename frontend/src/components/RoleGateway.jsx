import React, { useState } from 'react';
import {
  User,
  ShieldAlert,
  ArrowRight,
  Phone,
  Lock,
  Mail,
  Building2,
  CheckCircle2,
  UserPlus,
  AlertCircle,
} from 'lucide-react';

export default function RoleGateway({
  onEnterAsPatient,
  onEnterAsClinician,
  onOpenRegisterModal,
  onOpenSafetyModal,
}) {
  // Active role tab: 'patient' | 'clinic'
  const [activeRole, setActiveRole] = useState('patient');

  // Patient Login Form state
  const [patientPhone, setPatientPhone] = useState('');
  const [patientPassword, setPatientPassword] = useState('');
  const [patientLoading, setPatientLoading] = useState(false);
  const [patientError, setPatientError] = useState(null);

  // Clinic Management Login Form state
  const [clinicStaffId, setClinicStaffId] = useState('');
  const [clinicPasscode, setClinicPasscode] = useState('');
  const [clinicLoading, setClinicLoading] = useState(false);
  const [clinicError, setClinicError] = useState(null);

  // Handle standard patient login with phone & password
  async function handlePatientPhoneSubmit(e) {
    e.preventDefault();
    if (!patientPhone.trim()) return;

    setPatientLoading(true);
    setPatientError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: 'patient',
          phone: patientPhone.trim(),
          password: patientPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Invalid patient phone or password');
      }
      onEnterAsPatient(data);
    } catch (err) {
      setPatientError(err.message || 'Login failed');
    } finally {
      setPatientLoading(false);
    }
  }

  // Handle clinic management login with staff ID & passcode
  async function handleClinicSubmit(e) {
    e.preventDefault();
    if (!clinicStaffId.trim()) return;

    setClinicLoading(true);
    setClinicError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: 'clinician',
          staff_id: clinicStaffId.trim(),
          password: clinicPasscode,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Invalid clinic credentials');
      }
      onEnterAsClinician(data);
    } catch (err) {
      setClinicError(err.message || 'Clinic login failed');
    } finally {
      setClinicLoading(false);
    }
  }

  return (
    <div className="pt-24 pb-20 px-4 sm:px-8 max-w-3xl mx-auto space-y-8 animate-fadeSlideUp">
      {/* Intro Header */}
      <div className="text-center max-w-xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-tint text-teal-dark text-xs font-semibold tracking-wide border border-teal/20 shadow-xs">
          <span className="w-2 h-2 rounded-full bg-teal animate-pulse" />
          RenalWatch Dialysis Care Ecosystem
        </div>

        <h1 className="text-3xl sm:text-4xl font-heading font-extrabold text-ink tracking-tight">
          Select Role &amp; Sign In
        </h1>

        <p className="text-sm sm:text-base text-mute">
          Choose whether you are signing in as a <strong>Dialysis Patient</strong> or for <strong>Clinic Management</strong> to enter your secure portal.
        </p>
      </div>

      {/* Main Authentication Card */}
      <div className="bg-white rounded-3xl border-2 border-line shadow-xl overflow-hidden">
        {/* Role Selection Tabs */}
        <div className="grid grid-cols-2 p-2 bg-tint-light border-b border-line gap-2">
          {/* Patient Role Button */}
          <button
            type="button"
            onClick={() => { setActiveRole('patient'); setPatientError(null); }}
            className={`flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-2xl text-xs sm:text-sm font-bold transition-all duration-200 ${
              activeRole === 'patient'
                ? 'bg-white text-teal shadow-md border border-teal/20'
                : 'text-mute hover:text-ink hover:bg-white/60'
            }`}
          >
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${activeRole === 'patient' ? 'bg-tint text-teal' : 'bg-line/40 text-mute'}`}>
              <User size={18} />
            </div>
            <div className="text-left">
              <span className="block leading-tight font-extrabold">Patient Portal</span>
              <span className="text-[10px] font-medium opacity-75 hidden sm:block">Personal Health Self-Monitoring</span>
            </div>
          </button>

          {/* Clinic Management Role Button */}
          <button
            type="button"
            onClick={() => { setActiveRole('clinic'); setClinicError(null); }}
            className={`flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-2xl text-xs sm:text-sm font-bold transition-all duration-200 ${
              activeRole === 'clinic'
                ? 'bg-white text-teal shadow-md border border-teal/20'
                : 'text-mute hover:text-ink hover:bg-white/60'
            }`}
          >
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${activeRole === 'clinic' ? 'bg-tint text-teal' : 'bg-line/40 text-mute'}`}>
              <Building2 size={18} />
            </div>
            <div className="text-left">
              <span className="block leading-tight font-extrabold">Clinic Management</span>
              <span className="text-[10px] font-medium opacity-75 hidden sm:block">Cohort Triage &amp; Dialysis Unit</span>
            </div>
          </button>
        </div>

        {/* Dynamic Form Area */}
        <div className="p-6 sm:p-8">
          {activeRole === 'patient' ? (
            /* ================= PATIENT CREDENTIALS FORM ================= */
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <div>
                  <h3 className="font-heading font-bold text-lg text-ink flex items-center gap-2">
                    <User size={20} className="text-teal" />
                    Patient Sign In
                  </h3>
                  <p className="text-xs text-mute mt-0.5">
                    Enter your registered phone number or name and password to access your portal.
                  </p>
                </div>
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-tint text-teal-dark uppercase tracking-wide">
                  Patient Role
                </span>
              </div>

              {/* Standard Patient Credentials Form */}
              <form onSubmit={handlePatientPhoneSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-mute mb-1">
                    Registered Mobile Number or Patient Name
                  </label>
                  <div className="relative">
                    <Phone size={16} className="absolute left-3.5 top-3.5 text-mute" />
                    <input
                      type="text"
                      value={patientPhone}
                      onChange={e => setPatientPhone(e.target.value)}
                      placeholder="Enter registered mobile number or name"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-line bg-bg focus:border-teal outline-none text-sm font-medium"
                      required
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold uppercase tracking-wider text-mute">
                      PIN or Password
                    </label>
                  </div>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-3.5 text-mute" />
                    <input
                      type="password"
                      value={patientPassword}
                      onChange={e => setPatientPassword(e.target.value)}
                      placeholder="Enter PIN / Password"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-line bg-bg focus:border-teal outline-none text-sm font-medium"
                      required
                    />
                  </div>
                </div>

                {patientError && (
                  <div className="p-3 rounded-xl bg-risk-highBg border border-risk-high/30 text-risk-high text-xs flex items-center gap-2">
                    <AlertCircle size={16} className="shrink-0" />
                    <span>{patientError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={patientLoading}
                  className="w-full py-3.5 rounded-xl bg-teal hover:bg-teal-dark text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {patientLoading ? 'Authenticating...' : 'Sign In to Patient Portal'}
                  <ArrowRight size={16} />
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={onOpenRegisterModal}
                    className="text-xs text-teal hover:underline font-semibold inline-flex items-center gap-1"
                  >
                    <UserPlus size={13} />
                    First time dialysis patient? Register your profile here &rarr;
                  </button>
                </div>
              </form>
            </div>
          ) : (
            /* ================= CLINIC MANAGEMENT CREDENTIALS FORM ================= */
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <div>
                  <h3 className="font-heading font-bold text-lg text-ink flex items-center gap-2">
                    <Building2 size={20} className="text-teal" />
                    Clinic Management Authentication
                  </h3>
                  <p className="text-xs text-mute mt-0.5">
                    Access the central hemodialysis triage queue, interdialytic alerts, and patient charts.
                  </p>
                </div>
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-ink text-white uppercase tracking-wide">
                  Clinic Staff
                </span>
              </div>

              {/* Clinic Credentials Form */}
              <form onSubmit={handleClinicSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-mute mb-1">
                    Staff ID / Official Hospital Email
                  </label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3.5 top-3.5 text-mute" />
                    <input
                      type="text"
                      value={clinicStaffId}
                      onChange={e => setClinicStaffId(e.target.value)}
                      placeholder="Enter staff ID or official email"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-line bg-bg focus:border-teal outline-none text-sm font-medium"
                      required
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold uppercase tracking-wider text-mute">
                      Clinic Access Key / Passcode
                    </label>
                  </div>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-3.5 text-mute" />
                    <input
                      type="password"
                      value={clinicPasscode}
                      onChange={e => setClinicPasscode(e.target.value)}
                      placeholder="Enter Passcode"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-line bg-bg focus:border-teal outline-none text-sm font-medium"
                      required
                    />
                  </div>
                </div>

                {clinicError && (
                  <div className="p-3 rounded-xl bg-risk-highBg border border-risk-high/30 text-risk-high text-xs flex items-center gap-2">
                    <AlertCircle size={16} className="shrink-0" />
                    <span>{clinicError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={clinicLoading}
                  className="w-full py-3.5 rounded-xl bg-teal hover:bg-teal-dark text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {clinicLoading ? 'Verifying...' : 'Log In to Clinic Management Dashboard'}
                  <ArrowRight size={16} />
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Feature Highlights Footer inside Card */}
        <div className="px-6 sm:px-8 py-4 bg-bg border-t border-line">
          <span className="text-[11px] font-bold uppercase tracking-wider text-mute block mb-2">
            {activeRole === 'patient' ? 'What you can do in Patient Portal:' : 'What you can do in Clinic Management:'}
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-mute">
            {activeRole === 'patient' ? (
              <>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-teal shrink-0" />
                  <span>Log weight vs dry weight (IDWG% auto-calculated)</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-teal shrink-0" />
                  <span>IFCT-verified Indian meal nutrient tracker</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-teal shrink-0" />
                  <span>Next dialysis session countdown &amp; fluid limits</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-teal shrink-0" />
                  <span>Real-time AI symptom &amp; signal detection in notes</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-teal shrink-0" />
                  <span>Ranked urgency queue (0–100 score) for telephone outreach</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-teal shrink-0" />
                  <span>Fluid overload &amp; potassium spike early detection</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-teal shrink-0" />
                  <span>7-day lab trend sparklines &amp; session completion logs</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-teal shrink-0" />
                  <span>Deterministic clinical safety rule firewall</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Safety & Protocol Banner at bottom */}
      <div className="p-4 rounded-2xl bg-white border border-line shadow-xs flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-risk-highBg text-risk-high flex items-center justify-center shrink-0">
            <ShieldAlert size={18} />
          </div>
          <div>
            <h4 className="font-heading font-bold text-xs sm:text-sm text-ink">
              Clinical Safety &amp; Emergency Escalation Protocol
            </h4>
            <p className="text-[11px] text-mute">
              Deterministic red-flag safety detector. Breathlessness or chest pain triggers immediate emergency instructions.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenSafetyModal}
          className="px-3.5 py-1.5 rounded-xl bg-tint text-teal-dark hover:bg-teal/15 text-xs font-bold transition-all whitespace-nowrap"
        >
          Safety Rules &rarr;
        </button>
      </div>
    </div>
  );
}
