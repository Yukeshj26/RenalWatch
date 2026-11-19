import React, { useState } from 'react';
import {
  UserPlus,
  Phone,
  Mail,
  ShieldCheck,
  Lock,
  Loader2,
  AlertCircle,
  Calendar,
  Activity,
} from 'lucide-react';

export default function RegisterModal({ onRegisterSuccess, onSwitchToLogin }) {
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('M');
  const [dryWeight, setDryWeight] = useState('');
  const [fluidLimit, setFluidLimit] = useState('1000');
  const [dialysisSchedule, setDialysisSchedule] = useState('Mon,Wed,Fri');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [language, setLanguage] = useState('en');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Direct 1-Step Registration
  async function handleRegister(e) {
    e.preventDefault();
    if (!name || !age || !dryWeight || !password) {
      setError('Please fill in all required fields (Name, Age, Dry Weight, Password).');
      return;
    }

    if (!phone.trim() && !email.trim()) {
      setError('Please provide at least a Mobile Number or Email Address for portal access.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          age: parseInt(age, 10),
          gender,
          dry_weight: parseFloat(dryWeight),
          fluid_limit: parseInt(fluidLimit, 10) || 1000,
          dialysis_schedule: dialysisSchedule,
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          password: password.trim(),
          language,
        }),
      });

      const text = await res.text();
      let data = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        throw new Error('Server connection error. Please try again.');
      }

      if (!res.ok) throw new Error(data.detail || 'Registration failed');
      onRegisterSuccess(data);
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleRegister} className="space-y-4">
      {/* Banner */}
      <div className="p-3.5 rounded-2xl bg-tint-light border border-teal/20 text-xs text-mute flex items-start gap-2.5">
        <ShieldCheck className="w-5 h-5 text-teal shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-teal-dark text-xs">
            Create Your Patient Profile
          </p>
          <p className="text-[11px] text-mute mt-0.5">
            Set your target dry weight and schedule to start monitoring fluid and potassium risk immediately.
          </p>
        </div>
      </div>

      {/* Name and Age */}
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <label htmlFor="reg-name" className="block text-xs font-bold uppercase tracking-wider text-mute mb-1">
            Full Name *
          </label>
          <input
            id="reg-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Ramesh Kumar"
            className="w-full px-3 py-2.5 sm:py-2 rounded-xl border border-line bg-bg focus:border-teal outline-none text-base sm:text-sm font-medium"
            required
          />
        </div>
        <div>
          <label htmlFor="reg-age" className="block text-xs font-bold uppercase tracking-wider text-mute mb-1">
            Age *
          </label>
          <input
            id="reg-age"
            type="number"
            min="10"
            max="110"
            inputMode="numeric"
            value={age}
            onChange={(e) => setAge(e.target.value)}
            placeholder="48"
            className="w-full px-3 py-2.5 sm:py-2 rounded-xl border border-line bg-bg focus:border-teal outline-none text-base sm:text-sm font-semibold"
            required
          />
        </div>
      </div>

      {/* Gender & Dialysis Schedule */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="reg-gender" className="block text-xs font-bold uppercase tracking-wider text-mute mb-1">
            Gender
          </label>
          <select
            id="reg-gender"
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            className="w-full px-3 py-2.5 sm:py-2 rounded-xl border border-line bg-bg focus:border-teal outline-none text-base sm:text-sm"
          >
            <option value="M">Male</option>
            <option value="F">Female</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div>
          <label htmlFor="reg-schedule" className="block text-xs font-bold uppercase tracking-wider text-mute mb-1">
            Dialysis Schedule
          </label>
          <select
            id="reg-schedule"
            value={dialysisSchedule}
            onChange={(e) => setDialysisSchedule(e.target.value)}
            className="w-full px-3 py-2.5 sm:py-2 rounded-xl border border-line bg-bg focus:border-teal outline-none text-base sm:text-sm"
          >
            <option value="Mon,Wed,Fri">Mon, Wed, Fri</option>
            <option value="Tue,Thu,Sat">Tue, Thu, Sat</option>
            <option value="Daily">Daily Peritoneal</option>
          </select>
        </div>
      </div>

      {/* Target Dry Weight & Daily Fluid Limit */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="reg-dryweight" className="block text-xs font-bold uppercase tracking-wider text-mute mb-1">
            Target Dry Weight (kg) *
          </label>
          <input
            id="reg-dryweight"
            type="number"
            step="0.1"
            min="30"
            max="150"
            inputMode="decimal"
            value={dryWeight}
            onChange={(e) => setDryWeight(e.target.value)}
            placeholder="e.g. 64.0"
            className="w-full px-3 py-2.5 sm:py-2 rounded-xl border border-line bg-bg focus:border-teal outline-none text-base sm:text-sm font-bold text-teal-dark"
            required
          />
        </div>

        <div>
          <label htmlFor="reg-fluidlimit" className="block text-xs font-bold uppercase tracking-wider text-mute mb-1">
            Daily Fluid Limit (mL)
          </label>
          <input
            id="reg-fluidlimit"
            type="number"
            min="400"
            max="2500"
            step="50"
            inputMode="numeric"
            value={fluidLimit}
            onChange={(e) => setFluidLimit(e.target.value)}
            placeholder="1000"
            className="w-full px-3 py-2.5 sm:py-2 rounded-xl border border-line bg-bg focus:border-teal outline-none text-base sm:text-sm font-semibold"
            required
          />
        </div>
      </div>

      {/* Contact Credentials (Mobile and/or Email) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor="reg-phone" className="block text-xs font-bold uppercase tracking-wider text-mute mb-1 flex items-center gap-1">
            <Phone size={12} className="text-teal" />
            Mobile Number *
          </label>
          <input
            id="reg-phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="e.g. 9876543210"
            className="w-full px-3 py-2.5 sm:py-2 rounded-xl border border-line bg-bg focus:border-teal outline-none text-base sm:text-sm font-medium"
          />
        </div>

        <div>
          <label htmlFor="reg-email" className="block text-xs font-bold uppercase tracking-wider text-mute mb-1 flex items-center gap-1">
            <Mail size={12} className="text-teal" />
            Email (Optional)
          </label>
          <input
            id="reg-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="e.g. name@gmail.com"
            className="w-full px-3 py-2.5 sm:py-2 rounded-xl border border-line bg-bg focus:border-teal outline-none text-base sm:text-sm font-medium"
          />
        </div>
      </div>

      {/* Password / PIN & Preferred Language */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="reg-password" className="block text-xs font-bold uppercase tracking-wider text-mute mb-1 flex items-center gap-1">
            <Lock size={12} className="text-teal" />
            PIN / Password *
          </label>
          <input
            id="reg-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Create PIN or password"
            className="w-full px-3 py-2.5 sm:py-2 rounded-xl border border-line bg-bg focus:border-teal outline-none text-base sm:text-sm font-medium"
            required
          />
        </div>

        <div>
          <label htmlFor="reg-lang" className="block text-xs font-bold uppercase tracking-wider text-mute mb-1">
            Preferred Language
          </label>
          <select
            id="reg-lang"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="w-full px-3 py-2.5 sm:py-2 rounded-xl border border-line bg-bg focus:border-teal outline-none text-base sm:text-sm font-medium"
          >
            <option value="en">English</option>
            <option value="ta">தமிழ் (Tamil)</option>
            <option value="hi">हिन्दी (Hindi)</option>
          </select>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="p-3 rounded-xl bg-risk-highBg border border-risk-high/30 text-risk-high text-xs flex items-center gap-2">
          <AlertCircle size={15} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Direct Registration Submit Button */}
      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 rounded-xl bg-teal hover:bg-teal-dark text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 touch-manipulation active:scale-[0.99] cursor-pointer mt-2"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Creating Patient Profile...
          </>
        ) : (
          <>
            <UserPlus className="w-4 h-4" />
            Register &amp; Open My Dashboard &rarr;
          </>
        )}
      </button>

      {/* Switch to Login */}
      <div className="text-center pt-2">
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="text-xs text-teal hover:underline font-semibold"
        >
          Already registered? Sign in here &rarr;
        </button>
      </div>
    </form>
  );
}
