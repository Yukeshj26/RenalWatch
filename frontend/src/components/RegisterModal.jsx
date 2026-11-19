import React, { useState } from 'react';
import { UserPlus, CheckCircle2 } from 'lucide-react';

export default function RegisterModal({ onRegisterSuccess, onSwitchToLogin }) {
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('M');
  const [dryWeight, setDryWeight] = useState('');
  const [fluidLimit, setFluidLimit] = useState('1000');
  const [dialysisSchedule, setDialysisSchedule] = useState('Mon,Wed,Fri');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('1234');
  const [language, setLanguage] = useState('en');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleRegister(e) {
    e.preventDefault();
    if (!name || !age || !dryWeight || !phone) return;

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
          phone: phone.trim(),
          password: password || '1234',
          language,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Registration failed');
      onRegisterSuccess(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleRegister} className="space-y-4">
      <div className="p-3 rounded-xl bg-tint-light border border-teal/20 text-xs text-mute">
        <p className="font-semibold text-teal-dark">
          Create your personal RenalWatch profile to start tracking your interdialytic weight, fluid limits, and meals.
        </p>
      </div>

      {/* Name and Age */}
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-mute mb-1">
            Full Name
          </label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Ramesh Kumar"
            className="w-full px-3 py-2 rounded-lg border border-line bg-bg focus:border-teal outline-none text-sm"
            required
          />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-mute mb-1">
            Age
          </label>
          <input
            type="number"
            min="10"
            max="110"
            value={age}
            onChange={e => setAge(e.target.value)}
            placeholder="48"
            className="w-full px-3 py-2 rounded-lg border border-line bg-bg focus:border-teal outline-none text-sm"
            required
          />
        </div>
      </div>

      {/* Gender & Schedule */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-mute mb-1">
            Gender
          </label>
          <select
            value={gender}
            onChange={e => setGender(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-line bg-bg focus:border-teal outline-none text-sm"
          >
            <option value="M">Male</option>
            <option value="F">Female</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-mute mb-1">
            Dialysis Schedule
          </label>
          <select
            value={dialysisSchedule}
            onChange={e => setDialysisSchedule(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-line bg-bg focus:border-teal outline-none text-sm"
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
          <label className="block text-xs font-bold uppercase tracking-wider text-mute mb-1">
            Target Dry Weight (kg)
          </label>
          <input
            type="number"
            step="0.1"
            min="30"
            max="150"
            value={dryWeight}
            onChange={e => setDryWeight(e.target.value)}
            placeholder="e.g. 64.0"
            className="w-full px-3 py-2 rounded-lg border border-line bg-bg focus:border-teal outline-none text-sm"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-mute mb-1">
            Daily Fluid Limit (mL)
          </label>
          <input
            type="number"
            min="400"
            max="2500"
            step="50"
            value={fluidLimit}
            onChange={e => setFluidLimit(e.target.value)}
            placeholder="1000"
            className="w-full px-3 py-2 rounded-lg border border-line bg-bg focus:border-teal outline-none text-sm"
            required
          />
        </div>
      </div>

      {/* Phone Number & Password */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-mute mb-1">
            Mobile Number
          </label>
          <input
            type="text"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="+91-9876543210"
            className="w-full px-3 py-2 rounded-lg border border-line bg-bg focus:border-teal outline-none text-sm"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-mute mb-1">
            Set PIN or Password
          </label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="e.g. 1234"
            className="w-full px-3 py-2 rounded-lg border border-line bg-bg focus:border-teal outline-none text-sm"
            required
          />
        </div>
      </div>

      {/* Language */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-mute mb-1">
          Preferred Language
        </label>
        <select
          value={language}
          onChange={e => setLanguage(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-line bg-bg focus:border-teal outline-none text-sm"
        >
          <option value="en">English</option>
          <option value="ta">தமிழ் (Tamil)</option>
          <option value="hi">हिन्दी (Hindi)</option>
        </select>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 rounded-xl bg-teal hover:bg-teal-dark text-white font-semibold text-sm shadow-sm transition-all disabled:opacity-50 mt-2"
      >
        {loading ? 'Creating Profile...' : 'Complete Registration & Open My Portal'}
      </button>

      <div className="text-center pt-2">
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="text-xs text-teal hover:underline font-semibold"
        >
          Already registered? Sign in here &rarr;
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-risk-highBg text-risk-high text-xs">
          {error}
        </div>
      )}
    </form>
  );
}
