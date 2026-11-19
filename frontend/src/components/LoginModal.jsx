import React, { useState } from 'react';
import { User, Stethoscope, Phone, Lock, ArrowRight, Sparkles } from 'lucide-react';

export default function LoginModal({ patients, onLoginSuccess, onSwitchToRegister, initialRole = 'patient' }) {
  const [role, setRole] = useState(initialRole);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [quickPatientId, setQuickPatientId] = useState(patients[0]?.id || 1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  React.useEffect(() => {
    if (initialRole) {
      setRole(initialRole);
    }
  }, [initialRole]);

  async function handlePhoneLogin(e) {
    e.preventDefault();
    if (!phone) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password, role: 'patient' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Login failed');
      onLoginSuccess(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleQuickPatientLogin() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'patient', patient_id: parseInt(quickPatientId, 10) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Login failed');
      onLoginSuccess(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleClinicianLogin() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'clinician' }),
      });
      const data = await res.json();
      onLoginSuccess(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Role Switcher Tabs */}
      <div className="grid grid-cols-2 p-1 bg-bg rounded-xl border border-line">
        <button
          type="button"
          onClick={() => { setRole('patient'); setError(null); }}
          className={`flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all ${
            role === 'patient'
              ? 'bg-white text-teal shadow-sm'
              : 'text-mute hover:text-ink'
          }`}
        >
          <User size={15} />
          Patient Portal
        </button>
        <button
          type="button"
          onClick={() => { setRole('clinician'); setError(null); }}
          className={`flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all ${
            role === 'clinician'
              ? 'bg-white text-teal shadow-sm'
              : 'text-mute hover:text-ink'
          }`}
        >
          <Stethoscope size={15} />
          Clinician Access
        </button>
      </div>

      {role === 'patient' ? (
        <div className="space-y-4">
          {/* Quick Demo 1-Click Login (Hackathon judge friendly) */}
          <div className="p-3.5 rounded-xl bg-tint-light border border-teal/20 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-teal-dark flex items-center gap-1.5">
                <Sparkles size={14} className="text-teal" /> 1-Click Quick Demo Login
              </span>
              <span className="text-[10px] text-mute uppercase font-semibold">Demo Mode</span>
            </div>
            <p className="text-xs text-mute">
              Select an existing patient profile to instantly load their personalized portal:
            </p>
            <div className="flex gap-2">
              <select
                value={quickPatientId}
                onChange={e => setQuickPatientId(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg border border-line bg-white text-xs outline-none focus:border-teal"
              >
                {patients.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name} (Risk: {p.level.toUpperCase()} · {p.score})
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleQuickPatientLogin}
                disabled={loading}
                className="px-4 py-2 rounded-lg bg-teal hover:bg-teal-dark text-white text-xs font-semibold shadow-sm transition-all whitespace-nowrap"
              >
                Enter Portal
              </button>
            </div>
          </div>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-line" />
            <span className="flex-shrink mx-3 text-xs text-mute uppercase font-medium">Or log in with phone</span>
            <div className="flex-grow border-t border-line" />
          </div>

          {/* Standard Phone & Password Form */}
          <form onSubmit={handlePhoneLogin} className="space-y-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-mute mb-1">
                Phone Number / Registered Mobile
              </label>
              <div className="relative">
                <Phone size={15} className="absolute left-3 top-3 text-mute" />
                <input
                  type="text"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="e.g. +91-9876500001 or Arun K"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-line bg-bg focus:border-teal outline-none text-sm"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-mute mb-1">
                PIN or Password
              </label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-3 text-mute" />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Default PIN: 1234"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-line bg-bg focus:border-teal outline-none text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-teal hover:bg-teal-dark text-white font-semibold text-sm shadow-sm transition-all disabled:opacity-50"
            >
              {loading ? 'Logging in...' : 'Sign In as Patient'}
            </button>
          </form>

          <div className="text-center pt-2">
            <button
              type="button"
              onClick={onSwitchToRegister}
              className="text-xs text-teal hover:underline font-semibold"
            >
              Don't have an account? Register your details here &rarr;
            </button>
          </div>
        </div>
      ) : (
        /* Clinician Login Tab */
        <div className="space-y-4 py-2">
          <div className="p-4 rounded-xl bg-bg border border-line text-xs text-mute space-y-2">
            <h4 className="font-heading font-bold text-ink text-sm flex items-center gap-1.5">
              <Stethoscope size={16} className="text-teal" /> Care Team &amp; Nephrology Triage
            </h4>
            <p>
              Log in to the central clinical dashboard to view all patients ranked by interdialytic urgency, monitor dry weight compliance, review nutrient loads, and trigger proactive outreach.
            </p>
          </div>

          <button
            type="button"
            onClick={handleClinicianLogin}
            disabled={loading}
            className="w-full py-3 rounded-xl bg-teal hover:bg-teal-dark text-white font-semibold text-sm shadow-md transition-all flex items-center justify-center gap-2"
          >
            Access All-Patient Monitoring Dashboard
            <ArrowRight size={16} />
          </button>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-lg bg-risk-highBg text-risk-high text-xs">
          {error}
        </div>
      )}
    </div>
  );
}
