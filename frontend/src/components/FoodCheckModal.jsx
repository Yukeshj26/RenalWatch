import React, { useState } from 'react';
import { Mic, MicOff, Utensils, AlertTriangle, ShieldAlert, CheckCircle2, Sparkles, Plus, Minus } from 'lucide-react';

export default function FoodCheckModal({ patients, selectedPatientId, currentPatient, onMealLogged }) {
  const [pid, setPid] = useState(currentPatient?.id || selectedPatientId || (patients[0] ? patients[0].id : ''));
  const [mealText, setMealText] = useState('');
  const [voiceLang, setVoiceLang] = useState('en-IN');
  const [isListening, setIsListening] = useState(false);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState({ k: 0, p: 0, na: 0, fluid: 0 });
  const [error, setError] = useState(null);

  function startVoice() {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. Please type your meal description.');
      return;
    }

    const recognizer = new SpeechRecognition();
    recognizer.lang = voiceLang;
    recognizer.interimResults = false;
    recognizer.maxAlternatives = 1;

    setIsListening(true);

    recognizer.onresult = event => {
      const transcript = event.results[0][0].transcript;
      setMealText(prev => (prev ? `${prev}, ${transcript}` : transcript));
    };

    recognizer.onspeechend = () => {
      recognizer.stop();
      setIsListening(false);
    };

    recognizer.onerror = () => {
      setIsListening(false);
    };

    recognizer.start();
  }

  async function handleAnalyze(e) {
    e.preventDefault();
    if (!pid || !mealText.trim()) return;

    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const res = await fetch(`/api/patients/${pid}/meals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: mealText.trim(),
          lang: voiceLang.split('-')[0] || 'en',
          save: true,
        }),
      });

      if (!res.ok) throw new Error('Failed to analyze meal');
      const data = await res.json();
      setResult(data);
      setItems(data.items || []);
      setTotal(data.total || { k: 0, p: 0, na: 0, fluid: 0 });
      onMealLogged();
    } catch (err) {
      setError(err.message || 'Error processing meal');
    } finally {
      setLoading(false);
    }
  }

  function adjustQty(index, delta) {
    const current = items[index];
    if (!current) return;
    const oldQty = current.qty;
    const newQty = Math.max(0.2, Math.round((oldQty + delta) * 10) / 10);
    if (newQty === oldQty) return;

    const ratio = newQty / oldQty;
    const updated = items.map((it, idx) => {
      if (idx !== index) return it;
      return {
        ...it,
        qty: newQty,
        k: Math.round(it.k * ratio),
        p: Math.round(it.p * ratio),
        na: Math.round(it.na * ratio),
        fluid: Math.round(it.fluid * ratio),
      };
    });

    setItems(updated);
    setTotal({
      k: updated.reduce((s, it) => s + it.k, 0),
      p: updated.reduce((s, it) => s + it.p, 0),
      na: updated.reduce((s, it) => s + it.na, 0),
      fluid: updated.reduce((s, it) => s + it.fluid, 0),
    });
  }

  return (
    <form onSubmit={handleAnalyze} className="space-y-5">
      {/* Patient selector / Locked Patient */}
      {currentPatient ? (
        <div className="p-3 rounded-xl bg-tint-light border border-teal/20 flex items-center justify-between">
          <div>
            <span className="text-[11px] uppercase font-bold text-mute block">Analyzing Meal For</span>
            <span className="text-sm font-bold text-teal-dark">{currentPatient.name}</span>
          </div>
          <span className="text-xs text-mute font-medium">Fluid Limit: {currentPatient.fluid_limit || 1000} mL</span>
        </div>
      ) : (
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-mute mb-1.5">
            Select Patient
          </label>
          <select
            value={pid}
            onChange={e => setPid(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border border-line bg-bg focus:border-teal text-sm outline-none transition-all"
            required
          >
            {patients.map(p => (
              <option key={p.id} value={p.id}>
                {p.name} (Age {p.age})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Meal text area with voice button */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-mute">
            Describe What Was Eaten or Drunk (Any Food or Cuisine)
          </label>
          <button
            type="button"
            onClick={startVoice}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
              isListening
                ? 'bg-risk-highBg border-risk-high text-risk-high animate-pulse'
                : 'bg-white border-teal/40 text-teal hover:bg-tint'
            }`}
          >
            {isListening ? <MicOff size={14} /> : <Mic size={14} />}
            {isListening ? 'Listening...' : 'Speak Meal'}
          </button>
        </div>

        <textarea
          rows={3}
          value={mealText}
          onChange={e => setMealText(e.target.value)}
          placeholder="e.g. sambar 1 cup, chick peas 100gm, egg 1, avocado 1, dragon fruit 150g"
          className="w-full px-3.5 py-2.5 rounded-xl border border-line bg-bg focus:border-teal outline-none text-sm resize-y"
          required
        />
        <p className="text-[11px] text-mute mt-1">
          💡 You can write in natural order (e.g. <em>"2 idlis"</em> or <em>"sambar 1 cup, egg 1, chick peas 100gm"</em>).
        </p>
      </div>

      {/* Controls row */}
      <div className="flex items-center justify-between pt-2 border-t border-line">
        <div className="flex items-center gap-1.5 text-xs text-mute">
          <span>Voice Dialect:</span>
          <select
            value={voiceLang}
            onChange={e => setVoiceLang(e.target.value)}
            className="px-2 py-1 rounded border border-line bg-bg text-xs outline-none"
          >
            <option value="en-IN">English (India)</option>
            <option value="ta-IN">தமிழ் (Tamil)</option>
            <option value="hi-IN">हिन्दी (Hindi)</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="px-5 py-2.5 rounded-xl bg-teal hover:bg-teal-dark text-white font-semibold text-sm shadow-sm transition-all disabled:opacity-50"
        >
          {loading ? 'Analyzing Food Composition...' : 'Analyze & Calculate Nutrients'}
        </button>
      </div>

      {/* Emergency Alert */}
      {result && result.safety && result.safety.emergency && (
        <div className="p-4 rounded-xl bg-risk-highBg border-2 border-risk-high text-risk-high flex items-start gap-3 animate-fadeSlideUp">
          <ShieldAlert size={22} className="shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-sm">Emergency Warning Triggered</h4>
            <p className="text-xs sm:text-sm mt-0.5">{result.safety.message}</p>
          </div>
        </div>
      )}

      {/* Nutrient Analysis Results */}
      {items && items.length > 0 && (
        <div className="p-5 rounded-2xl bg-tint-light border border-teal/20 space-y-4 animate-fadeSlideUp">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h4 className="font-heading font-bold text-teal-dark text-sm flex items-center gap-1.5">
                <Sparkles size={16} className="text-teal" /> Food &amp; Nutrient Estimation
              </h4>
              <span className="text-[11px] text-mute">
                Recognized {items.length} food item{items.length > 1 ? 's' : ''} with addressed quantities
              </span>
            </div>

            {result?.risk && (
              <span
                className={`text-xs font-bold px-2.5 py-0.5 rounded-full whitespace-nowrap self-start sm:self-auto ${
                  result.risk.level === 'high'
                    ? 'bg-risk-highBg text-risk-high'
                    : result.risk.level === 'medium'
                    ? 'bg-risk-medBg text-risk-med'
                    : 'bg-risk-lowBg text-risk-low'
                }`}
              >
                Today's Risk: {result.risk.level.toUpperCase()} ({result.risk.score}/100)
              </span>
            )}
          </div>

          {/* 4 Facts cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="bg-white p-3 rounded-xl border border-teal/15 text-center shadow-xs">
              <span className="block text-xl font-heading font-bold text-teal-dark">
                {total.k}
              </span>
              <span className="text-[10px] uppercase font-bold text-mute tracking-wider">
                Potassium (mg)
              </span>
            </div>
            <div className="bg-white p-3 rounded-xl border border-teal/15 text-center shadow-xs">
              <span className="block text-xl font-heading font-bold text-teal-dark">
                {total.p}
              </span>
              <span className="text-[10px] uppercase font-bold text-mute tracking-wider">
                Phosphorus (mg)
              </span>
            </div>
            <div className="bg-white p-3 rounded-xl border border-teal/15 text-center shadow-xs">
              <span className="block text-xl font-heading font-bold text-teal-dark">
                {total.na}
              </span>
              <span className="text-[10px] uppercase font-bold text-mute tracking-wider">
                Sodium (mg)
              </span>
            </div>
            <div className="bg-white p-3 rounded-xl border border-teal/15 text-center shadow-xs">
              <span className="block text-xl font-heading font-bold text-teal-dark">
                {total.fluid}
              </span>
              <span className="text-[10px] uppercase font-bold text-mute tracking-wider">
                Fluid (mL)
              </span>
            </div>
          </div>

          {/* Comprehensive Itemized Table */}
          <div className="bg-white rounded-xl border border-line overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-tint/70 text-mute font-bold uppercase tracking-wider border-b border-line">
                  <tr>
                    <th className="py-2.5 px-3">Food Item</th>
                    <th className="py-2.5 px-3">Quantity &amp; Serving</th>
                    <th className="py-2.5 px-3 text-right">Potassium</th>
                    <th className="py-2.5 px-3 text-right">Phosphorus</th>
                    <th className="py-2.5 px-3 text-right">Sodium</th>
                    <th className="py-2.5 px-3 text-right">Fluid</th>
                    <th className="py-2.5 px-3 text-center">Data Source</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-tint-light/40 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-ink">
                        {item.food}
                      </td>

                      {/* Quantity column with interactive adjustment steppers */}
                      <td className="py-2.5 px-3">
                        <div className="inline-flex items-center gap-1.5 bg-bg px-2 py-0.5 rounded-lg border border-line">
                          <button
                            type="button"
                            onClick={() => adjustQty(idx, -0.5)}
                            className="w-4 h-4 rounded flex items-center justify-center text-mute hover:text-ink hover:bg-white"
                            title="Decrease quantity"
                          >
                            <Minus size={11} />
                          </button>
                          <span className="font-semibold text-teal-dark min-w-[50px] text-center">
                            {item.unit}
                          </span>
                          <button
                            type="button"
                            onClick={() => adjustQty(idx, 0.5)}
                            className="w-4 h-4 rounded flex items-center justify-center text-mute hover:text-ink hover:bg-white"
                            title="Increase quantity"
                          >
                            <Plus size={11} />
                          </button>
                        </div>
                      </td>

                      <td className="py-2.5 px-3 text-right text-ink font-medium">
                        {item.k} mg
                      </td>
                      <td className="py-2.5 px-3 text-right text-mute">
                        {item.p} mg
                      </td>
                      <td className="py-2.5 px-3 text-right text-mute">
                        {item.na} mg
                      </td>
                      <td className="py-2.5 px-3 text-right text-ink font-medium">
                        {item.fluid} mL
                      </td>

                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            item.source === 'IFCT Verified'
                              ? 'bg-risk-lowBg text-risk-low'
                              : 'bg-risk-medBg text-risk-med'
                          }`}
                        >
                          {item.source}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Advisory warning */}
          {result?.advisory && (
            <div className="p-3 rounded-xl bg-risk-medBg border-l-4 border-risk-med text-risk-med text-xs font-medium leading-relaxed">
              {result.advisory}
            </div>
          )}
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
