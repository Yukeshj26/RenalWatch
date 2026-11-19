import React, { useState } from 'react';
import {
  Mic,
  MicOff,
  Utensils,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  Sparkles,
  Plus,
  Minus,
  Trash2,
} from 'lucide-react';

const SUGGESTED_FOODS = [
  'Sambar', 'Idli', 'Chapati', 'Rice', 'Dal', 'Dosa', 'Banana', 'Coconut water',
  'Tea', 'Coffee', 'Curd', 'Buttermilk', 'Curd rice', 'Pongal', 'Upma', 'Puri',
  'Egg', 'Egg white', 'Chicken curry', 'Fish curry', 'Mutton curry', 'Biryani',
  'Paneer', 'Apple', 'Orange', 'Mango', 'Papaya', 'Watermelon', 'Grapes',
  'Potato curry', 'Tomato', 'Cabbage', 'Cauliflower', 'Spinach', 'Okra',
  'Almonds', 'Cashews', 'Peanuts', 'Chickpeas', 'Rajma', 'Biscuits', 'Bread'
];

export default function FoodCheckModal({ patients, selectedPatientId, currentPatient, onMealLogged }) {
  const [pid, setPid] = useState(currentPatient?.id || selectedPatientId || (patients[0] ? patients[0].id : ''));
  
  // Table rows for adding food items with quantity
  const [foodRows, setFoodRows] = useState([
    { food: '', qty: '1', unit: 'bowl' },
    { food: '', qty: '2', unit: 'piece' },
  ]);

  const [voiceLang, setVoiceLang] = useState('en-IN');
  const [isListening, setIsListening] = useState(false);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState({ k: 0, p: 0, na: 0, fluid: 0 });
  const [error, setError] = useState(null);

  // Table row editing handlers
  function handleFoodChange(index, field, value) {
    setFoodRows(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  }

  function handleAddRow(presetFood = '', presetQty = '1', presetUnit = 'bowl') {
    setFoodRows(prev => [
      ...prev,
      { food: presetFood, qty: presetQty, unit: presetUnit },
    ]);
  }

  function handleRemoveRow(index) {
    if (foodRows.length <= 1) {
      setFoodRows([{ food: '', qty: '1', unit: 'bowl' }]);
      return;
    }
    setFoodRows(prev => prev.filter((_, i) => i !== index));
  }

  function startVoice() {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. Please enter food and quantity directly in the table.');
      return;
    }

    const recognizer = new SpeechRecognition();
    recognizer.lang = voiceLang;
    recognizer.interimResults = false;
    recognizer.maxAlternatives = 1;

    setIsListening(true);

    recognizer.onresult = event => {
      const transcript = event.results[0][0].transcript;
      const clauses = transcript.split(/[,+]|(?:\band\b)/i).map(s => s.trim()).filter(Boolean);
      if (clauses.length > 0) {
        setFoodRows(prev => {
          const newRows = clauses.map(c => {
            const m = c.match(/^(\d+(?:\.\d+)?)\s*([a-zA-Z]+)?\s+(.+)$/);
            if (m) {
              return { qty: m[1], unit: m[2] || 'serving', food: m[3] };
            }
            return { qty: '1', unit: 'serving', food: c };
          });
          const filteredPrev = prev.filter(r => r.food && r.food.trim());
          return [...filteredPrev, ...newRows];
        });
      }
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
    const validRows = foodRows.filter(r => r.food && r.food.trim());
    if (!pid || validRows.length === 0) {
      setError('Please enter at least one food item with quantity in the table');
      return;
    }

    const compiledText = validRows
      .map(r => `${r.qty || 1} ${r.unit || 'serving'} ${r.food.trim()}`)
      .join(', ');

    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const res = await fetch(`/api/patients/${pid}/meals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: compiledText,
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

      {/* Table Form for Adding Food with Quantity */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-ink block">
              Add Food &amp; Beverage Items Table
            </label>
            <span className="text-[11px] text-mute">
              Enter each item and quantity eaten. Autocomplete suggestions available.
            </span>
          </div>

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
            {isListening ? 'Listening...' : 'Voice Dictate'}
          </button>
        </div>

        {/* The Table Input Grid */}
        <div className="overflow-x-auto rounded-2xl border-2 border-line bg-white shadow-xs">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-gradient-to-r from-tint-light to-tint/60 text-teal-dark font-bold uppercase tracking-wider border-b border-line text-[10px]">
              <tr>
                <th className="py-2.5 px-3 w-10 text-center">#</th>
                <th className="py-2.5 px-3">Food Item / Dish</th>
                <th className="py-2.5 px-3 w-28">Quantity</th>
                <th className="py-2.5 px-3 w-36">Serving / Unit</th>
                <th className="py-2.5 px-3 w-16 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {foodRows.map((row, idx) => (
                <tr key={idx} className="hover:bg-tint-light/30 transition-colors">
                  <td className="py-2.5 px-3 text-center text-mute font-bold text-xs">
                    {idx + 1}
                  </td>

                  {/* Food Item Name Input with Datalist */}
                  <td className="py-2 px-3">
                    <input
                      type="text"
                      list="food-suggestions"
                      value={row.food}
                      onChange={e => handleFoodChange(idx, 'food', e.target.value)}
                      placeholder="e.g. Sambar, Idli, Chapati, Dal, Rice..."
                      className="w-full px-3 py-2 rounded-xl border border-line bg-bg focus:border-teal focus:bg-white outline-none text-xs sm:text-sm font-medium"
                      required
                    />
                  </td>

                  {/* Quantity Number Input */}
                  <td className="py-2 px-3">
                    <input
                      type="number"
                      step="any"
                      min="0.1"
                      value={row.qty}
                      onChange={e => handleFoodChange(idx, 'qty', e.target.value)}
                      placeholder="1"
                      className="w-full px-3 py-2 rounded-xl border border-line bg-bg focus:border-teal focus:bg-white outline-none text-xs sm:text-sm font-bold text-teal-dark text-center"
                      required
                    />
                  </td>

                  {/* Unit / Serving Dropdown */}
                  <td className="py-2 px-3">
                    <select
                      value={row.unit}
                      onChange={e => handleFoodChange(idx, 'unit', e.target.value)}
                      className="w-full px-2.5 py-2 rounded-xl border border-line bg-bg focus:border-teal focus:bg-white outline-none text-xs font-semibold"
                    >
                      <option value="bowl">bowl (200-250g)</option>
                      <option value="cup">cup (150-200g)</option>
                      <option value="piece">piece / item</option>
                      <option value="glass">glass (200-250mL)</option>
                      <option value="plate">plate / portion</option>
                      <option value="g">grams (g)</option>
                      <option value="mL">milliliters (mL)</option>
                      <option value="tbsp">tablespoon (tbsp)</option>
                      <option value="serving">serving</option>
                    </select>
                  </td>

                  {/* Remove Button */}
                  <td className="py-2 px-3 text-center">
                    <button
                      type="button"
                      onClick={() => handleRemoveRow(idx)}
                      disabled={foodRows.length === 1 && !row.food}
                      className="w-7 h-7 rounded-lg inline-flex items-center justify-center text-mute hover:text-risk-high hover:bg-risk-highBg transition-all disabled:opacity-30"
                      title="Remove row"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Add Row Button & Quick Presets */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-1">
          <button
            type="button"
            onClick={() => handleAddRow()}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-tint hover:bg-teal hover:text-white text-teal-dark border border-teal/30 text-xs font-bold transition-all shadow-xs"
          >
            <Plus size={14} />
            + Add Another Food Item
          </button>

          {/* Quick preset badges to instantly add common dialysis foods */}
          <div className="flex items-center gap-1 flex-wrap text-[11px] text-mute">
            <span className="font-semibold mr-1">Quick add:</span>
            {[
              { name: 'Sambar', unit: 'bowl' },
              { name: 'Idli', unit: 'piece', qty: '2' },
              { name: 'Chapati', unit: 'piece', qty: '2' },
              { name: 'Rice', unit: 'cup' },
              { name: 'Dal', unit: 'bowl' },
              { name: 'Banana', unit: 'piece' },
              { name: 'Coconut water', unit: 'glass' },
              { name: 'Tea / Chai', unit: 'cup' },
            ].map((p, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleAddRow(p.name, p.qty || '1', p.unit)}
                className="px-2 py-0.5 rounded-md bg-white border border-line hover:border-teal text-mute hover:text-ink transition-colors"
              >
                + {p.name}
              </button>
            ))}
          </div>
        </div>

        {/* Food Suggestions Datalist */}
        <datalist id="food-suggestions">
          {SUGGESTED_FOODS.map((f, i) => (
            <option key={i} value={f} />
          ))}
        </datalist>
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
          className="px-5 py-2.5 rounded-xl bg-teal hover:bg-teal-dark text-white font-semibold text-sm shadow-sm transition-all disabled:opacity-50 flex items-center gap-1.5"
        >
          <Sparkles size={15} />
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
