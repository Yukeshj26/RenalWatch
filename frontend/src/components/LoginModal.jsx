import React, { useState } from 'react';
import { User, Building2, Phone, Lock, ArrowRight, Mail, AlertCircle, UserPlus } from 'lucide-react';

export default function LoginModal({ onLoginSuccess, onSwitchToRegister, initialRole = 'patient' }) {
  const [role, setRole] = useState(initialRole);
  
  // Patient credentials
  const [phone, setPhone] = useState('');
  const [patientPassword, setPatientPassword] = useState('');
  
  // Clinic credentials
  const [staffId, setStaffId] = useState('');
  const [clinicPasscode, setClinicPasscode] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  React.useEffect(() => {
    if (initialRole) {
      setRole(initialRole);
      setError(null);
    }
  }, [initialRole]);

  // Patient Login handler
  async function handlePatientLogin(e) {
    e.preventDefault();
    if (!phone.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: 'patient',
          phone: phone.trim(),
          password: patientPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Invalid patient phone or password');
      onLoginSuccess(data);
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  // Clinic Management Login handler
  async function handleClinicLogin(e) {
    e.preventDefault();
    if (!staffId.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: 'clinician',
          staff_id: staffId.trim(),
          password: clinicPasscode,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Invalid clinic staff ID or passcode');
      onLoginSuccess(data);
    } catch (err) {
      setError(err.message || 'Clinic login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Role Selection Tabs */}
      <div className="grid grid-cols-2 p-1.5 bg-bg rounded-2xl border border-line gap-1.5">
        <button
          type="button"
          onClick={() => { setRole('patient'); setError(null); }}
          className={`flex items-center justify-center gap-2 py-2.5 px-3 text-xs font-bold rounded-xl transition-all ${
            role === 'patient'
              ? 'bg-white text-teal shadow-xs border border-teal/20'
              : 'text-mute hover:text-ink'
          }`}
        >
          <User size={15} />
          Patient Portal
        </button>
        <button
          type="button"
          onClick={() => { setRole('clinician'); setError(null); }}
          className={`flex items-center justify-center gap-2 py-2.5 px-3 text-xs font-bold rounded-xl transition-all ${
            role === 'clinician'
              ? 'bg-white text-teal shadow-xs border border-teal/20'
              : 'text-mute hover:text-ink'
          }`}
        >
          <Building2 size={15} />
          Clinic Management
        </button>
      </div>

      {role === 'patient' ? (
        /* Patient Credentials Form */
        <form onSubmit={handlePatientLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-mute mb-1">
              Registered Phone Number or Patient Name
            </label>
            <div className="relative">
              <Phone size={15} className="absolute left-3.5 top-3.5 text-mute" />
              <input
                type="text"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="Enter registered mobile number or name"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-line bg-bg focus:border-teal outline-none text-sm font-medium"
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
              <Lock size={15} className="absolute left-3.5 top-3.5 text-mute" />
              <input
                type="password"
                value={patientPassword}
                onChange={e => setPatientPassword(e.target.value)}
                placeholder="Enter PIN / Password"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-line bg-bg focus:border-teal outline-none text-sm font-medium"
                required
              />
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-risk-highBg border border-risk-high/30 text-risk-high text-xs flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-teal hover:bg-teal-dark text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : 'Sign In to Patient Portal'}
            <ArrowRight size={16} />
          </button>

          <div className="text-center pt-2">
            <button
              type="button"
              onClick={onSwitchToRegister}
              className="text-xs text-teal hover:underline font-semibold inline-flex items-center gap-1"
            >
              <UserPlus size={13} />
              First time dialysis patient? Register your profile here &rarr;
            </button>
          </div>
        </form>
      ) : (
        /* Clinic Management Credentials Form */
        <form onSubmit={handleClinicLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-mute mb-1">
              Staff ID / Official Hospital Email
            </label>
            <div className="relative">
              <Mail size={15} className="absolute left-3.5 top-3.5 text-mute" />
              <input
                type="text"
                value={staffId}
                onChange={e => setStaffId(e.target.value)}
                placeholder="Enter staff ID or official email"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-line bg-bg focus:border-teal outline-none text-sm font-medium"
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
              <Lock size={15} className="absolute left-3.5 top-3.5 text-mute" />
              <input
                type="password"
                value={clinicPasscode}
                onChange={e => setClinicPasscode(e.target.value)}
                placeholder="Enter Passcode"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-line bg-bg focus:border-teal outline-none text-sm font-medium"
                required
              />
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-risk-highBg border border-risk-high/30 text-risk-high text-xs flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-teal hover:bg-teal-dark text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? 'Verifying...' : 'Log In to Clinic Management'}
            <ArrowRight size={16} />
          </button>
        </form>
      )}
    </div>
  );
}

