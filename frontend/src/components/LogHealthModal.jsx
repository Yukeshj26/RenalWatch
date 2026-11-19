import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Sparkles,
  Bot,
  Cpu,
  ArrowRight,
  Info,
  Check,
} from 'lucide-react';

const SYMPTOMS_LIST = [
  { id: 'swelling', label: 'Swelling / Edema', emergency: false },
  { id: 'cramps', label: 'Muscle Cramps', emergency: false },
  { id: 'fatigue', label: 'Fatigue / Tiredness', emergency: false },
  { id: 'nausea', label: 'Nausea / Vomiting', emergency: false },
  { id: 'itching', label: 'Pruritus / Severe Itching', emergency: false },
  { id: 'breathless', label: '🚨 Breathlessness (Short of Breath)', emergency: true },
  { id: 'chest_pain', label: '🚨 Chest Pain / Tightness', emergency: true },
  { id: 'severe_weakness', label: '🚨 Severe Weakness / Dizziness', emergency: true },
];

const QUICK_NOTE_EXAMPLES = [
  { label: '💧 Swollen feet & breathless when lying flat', text: 'My feet are swollen and having trouble breathing when lying flat in bed' },
  { label: '🥥 Drank coconut water & hands tingling', text: 'I drank tender coconut water today and have tingling in fingers and heavy legs' },
  { label: '⚡ Fistula stopped buzzing', text: 'My fistula arm has stopped buzzing and vibration has stopped' },
  { label: '📉 Severe cramps & dizzy after dialysis', text: 'Severe leg cramps and feeling very dizzy with low blood pressure after dialysis' },
  { label: '🇮🇳 நெஞ்சு வலி மூச்சுத்திணறல் (Tamil)', text: 'நெஞ்சு வலி அதிகமாக உள்ளது மற்றும் மூச்சுத்திணறல் உள்ளது' },
];

