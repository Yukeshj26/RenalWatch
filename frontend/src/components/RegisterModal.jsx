import React, { useState, useEffect } from 'react';
import {
  UserPlus,
  CheckCircle2,
  Phone,
  Mail,
  ShieldCheck,
  KeyRound,
  Loader2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

export default function RegisterModal({ onRegisterSuccess, onSwitchToLogin }) {
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('M');
  const [dryWeight, setDryWeight] = useState('');
  const [fluidLimit, setFluidLimit] = useState('1000');
  const [dialysisSchedule, setDialysisSchedule] = useState('Mon,Wed,Fri');
  const [contactType, setContactType] = useState('email'); // 'email' | 'phone'
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [language, setLanguage] = useState('en');

  // Real OTP state (Email SMTP / Mobile SMS)
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);
  const [otpMessage, setOtpMessage] = useState(null);
  const [devOtpCode, setDevOtpCode] = useState(null);
  const [otpError, setOtpError] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Countdown timer for OTP resend
  useEffect(() => {
    let interval = null;
    if (otpTimer > 0) {
      interval = setInterval(() => {
        setOtpTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [otpTimer]);

  // Request Email or SMS OTP
  async function handleSendOtp() {
    if (contactType === 'email') {
      const emailTrim = email.trim();
      if (!emailTrim || !emailTrim.includes('@') || !emailTrim.includes('.')) {
        setOtpError('Please enter a valid email address (e.g. yourname@gmail.com).');
        return;
      }
    } else {
      const rawDigits = phone.replace(/\D/g, '');
      if (!phone || rawDigits.length < 10) {
        setOtpError('Please enter a valid 10-digit mobile number first.');
        return;
      }
    }

    setOtpLoading(true);
    setOtpError(null);
    setOtpMessage(null);
    setDevOtpCode(null);

    const targetPayload = contactType === 'email'
      ? { email: email.trim(), name: name.trim() }
      : { phone: phone.trim(), name: name.trim() };

    try {
      const res = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(targetPayload),
      });
      const text = await res.text();
      let data = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        throw new Error('Server connection error. Please try again.');
      }
      if (!res.ok) throw new Error(data.detail || 'Failed to dispatch OTP');

      setOtpSent(true);
      setOtpTimer(60);
      if (data.dev_otp) {
        setDevOtpCode(data.dev_otp);
        setOtpMessage(data.message || 'Sandbox Mode: Live SMTP/SMS gateway not ready. Use code below.');
      } else {
        setOtpMessage(data.message || (contactType === 'email' ? 'Real OTP email dispatched! Check your inbox/spam.' : 'Real SMS OTP sent to your phone!'));
      }
    } catch (err) {
      setOtpError(err.message);
    } finally {
      setOtpLoading(false);
    }
  }

  // Verify entered OTP
  async function handleVerifyOtp() {
    if (!otp || otp.trim().length !== 6) {
      setOtpError('Please enter the complete 6-digit OTP code.');
      return;
    }

    setOtpVerifying(true);
    setOtpError(null);

    const targetPayload = contactType === 'email'
      ? { email: email.trim(), otp: otp.trim() }
      : { phone: phone.trim(), otp: otp.trim() };

    try {
      const res = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(targetPayload),
      });
      const text = await res.text();
      let data = {};
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        throw new Error('Server connection error. Please try again.');
      }
      if (!res.ok) throw new Error(data.detail || 'OTP verification failed');

      setOtpVerified(true);
      setOtpMessage(contactType === 'email' ? 'Email address verified successfully!' : 'Mobile number verified successfully!');
      setDevOtpCode(null);
    } catch (err) {
      setOtpError(err.message);
    } finally {
      setOtpVerifying(false);
    }
  }

  // Submit registration with verified contact
  async function handleRegister(e) {
    e.preventDefault();
    if (!name || !age || !dryWeight || !password) return;

    if (!otpVerified) {
      setOtpError(`Please verify your ${contactType === 'email' ? 'email address' : 'mobile number'} with the OTP code first.`);
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
          email: email.trim() || undefined,
          phone: phone.trim() || undefined,
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
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleRegister} className="space-y-4">
      <div className="p-3 rounded-xl bg-tint-light border border-teal/20 text-xs text-mute flex items-start gap-2">
        <ShieldCheck className="w-4 h-4 text-teal flex-shrink-0 mt-0.5" />
        <p className="font-semibold text-teal-dark">
          Patient Registration requires genuine mobile verification. Verified credentials ensure secure health tracking and critical risk alerts.
        </p>
      </div>

      {/* Name and Age */}
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <label className="block text-xs font-bold uppercase tracking-wider text-mute mb-1">
            Full Name *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Ramesh Kumar"
            className="w-full px-3 py-2.5 sm:py-2 rounded-xl border border-line bg-bg focus:border-teal outline-none text-base sm:text-sm font-medium"
            required
          />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-mute mb-1">
            Age *
          </label>
          <input
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

      {/* Gender & Schedule */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-mute mb-1">
            Gender
          </label>
          <select
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
          <label className="block text-xs font-bold uppercase tracking-wider text-mute mb-1">
            Dialysis Schedule
          </label>
          <select
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
          <label className="block text-xs font-bold uppercase tracking-wider text-mute mb-1">
            Target Dry Weight (kg) *
          </label>
          <input
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
          <label className="block text-xs font-bold uppercase tracking-wider text-mute mb-1">
            Daily Fluid Limit (mL)
          </label>
          <input
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

      {/* Contact Method & Real OTP Verification (Email SMTP or Mobile SMS) */}
      <div className="p-3.5 rounded-2xl border border-line bg-white shadow-xs space-y-3">
        {/* Verification Method Tabs */}
        <div className="grid grid-cols-2 p-1 bg-bg rounded-xl border border-line gap-1">
          <button
            type="button"
            onClick={() => {
              setContactType('email');
              setOtpVerified(false);
              setOtpSent(false);
              setOtpError(null);
              setOtpMessage(null);
            }}
            className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${
              contactType === 'email'
                ? 'bg-white text-teal shadow-2xs border border-teal/20'
                : 'text-mute hover:text-ink'
            }`}
          >
            <Mail size={13} />
            Email OTP (SMTP)
          </button>
          <button
            type="button"
            onClick={() => {
              setContactType('phone');
              setOtpVerified(false);
              setOtpSent(false);
              setOtpError(null);
              setOtpMessage(null);
            }}
            className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${
              contactType === 'phone'
                ? 'bg-white text-teal shadow-2xs border border-teal/20'
                : 'text-mute hover:text-ink'
            }`}
          >
            <Phone size={13} />
            Mobile OTP (SMS)
          </button>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-bold uppercase tracking-wider text-mute flex items-center gap-1.5">
              {contactType === 'email' ? (
                <>
                  <Mail className="w-3.5 h-3.5 text-teal" />
                  Email Address (Real SMTP OTP) *
                </>
              ) : (
                <>
                  <Phone className="w-3.5 h-3.5 text-teal" />
                  Mobile Number (SMS OTP) *
                </>
              )}
            </label>
            {otpVerified && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-teal bg-teal/10 px-2 py-0.5 rounded-full">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal" />
                Verified
              </span>
            )}
          </div>

          <div className="flex gap-2">
            {contactType === 'email' ? (
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (otpVerified) setOtpVerified(false);
                }}
                disabled={otpVerified}
                placeholder="e.g. yukeshj22@gmail.com"
                className={`flex-1 px-3 py-2.5 sm:py-2 rounded-xl border text-base sm:text-sm outline-none transition-all ${
                  otpVerified
                    ? 'bg-teal/5 border-teal text-teal-dark font-medium cursor-not-allowed'
                    : 'bg-bg border-line focus:border-teal'
                }`}
                required
              />
            ) : (
              <input
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  if (otpVerified) setOtpVerified(false);
                }}
                disabled={otpVerified}
                placeholder="e.g. 9876543210"
                className={`flex-1 px-3 py-2.5 sm:py-2 rounded-xl border text-base sm:text-sm outline-none transition-all ${
                  otpVerified
                    ? 'bg-teal/5 border-teal text-teal-dark font-medium cursor-not-allowed'
                    : 'bg-bg border-line focus:border-teal'
                }`}
                required
              />
            )}

            {!otpVerified && (
              <button
                type="button"
                onClick={handleSendOtp}
                disabled={otpLoading || otpTimer > 0}
                className="px-3.5 py-2 rounded-lg bg-teal hover:bg-teal-dark text-white font-semibold text-xs transition-all disabled:opacity-50 flex items-center gap-1.5 whitespace-nowrap"
              >
                {otpLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Sending...
                  </>
                ) : otpTimer > 0 ? (
                  `Resend in ${otpTimer}s`
                ) : otpSent ? (
                  'Resend OTP'
                ) : (
                  'Send OTP'
                )}
              </button>
            )}
          </div>
        </div>

        {/* OTP Input and Verification Row */}
        {otpSent && !otpVerified && (
          <div className="pt-2 border-t border-line/60 space-y-2">
            <label className="block text-xs font-semibold text-mute">
              Enter 6-digit verification code sent to {contactType === 'email' ? email : phone}:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                maxLength={6}
                inputMode="numeric"
                autoComplete="one-time-code"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="• • • • • •"
                className="flex-1 px-3 py-2.5 rounded-xl border border-line bg-bg focus:border-teal outline-none text-center font-mono tracking-widest text-lg font-bold"
              />
              <button
                type="button"
                onClick={handleVerifyOtp}
                disabled={otpVerifying || otp.length !== 6}
                className="px-4 py-2.5 rounded-xl bg-teal hover:bg-teal-dark text-white font-semibold text-xs transition-all disabled:opacity-50 flex items-center gap-1.5 whitespace-nowrap shadow-sm touch-manipulation active:scale-95"
              >
                {otpVerifying ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Verify OTP
                  </>
                )}
              </button>
            </div>

            {/* Sandbox Quick Fill if carrier keys are not configured */}
            {devOtpCode && (
              <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-800 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  Dev Sandbox OTP: <strong className="font-mono text-xs">{devOtpCode}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => setOtp(devOtpCode)}
                  className="px-2 py-0.5 rounded bg-amber-200 hover:bg-amber-300 font-semibold text-amber-900 transition-colors"
                >
                  Auto-fill
                </button>
              </div>
            )}
          </div>
        )}

        {/* Status / Alerts */}
        {otpMessage && (
          <p className="text-xs text-teal font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
            {otpMessage}
          </p>
        )}
        {otpError && (
          <p className="text-xs text-risk-high font-medium flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            {otpError}
          </p>
        )}
      </div>

      {/* Password & Language */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-mute mb-1">
            Portal PIN / Password *
          </label>
          <input
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Create password"
            className="w-full px-3 py-2.5 sm:py-2 rounded-xl border border-line bg-bg focus:border-teal outline-none text-base sm:text-sm font-medium"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-mute mb-1">
            Preferred Language
          </label>
          <select
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

      {/* Submission Button */}
      <button
        type="submit"
        disabled={loading || !otpVerified}
        className={`w-full py-2.5 rounded-xl font-semibold text-sm shadow-sm transition-all flex items-center justify-center gap-2 mt-2 ${
          otpVerified
            ? 'bg-teal hover:bg-teal-dark text-white cursor-pointer'
            : 'bg-line text-mute cursor-not-allowed opacity-75'
        }`}
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Creating Profile...
          </>
        ) : !otpVerified ? (
          <>
            <ShieldCheck className="w-4 h-4" />
            Verify Mobile Number with OTP to Register
          </>
        ) : (
          <>
            <UserPlus className="w-4 h-4" />
            Complete Registration & Open My Portal
          </>
        )}
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
        <div className="p-3 rounded-lg bg-risk-highBg text-risk-high text-xs flex items-center gap-1.5">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </form>
  );
}