export default function LogHealthModal({ patients, selectedPatientId, currentPatient, onLogSaved }) {
  const [pid, setPid] = useState(currentPatient?.id || selectedPatientId || (patients[0] ? patients[0].id : ''));
  const [weight, setWeight] = useState('');
  const [bpSys, setBpSys] = useState('');
  const [bpDia, setBpDia] = useState('');
  const [heartRate, setHeartRate] = useState('');
  const [symptoms, setSymptoms] = useState([]);
  const [note, setNote] = useState('');
  const [lang, setLang] = useState(currentPatient?.language || 'en');

  // AI Note Analysis state
  const [noteAnalysis, setNoteAnalysis] = useState(null);
  const [analyzingNote, setAnalyzingNote] = useState(false);
  const [ollamaInfo, setOllamaInfo] = useState({ available: false, model: null });
  const [autoCheckedMessage, setAutoCheckedMessage] = useState(null);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const debounceTimerRef = useRef(null);

  // Check Ollama status on mount
  useEffect(() => {
    fetch('/api/notes/ollama-status')
      .then(r => r.json())
      .then(d => {
        setOllamaInfo({
          available: d.available,
          model: d.default_model,
          models: d.models,
        });
      })
      .catch(() => {});
  }, []);

  // Sync if currentPatient changes
  useEffect(() => {
    if (currentPatient?.id) {
      setPid(currentPatient.id);
      if (currentPatient.current_weight) setWeight(String(currentPatient.current_weight));
      if (currentPatient.bp_sys) setBpSys(String(currentPatient.bp_sys));
      if (currentPatient.bp_dia) setBpDia(String(currentPatient.bp_dia));
      if (currentPatient.language) setLang(currentPatient.language);
    }
  }, [currentPatient]);

  // Pre-fill default weight if patient changes
  useEffect(() => {
    if (pid) {
      fetch(`/api/patients/${pid}`)
        .then(res => res.json())
        .then(data => {
          if (data && data.current_weight) {
            setWeight(String(data.current_weight));
            setBpSys(String(data.bp_sys || 120));
            setBpDia(String(data.bp_dia || 80));
          }
        })
        .catch(() => {});
    }
  }, [pid]);

  // Analyze Note with AI / Ollama or Clinical NLP
  const triggerNoteAnalysis = useCallback(async (textToAnalyze, language) => {
    const trimmed = textToAnalyze.trim();
    if (!trimmed || trimmed.length < 3) {
      setNoteAnalysis(null);
      return;
    }

    setAnalyzingNote(true);
    try {
      const res = await fetch('/api/notes/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: trimmed,
          lang: language || lang,
          patient_id: pid ? parseInt(pid, 10) : null,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setNoteAnalysis(data);
      }
    } catch (err) {
      console.error('Note analysis error:', err);
    } finally {
      setAnalyzingNote(false);
    }
  }, [lang, pid]);

  // Debounced auto-analyze on note change
  function handleNoteChange(val) {
    setNote(val);
    setAutoCheckedMessage(null);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!val.trim()) {
      setNoteAnalysis(null);
      return;
    }

    debounceTimerRef.current = setTimeout(() => {
      triggerNoteAnalysis(val, lang);
    }, 600);
  }

  function handleQuickExampleClick(exampleText) {
    setNote(exampleText);
    triggerNoteAnalysis(exampleText, lang);
  }

  function toggleSymptom(id) {
    setSymptoms(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  }

  // Auto-apply detected symptom tags into structured checkboxes
  function handleAutoCheckSymptoms() {
    if (!noteAnalysis || !noteAnalysis.auto_symptom_tags) return;
    const toAdd = noteAnalysis.auto_symptom_tags.filter(t => !symptoms.includes(t));
    if (toAdd.length > 0) {
      setSymptoms(prev => [...new Set([...prev, ...toAdd])]);
      setAutoCheckedMessage(`Auto-checked ${toAdd.length} detected symptom(s) above.`);
    } else {
      setAutoCheckedMessage('All detected symptoms are already checked above.');
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!pid || !weight) return;

    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const res = await fetch(`/api/patients/${pid}/logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weight: parseFloat(weight),
          bp_sys: parseInt(bpSys, 10),
          bp_dia: parseInt(bpDia, 10),
          heart_rate: parseInt(heartRate, 10) || 72,
          symptoms,
          note,
          lang,
        }),
      });

      if (!res.ok) throw new Error('Failed to save log');
      const data = await res.json();
      setResult(data);
      onLogSaved();
    } catch (err) {
      setError(err.message || 'Error saving log');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Patient selector / Locked Patient */}
      {currentPatient ? (
        <div className="p-3 rounded-xl bg-tint-light border border-teal/20 flex items-center justify-between">
          <div>
            <span className="text-[11px] uppercase font-bold text-mute block">Logging For</span>
            <span className="text-sm font-bold text-teal-dark">{currentPatient.name}</span>
          </div>
          <span className="text-xs text-mute font-medium">Dry Weight: {currentPatient.dry_weight} kg</span>
        </div>
      ) : (
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-mute mb-1.5">
            Select Patient
          </label>
          <select
            value={pid}
            onChange={e => setPid(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-line bg-bg focus:border-teal focus:ring-2 focus:ring-teal/20 text-sm outline-none transition-all"
            required
          >
            {patients.map(p => (
              <option key={p.id} value={p.id}>
                {p.name} (Age {p.age} {p.gender ? `· ${p.gender}` : ''})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Vitals row */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-mute mb-1.5">
          Vitals Recorded Today
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <span className="text-xs text-mute font-medium">Weight (kg)</span>
            <input
              type="number"
              step="0.1"
              min="30"
              max="160"
              value={weight}
              onChange={e => setWeight(e.target.value)}
              placeholder="e.g. 68.5"
              className="w-full mt-1 px-3 py-2 rounded-lg border border-line bg-bg focus:border-teal outline-none text-sm"
              required
            />
          </div>
          <div>
            <span className="text-xs text-mute font-medium">Top BP (Sys)</span>
            <input
              type="number"
              min="70"
              max="240"
              value={bpSys}
              onChange={e => setBpSys(e.target.value)}
              placeholder="e.g. 120"
              className="w-full mt-1 px-3 py-2 rounded-lg border border-line bg-bg focus:border-teal outline-none text-sm"
              required
            />
          </div>
          <div>
            <span className="text-xs text-mute font-medium">Bottom BP (Dia)</span>
            <input
              type="number"
              min="40"
              max="140"
              value={bpDia}
              onChange={e => setBpDia(e.target.value)}
              placeholder="e.g. 80"
              className="w-full mt-1 px-3 py-2 rounded-lg border border-line bg-bg focus:border-teal outline-none text-sm"
              required
            />
          </div>
          <div>
            <span className="text-xs text-mute font-medium">Heart Rate</span>
            <input
              type="number"
              min="40"
              max="200"
              value={heartRate}
              onChange={e => setHeartRate(e.target.value)}
              placeholder="e.g. 72"
              className="w-full mt-1 px-3 py-2 rounded-lg border border-line bg-bg focus:border-teal outline-none text-sm"
            />
          </div>
        </div>
      </div>

      {/* Symptoms list */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-xs font-bold uppercase tracking-wider text-mute">
            Symptoms Today
          </label>
          <span className="text-[11px] text-mute">
            {symptoms.length} selected
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {SYMPTOMS_LIST.map(s => {
            const active = symptoms.includes(s.id);
            return (
              <button
                type="button"
                key={s.id}
                onClick={() => toggleSymptom(s.id)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                  active
                    ? s.emergency
                      ? 'bg-risk-highBg border-risk-high text-risk-high font-bold shadow-xs'
                      : 'bg-tint border-teal text-teal-dark font-semibold shadow-xs'
                    : s.emergency
                    ? 'bg-white border-risk-high/30 text-risk-high hover:border-risk-high'
                    : 'bg-white border-line text-mute hover:border-teal/40'
                }`}
              >
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* FREE TEXT NOTE WITH AI / OLLAMA CLINICAL DETECTION */}
      <div className="space-y-2 pt-1 border-t border-line">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-bold uppercase tracking-wider text-ink flex items-center gap-1.5">
            <Sparkles size={14} className="text-teal" />
            Notes / Anything else to report?
          </label>

          {/* AI / Ollama Status Indicator */}
          <div className="flex items-center gap-2">
            {ollamaInfo.available ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                <Bot size={11} /> Ollama LLM Active ({ollamaInfo.model || 'local'})
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-tint text-teal-dark text-[10px] font-bold border border-teal/20" title="Ollama optional; deterministic Clinical NLP safety active">
                <Cpu size={11} /> Clinical NLP Active
              </span>
            )}

            {analyzingNote && (
              <span className="text-[11px] text-teal animate-pulse font-medium">
                Detecting...
              </span>
            )}
          </div>
        </div>

        <div className="relative">
          <textarea
            rows={3}
            value={note}
            onChange={e => handleNoteChange(e.target.value)}
            placeholder="Type anything in English, Tamil, or Hindi: e.g. feeling dizzy after dialysis, chest tightness, drank coconut water, legs swollen, fistula stopped buzzing..."
            className="w-full px-3.5 py-2.5 rounded-xl border border-line bg-bg focus:border-teal outline-none text-sm resize-y leading-relaxed"
          />

          {note.trim() && (
            <button
              type="button"
              onClick={() => triggerNoteAnalysis(note, lang)}
              disabled={analyzingNote}
              className="absolute right-2.5 bottom-3 px-3 py-1 rounded-lg bg-tint hover:bg-teal hover:text-white text-teal-dark text-xs font-bold border border-teal/30 transition-all flex items-center gap-1 shadow-xs"
            >
              <Sparkles size={12} />
              {analyzingNote ? 'Analyzing...' : 'Re-Analyze'}
            </button>
          )}
        </div>

        {/* Quick Example Presets to test detection */}
        <div className="space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-mute block">
            Click to test symptom scenarios:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_NOTE_EXAMPLES.map((ex, i) => (
              <button
                type="button"
                key={i}
                onClick={() => handleQuickExampleClick(ex.text)}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-white border border-line hover:border-teal/40 hover:bg-tint-light text-mute hover:text-ink transition-all text-left"
              >
                {ex.label}
              </button>
            ))}
          </div>
        </div>

        {/* RESPECTIVE RESULTS: DYNAMIC AI CLINICAL DETECTION CARD */}
        {noteAnalysis && note.trim().length > 0 && (
          <div
            className={`p-4 rounded-2xl border transition-all animate-fadeSlideUp space-y-3 ${
              noteAnalysis.urgency === 'critical'
                ? 'bg-risk-highBg/60 border-risk-high text-ink'
                : noteAnalysis.urgency === 'warning'
                ? 'bg-amber-50/70 border-amber-300 text-ink'
                : 'bg-tint-light border-teal/30 text-ink'
            }`}
          >
            {/* Header: Urgency & Engine */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                {noteAnalysis.urgency === 'critical' ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-risk-high text-white text-[11px] font-extrabold uppercase tracking-wide animate-pulseRisk">
                    <ShieldAlert size={14} /> Critical Red-Flag Detected
                  </span>
                ) : noteAnalysis.urgency === 'warning' ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500 text-white text-[11px] font-extrabold uppercase tracking-wide">
                    <AlertTriangle size={14} /> Clinical Alert / Warning
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-teal text-white text-[11px] font-extrabold uppercase tracking-wide">
                    <Info size={14} /> Clinical Note Observation
                  </span>
                )}
              </div>

              <span className="text-[10px] font-semibold text-mute shrink-0">
                Engine: {noteAnalysis.engine || 'Clinical NLP'}
              </span>
            </div>

            {/* Detected Symptoms Signals */}
            {noteAnalysis.detected_symptoms && noteAnalysis.detected_symptoms.length > 0 && (
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-mute block mb-1">
                  Detected Symptoms &amp; Signals:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {noteAnalysis.detected_symptoms.map((s, idx) => (
                    <span
                      key={idx}
                      className={`text-xs px-2.5 py-1 rounded-lg font-bold border shadow-2xs ${
                        noteAnalysis.urgency === 'critical'
                          ? 'bg-white border-risk-high/40 text-risk-high'
                          : noteAnalysis.urgency === 'warning'
                          ? 'bg-white border-amber-300 text-amber-800'
                          : 'bg-white border-teal/30 text-teal-dark'
                      }`}
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Auto-Check Button for Detected Symptoms */}
            {noteAnalysis.auto_symptom_tags && noteAnalysis.auto_symptom_tags.length > 0 && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleAutoCheckSymptoms}
                  className="px-3 py-1.5 rounded-xl bg-white hover:bg-tint text-teal-dark border border-teal/30 text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs"
                >
                  <CheckCircle2 size={14} className="text-teal" />
                  Auto-check detected symptoms in checkboxes above
                </button>
                {autoCheckedMessage && (
                  <span className="text-[11px] text-teal-dark font-semibold mt-1 block">
                    ✓ {autoCheckedMessage}
                  </span>
                )}
              </div>
            )}

            {/* Clinical Insight & Recommendation */}
            <div className="pt-2 border-t border-black/5 space-y-1.5 text-xs">
              <div>
                <strong className="text-ink font-semibold">Clinical Insight:</strong>{' '}
                <span className="text-mute">{noteAnalysis.clinical_insight}</span>
              </div>
              <div>
                <strong className="text-ink font-semibold">Recommended Action:</strong>{' '}
                <span className="text-teal-dark font-medium">{noteAnalysis.recommended_action}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer bar with language & submit */}
      <div className="flex items-center justify-between pt-3 border-t border-line">
        <div className="flex items-center gap-1.5 text-xs text-mute">
          <span>Language:</span>
          <select
            value={lang}
            onChange={e => {
              setLang(e.target.value);
              if (note.trim()) {
                triggerNoteAnalysis(note, e.target.value);
              }
            }}
            className="px-2 py-1 rounded border border-line bg-bg text-xs outline-none"
          >
            <option value="en">English</option>
            <option value="ta">தமிழ் (Tamil)</option>
            <option value="hi">हिन्दी (Hindi)</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="px-5 py-2.5 rounded-xl bg-teal hover:bg-teal-dark text-white font-semibold text-sm shadow-sm transition-all disabled:opacity-50"
        >
          {loading ? 'Analyzing...' : 'Save Daily Log'}
        </button>
      </div>

      {/* Emergency Alert Display after submit */}
      {result && result.safety && result.safety.emergency && (
        <div className="p-4 rounded-xl bg-risk-highBg border-2 border-risk-high text-risk-high flex items-start gap-3 animate-fadeSlideUp">
          <ShieldAlert size={22} className="shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-sm">Emergency Warning Triggered</h4>
            <p className="text-xs sm:text-sm mt-0.5 leading-relaxed">
              {result.safety.message}
            </p>
          </div>
        </div>
      )}

      {/* Regular Result Display after submit */}
      {result && result.risk && (
        <div className="p-4 rounded-xl bg-tint-light border border-teal/20 space-y-2 animate-fadeSlideUp">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-teal-dark uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 size={15} /> Log Saved Successfully
            </span>
            <span
              className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                result.risk.level === 'high'
                  ? 'bg-risk-highBg text-risk-high'
                  : result.risk.level === 'medium'
                  ? 'bg-risk-medBg text-risk-med'
                  : 'bg-risk-lowBg text-risk-low'
              }`}
            >
              {result.risk.level.toUpperCase()} · {result.risk.score}/100
            </span>
          </div>
          <p className="text-xs text-mute">
            <b>Key Clinical Observation:</b> {result.risk.summary}
          </p>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-lg bg-risk-highBg text-risk-high text-xs">
          {error}
        </div>
      )}
    </form>
  );
}
