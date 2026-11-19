/* ===================================================================
   RenalWatch — Application Client Logic
   Clean, responsive, interactive dialysis early-warning companion
   =================================================================== */

(function () {
  'use strict';

  // --- Utility & API Helpers ---
  const $ = selector => document.querySelector(selector);
  const $$ = selector => document.querySelectorAll(selector);

  async function api(path, body = null) {
    const options = body
      ? {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      : {};
    try {
      const res = await fetch('/api' + path, options);
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`API error ${res.status}: ${errText}`);
      }
      return await res.json();
    } catch (err) {
      console.error('API call failed:', path, err);
      throw err;
    }
  }

  const RISK_LABELS = {
    high: 'High Risk',
    medium: 'Medium Risk',
    low: 'Low Risk',
  };

  let patientList = [];
  let currentFilter = 'all';

  // --- Modal Manager ---
  const modalEl = $('#modal');
  const modalTitleEl = $('#modal-title');
  const modalBodyEl = $('#modal-body');

  function openModal(title, html) {
    if (!modalEl || !modalTitleEl || !modalBodyEl) return;
    modalTitleEl.textContent = title;
    modalBodyEl.innerHTML = html;
    modalEl.hidden = false;
    modalEl.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    if (!modalEl) return;
    modalEl.setAttribute('aria-hidden', 'true');
    modalEl.hidden = true;
    document.body.style.overflow = '';
  }

  // Helper for emergency alert rendering
  function renderEmergency(safety) {
    if (!safety || !safety.emergency) return '';
    return `<div class="alert" role="alert" aria-live="assertive">${escapeHtml(safety.message)}</div>`;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function patientOptions(selectedId = null) {
    return patientList
      .map(
        p =>
          `<option value="${p.id}" ${p.id === selectedId ? 'selected' : ''}>${escapeHtml(p.name)} (Age ${p.age}${p.gender ? ', ' + p.gender : ''})</option>`
      )
      .join('');
  }

  // --- Dashboard Data Loading ---
  async function loadDashboard() {
    try {
      patientList = await api('/patients');
    } catch (e) {
      console.error('Failed to load patients', e);
      return;
    }

    // Render Peek Card (Top 3 highest risk patients)
    const peekEl = $('#peek');
    if (peekEl) {
      const top3 = patientList.slice(0, 3);
      if (top3.length === 0) {
        peekEl.innerHTML = '<li class="empty-state">No patient records available</li>';
      } else {
        peekEl.innerHTML = top3
          .map(
            p => `
          <li data-patient-id="${p.id}" tabindex="0" role="button" aria-label="View ${escapeHtml(p.name)}">
            <div class="peek-info">
              <b>${escapeHtml(p.name)}</b>
              <small>${escapeHtml(p.summary || 'Monitoring stable')}</small>
            </div>
            <span class="badge ${p.level}">${RISK_LABELS[p.level] || p.level} · ${p.score}</span>
          </li>
        `
          )
          .join('');
      }
    }

    // Render Main Table
    renderTable();
  }

  function renderTable() {
    const rowsEl = $('#rows');
    if (!rowsEl) return;

    const filtered = patientList.filter(
      p => currentFilter === 'all' || p.level === currentFilter
    );

    if (filtered.length === 0) {
      rowsEl.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:32px; color:var(--mute);">No patients found in this risk category.</td></tr>`;
      return;
    }

    rowsEl.innerHTML = filtered
      .map((p, index) => {
        const daysText =
          p.days_since_session === 1
            ? '1 day ago'
            : p.days_since_session === 0
            ? 'Today'
            : `${p.days_since_session} days ago`;

        return `
        <tr data-patient-id="${p.id}" tabindex="0" role="button" style="animation: fadeSlideUp 0.3s ease-out both; animation-delay: ${index * 35}ms;">
          <td>
            <div class="patient-cell">
              <b>${escapeHtml(p.name)}</b>
              <small>Age ${p.age}${p.gender ? ' · ' + p.gender : ''}</small>
            </div>
          </td>
          <td>
            <span class="badge ${p.level}">
              ${p.level.toUpperCase()} · ${p.score}
            </span>
          </td>
          <td class="why-cell">
            <span class="summary-text" title="${escapeHtml(p.summary)}">${escapeHtml(p.summary)}</span>
          </td>
          <td class="session-cell">
            <span class="days-badge ${p.days_since_session >= 3 ? 'overdue' : ''}">
              ${daysText}
            </span>
          </td>
        </tr>
      `;
      })
      .join('');
  }

  // --- Modal: Log My Health ---
  function openLogModal(preselectedId = null) {
    const symptomsList = [
      { id: 'swelling', label: 'Swelling / Edema', emergency: false },
      { id: 'cramps', label: 'Muscle Cramps', emergency: false },
      { id: 'fatigue', label: 'Fatigue / Tiredness', emergency: false },
      { id: 'nausea', label: 'Nausea / Vomiting', emergency: false },
      { id: 'itching', label: 'Severe Itching (Pruritus)', emergency: false },
      { id: 'breathless', label: '🚨 Breathlessness (Short of Breath)', emergency: true },
      { id: 'chest_pain', label: '🚨 Chest Pain / Tightness', emergency: true },
      { id: 'severe_weakness', label: '🚨 Severe Weakness / Dizziness', emergency: true },
    ];

    const html = `
      <form id="log-form" onsubmit="return false;">
        <label for="log-who">Select Patient</label>
        <select id="log-who" required>
          ${patientOptions(preselectedId)}
        </select>

        <label style="margin-top:16px;">Vitals Today</label>
        <div class="input-row">
          <div>
            <label for="log-weight">Weight (kg)</label>
            <input id="log-weight" type="number" step="0.1" min="30" max="150" placeholder="e.g. 68.5" required>
          </div>
          <div>
            <label for="log-bps">BP Top (Systolic)</label>
            <input id="log-bps" type="number" min="70" max="240" placeholder="120" required>
          </div>
          <div>
            <label for="log-bpd">BP Bottom (Diastolic)</label>
            <input id="log-bpd" type="number" min="40" max="140" placeholder="80" required>
          </div>
          <div>
            <label for="log-hr">Heart Rate</label>
            <input id="log-hr" type="number" min="40" max="200" placeholder="72">
          </div>
        </div>

        <label style="margin-top:16px;">Symptoms Noticed Today</label>
        <div class="checks">
          ${symptomsList
            .map(
              s => `
            <label class="${s.emergency ? 'emergency-pill' : ''}">
              <input type="checkbox" name="symptom" value="${s.id}">
              <span>${s.label}</span>
            </label>
          `
            )
            .join('')}
        </div>

        <label for="log-note" style="margin-top:16px;">Anything else you want to report? (English, Tamil or Hindi)</label>
        <textarea id="log-note" rows="2" placeholder="e.g. slight headache, missed afternoon medication, felt unsteady..."></textarea>

        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:20px;">
          <div style="font-size:0.82rem; color:var(--mute);">
            Language:
            <select id="log-lang" style="width:auto; display:inline-block; padding:4px 8px; margin-left:6px;">
              <option value="en">English</option>
              <option value="ta">தமிழ் (Tamil)</option>
              <option value="hi">हिन्दी (Hindi)</option>
            </select>
          </div>
          <button type="submit" class="btn btn-primary" id="btn-save-log">
            Save Today's Log
          </button>
        </div>

        <div id="log-output" style="margin-top:16px;"></div>
      </form>
    `;

    openModal('Log Daily Health Data', html);

    // Autofill weight if patient selected
    const whoSelect = $('#log-who');
    if (whoSelect) {
      whoSelect.addEventListener('change', async () => {
        try {
          const p = await api(`/patients/${whoSelect.value}`);
          if (p && p.current_weight) {
            $('#log-weight').value = p.current_weight;
            $('#log-bps').value = p.bp_sys || 120;
            $('#log-bpd').value = p.bp_dia || 80;
          }
        } catch (_) {}
      });
      // trigger once
      whoSelect.dispatchEvent(new Event('change'));
    }

    const form = $('#log-form');
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const pid = $('#log-who').value;
      const weight = parseFloat($('#log-weight').value);
      const bp_sys = parseInt($('#log-bps').value, 10);
      const bp_dia = parseInt($('#log-bpd').value, 10);
      const heart_rate = parseInt($('#log-hr').value, 10) || 72;
      const note = $('#log-note').value;
      const lang = $('#log-lang').value;
      const checkedSymptoms = Array.from(
        $$('input[name="symptom"]:checked')
      ).map(cb => cb.value);

      const out = $('#log-output');
      out.innerHTML = '<p style="color:var(--mute);">Saving log and running safety analysis...</p>';

      try {
        const res = await api(`/patients/${pid}/logs`, {
          weight,
          bp_sys,
          bp_dia,
          heart_rate,
          symptoms: checkedSymptoms,
          note,
          lang,
        });

        let outHtml = renderEmergency(res.safety);
        if (res.risk) {
          outHtml += `
            <div class="result">
              <h4 style="margin-bottom:6px; color:var(--ink);">Log Saved Successfully</h4>
              <p>Updated Risk: <span class="badge ${res.risk.level}">${RISK_LABELS[res.risk.level]} (${res.risk.score}/100)</span></p>
              <p style="font-size:0.88rem; color:var(--mute);"><b>Key Observation:</b> ${escapeHtml(res.risk.summary)}</p>
            </div>
          `;
        }
        out.innerHTML = outHtml;
        loadDashboard();
      } catch (err) {
        out.innerHTML = `<div class="alert">Failed to record log. Please try again.</div>`;
      }
    });
  }

  // --- Modal: Food Check ---
  function openFoodModal(preselectedId = null) {
    const html = `
      <form id="food-form" onsubmit="return false;">
        <label for="food-who">Select Patient</label>
        <select id="food-who" required>
          ${patientOptions(preselectedId)}
        </select>

        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:16px;">
          <label for="food-text" style="margin:0;">Describe Meal or Drinks</label>
          <button type="button" class="mic-btn" id="food-mic" aria-label="Start voice input">
            🎤 Speak Meal
          </button>
        </div>
        <textarea id="food-text" rows="3" placeholder="e.g. 2 idlis, 1 bowl sambar, 1 glass buttermilk, 1 cup tea" style="margin-top:6px;" required></textarea>

        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:14px; flex-wrap:wrap; gap:10px;">
          <div style="font-size:0.82rem; color:var(--mute);">
            Speech language:
            <select id="food-speech-lang" style="width:auto; display:inline-block; padding:4px 8px; margin-left:6px;">
              <option value="en-IN">English (India)</option>
              <option value="ta-IN">தமிழ் (Tamil)</option>
              <option value="hi-IN">हिन्दी (Hindi)</option>
            </select>
          </div>
          <div style="display:flex; gap:8px;">
            <button type="submit" class="btn btn-primary" id="btn-analyze-food">
              Analyze &amp; Log Meal
            </button>
          </div>
        </div>

        <div id="food-output" style="margin-top:18px;"></div>
      </form>
    `;

    openModal('Diet & Nutrient Analyzer (IFCT Engine)', html);

    // Voice recognition setup
    const micBtn = $('#food-mic');
    const speechLangSelect = $('#food-speech-lang');
    const textArea = $('#food-text');

    if (micBtn) {
      micBtn.addEventListener('click', () => {
        const SpeechRecognition =
          window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
          alert('Voice recognition is not supported in this browser. Please type your meal.');
          return;
        }

        const recognizer = new SpeechRecognition();
        recognizer.lang = speechLangSelect.value;
        recognizer.interimResults = false;
        recognizer.maxAlternatives = 1;

        micBtn.textContent = '🔴 Listening...';
        micBtn.style.borderColor = 'var(--hi)';

        recognizer.onresult = event => {
          const transcript = event.results[0][0].transcript;
          textArea.value = (textArea.value ? textArea.value + ', ' : '') + transcript;
        };

        recognizer.onspeechend = () => {
          recognizer.stop();
          micBtn.textContent = '🎤 Speak Meal';
          micBtn.style.borderColor = 'var(--line)';
        };

        recognizer.onerror = () => {
          micBtn.textContent = '🎤 Speak Meal';
          micBtn.style.borderColor = 'var(--line)';
        };

        recognizer.start();
      });
    }

    const form = $('#food-form');
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const pid = $('#food-who').value;
      const text = textArea.value.trim();
      const out = $('#food-output');

      if (!text) return;
      out.innerHTML = '<p style="color:var(--mute);">Analyzing food composition against IFCT database...</p>';

      try {
        const res = await api(`/patients/${pid}/meals`, {
          text,
          lang: speechLangSelect.value.split('-')[0] || 'en',
          save: true,
        });

        let outHtml = renderEmergency(res.safety);

        if (res.items && res.items.length > 0) {
          const t = res.total;
          outHtml += `
            <div class="result">
              <h4 style="margin-bottom:12px; color:var(--teal-d);">Nutrient Breakdown for this Meal</h4>
              <div class="facts">
                <div>
                  <b>${t.k}</b>
                  <span>Potassium (mg)</span>
                </div>
                <div>
                  <b>${t.p}</b>
                  <span>Phosphorus (mg)</span>
                </div>
                <div>
                  <b>${t.na}</b>
                  <span>Sodium (mg)</span>
                </div>
                <div>
                  <b>${t.fluid}</b>
                  <span>Fluid (mL)</span>
                </div>
              </div>

              <table>
                <thead>
                  <tr>
                    <th>Item Recognized</th>
                    <th>Serving</th>
                    <th>Potassium</th>
                    <th>Fluid</th>
                  </tr>
                </thead>
                <tbody>
                  ${res.items
                    .map(
                      i => `
                    <tr>
                      <td><b>${escapeHtml(i.food)}</b></td>
                      <td>${i.qty} ${escapeHtml(i.unit)}</td>
                      <td>${i.k} mg</td>
                      <td>${i.fluid} mL</td>
                    </tr>
                  `
                    )
                    .join('')}
                </tbody>
              </table>

              ${res.advisory ? `<div class="advisory">${escapeHtml(res.advisory)}</div>` : ''}

              <p style="margin-top:14px; font-size:0.88rem;">
                <b>Updated Daily Risk:</b> <span class="badge ${res.risk.level}">${RISK_LABELS[res.risk.level]} (${res.risk.score}/100)</span>
              </p>
            </div>
          `;
        } else {
          outHtml += `
            <div class="result">
              <p><b>No recognized foods found in the input.</b></p>
              <p style="color:var(--mute); font-size:0.85rem; margin-top:4px;">
                Try common Indian items like <em>idli, dosa, sambar, rasam, curd, rice, chapati, dal, banana, coconut water, tea, coffee, buttermilk</em>.
              </p>
            </div>
          `;
        }

        out.innerHTML = outHtml;
        loadDashboard();
      } catch (err) {
        out.innerHTML = `<div class="alert">Failed to analyze meal. Please check inputs.</div>`;
      }
    });
  }

  // --- Modal: Patient Details ---
  async function openPatientModal(pid) {
    openModal('Loading Patient Data...', '<p style="color:var(--mute);">Fetching medical history and clinical indicators...</p>');

    try {
      const data = await api(`/patients/${pid}`);
      const r = data.risk;
      const history = data.weight_history || [];
      const weights = history.map(h => h.weight).filter(w => typeof w === 'number');

      // Sparkline SVG generator
      let sparklineSvg = '';
      if (weights.length >= 2) {
        const dry = data.dry_weight;
        const allVals = [...weights, dry];
        const minW = Math.min(...allVals) - 0.5;
        const maxW = Math.max(...allVals) + 0.5;
        const width = 340;
        const height = 75;

        const scaleX = i => 15 + (i * (width - 30)) / (weights.length - 1);
        const scaleY = w => height - 12 - ((w - minW) / (maxW - minW || 1)) * (height - 24);

        const dryY = scaleY(dry);
        const points = weights.map((w, i) => `${scaleX(i)},${scaleY(w)}`).join(' ');

        sparklineSvg = `
          <div style="margin:14px 0 8px;">
            <div style="display:flex; justify-content:space-between; font-size:0.75rem; color:var(--mute); margin-bottom:4px;">
              <span>7-Day Weight Trend (kg)</span>
              <span>Dashed line = Dry Weight (${dry} kg)</span>
            </div>
            <svg class="spark" viewBox="0 0 ${width} ${height}" role="img" aria-label="7-Day Weight Graph">
              <!-- Dry weight reference line -->
              <line x1="10" x2="${width - 10}" y1="${dryY}" y2="${dryY}" stroke="#23805A" stroke-width="1.5" stroke-dasharray="4,4"/>
              <!-- Weight trajectory -->
              <polyline fill="none" stroke="#0F7C8A" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" points="${points}"/>
              <!-- Data points -->
              ${weights
                .map(
                  (w, i) => `
                <circle cx="${scaleX(i)}" cy="${scaleY(w)}" r="3.5" fill="#0F7C8A"/>
              `
                )
                .join('')}
            </svg>
          </div>
        `;
      }

      const html = `
        <div class="patient-detail-header" style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:16px;">
          <div>
            <h3 style="font-size:1.3rem; color:var(--ink); margin-bottom:4px;">${escapeHtml(data.name)}</h3>
            <p style="color:var(--mute); font-size:0.88rem;">
              Age: <b>${data.age}</b> · Gender: <b>${escapeHtml(data.gender || 'N/A')}</b> · Schedule: <b>${escapeHtml(data.dialysis_schedule || 'Mon,Wed,Fri')}</b>
            </p>
            <p style="color:var(--mute); font-size:0.85rem; margin-top:2px;">
              Dry Weight Target: <b>${data.dry_weight} kg</b> · Daily Fluid Limit: <b>${data.fluid_limit} mL</b>
            </p>
          </div>
          <span class="badge ${r.level}" style="font-size:0.95rem; padding:6px 14px;">
            ${RISK_LABELS[r.level]} · ${r.score}/100
          </span>
        </div>

        ${sparklineSvg}

        <!-- 4-metric Clinical Indicator Cards -->
        <div class="facts">
          <div>
            <b>${data.nutrients_today ? data.nutrients_today.k : 0}</b>
            <span>Potassium Today</span>
          </div>
          <div>
            <b>${data.nutrients_today ? data.nutrients_today.fluid : 0}</b>
            <span>Fluid (mL) Today</span>
          </div>
          <div>
            <b>${r.idwg_pct}%</b>
            <span>IDWG Gain</span>
          </div>
          <div>
            <b>${data.days_since_session}d</b>
            <span>Since Dialysis</span>
          </div>
        </div>

        <!-- Risk Factor Breakdown -->
        <div class="info-block" style="margin-top:20px;">
          <h4 style="font-size:0.95rem; color:var(--ink); margin-bottom:8px;">Clinical Factors Contributing to Score</h4>
          ${
            r.factors && r.factors.length > 0
              ? `<ul class="why">${r.factors
                  .map(f => `<li><b>${escapeHtml(f.reason)}</b> (+${f.points} pts)</li>`)
                  .join('')}</ul>`
              : `<p style="color:var(--mute); font-size:0.88rem;">No negative clinical flags identified today.</p>`
          }
        </div>

        <!-- Recent Meals Recorded -->
        <div class="info-block" style="margin-top:16px;">
          <h4 style="font-size:0.95rem; color:var(--ink); margin-bottom:8px;">Recent Meals Logged</h4>
          ${
            data.recent_meals && data.recent_meals.length > 0
              ? `<ul class="meals-list">${data.recent_meals
                  .slice(0, 4)
                  .map(
                    m => `
                  <li>
                    <div>
                      <b>${escapeHtml(m.text || 'Meal')}</b>
                      <small style="display:block;">${m.day} · K: ${m.k}mg · Fluid: ${m.fluid}mL</small>
                    </div>
                  </li>
                `
                  )
                  .join('')}</ul>`
              : `<p style="color:var(--mute); font-size:0.85rem;">No recent meals recorded.</p>`
          }
        </div>

        <!-- Actions -->
        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:24px; padding-top:16px; border-top:1px solid var(--line); flex-wrap:wrap; gap:10px;">
          <button class="btn btn-primary" id="btn-session-done">
            ✅ Mark Dialysis Completed Today
          </button>
          <button class="btn btn-ghost" id="btn-quick-log">
            + Quick Log for ${escapeHtml(data.name.split(' ')[0])}
          </button>
        </div>
      `;

      openModal(`Patient Profile — ${data.name}`, html);

      // Event handlers for modal buttons
      const sessionBtn = $('#btn-session-done');
      if (sessionBtn) {
        sessionBtn.addEventListener('click', async () => {
          sessionBtn.disabled = true;
          sessionBtn.textContent = 'Updating...';
          try {
            await api(`/patients/${pid}/session`, {});
            closeModal();
            await loadDashboard();
          } catch (err) {
            alert('Failed to update dialysis session.');
            sessionBtn.disabled = false;
          }
        });
      }

      const quickLogBtn = $('#btn-quick-log');
      if (quickLogBtn) {
        quickLogBtn.addEventListener('click', () => {
          closeModal();
          openLogModal(pid);
        });
      }
    } catch (err) {
      openModal('Error', `<div class="alert">Could not load details for patient ID ${pid}.</div>`);
    }
  }

  // --- Modal: Safety Rules ---
  function openSafetyModal() {
    const html = `
      <div class="info-block">
        <h3 style="color:var(--hi);">🚨 Hard-Coded Emergency Rules</h3>
        <p>
          RenalWatch enforces strict safety firewalls. When life-threatening symptoms are reported, the system <b>immediately displays direct emergency guidance</b> without passing through any generative AI text model.
        </p>
      </div>

      <div class="info-block">
        <h4>Critical Red-Flag Symptoms</h4>
        <ul class="why">
          <li><b>Breathlessness / Shortness of Breath (மூச்சுத்திணறல் / सांस फूलना):</b> Indicates pulmonary edema or severe fluid overload.</li>
          <li><b>Chest Pain or Tightness (நெஞ்சு வலி / छाती में दर्द):</b> Indicates potential acute coronary event or severe pericarditis.</li>
          <li><b>Severe Weakness or Palpitations (படபடப்பு / चक्कर/धड़कन):</b> Critical indicator of life-threatening hyperkalemia (potassium &gt; 6.5 mEq/L).</li>
          <li><b>Syncope or Unconsciousness (மயக்கம் / बेहोश):</b> Immediate medical dispatch required.</li>
        </ul>
      </div>

      <div class="info-block">
        <h4>Multilingual Emergency Protocols</h4>
        <p style="font-size:0.85rem; color:var(--mute);">Emergency directives are presented immediately in the patient's preferred language:</p>
        <div style="background:var(--hi-bg); border-left:3px solid var(--hi); padding:10px 14px; margin:8px 0; border-radius:4px; font-size:0.85rem;">
          <b>English:</b> "EMERGENCY: Serious symptoms detected. Contact your nephrologist or call emergency services now. Do not wait for your next session."
        </div>
        <div style="background:var(--hi-bg); border-left:3px solid var(--hi); padding:10px 14px; margin:8px 0; border-radius:4px; font-size:0.85rem;">
          <b>Tamil:</b> "அவசரநிலை: தீவிர அறிகுறிகள் கண்டறியப்பட்டன. உடனடியாக உங்கள் சிறுநீரக மருத்துவரை தொடர்புகொள்ளுங்கள்."
        </div>
        <div style="background:var(--hi-bg); border-left:3px solid var(--hi); padding:10px 14px; margin:8px 0; border-radius:4px; font-size:0.85rem;">
          <b>Hindi:</b> "आपातकाल: गंभीर लक्षण पाए गए हैं। कृपया तुरंत अपने नेफ्रोलॉजिस्ट से संपर्क करें।"
        </div>
      </div>

      <div class="disclaimer">
        <b>Responsible AI Disclaimer:</b> RenalWatch is designed strictly as an early-warning communication bridge for outpatient hemodialysis. It is not an autonomous diagnostic instrument. All risk calculations are transparent and explainable.
      </div>
    `;

    openModal('Clinical Safety Protocols & Emergency Rules', html);
  }

  // --- Modal: About ---
  function openAboutModal() {
    const html = `
      <div class="info-block">
        <h3 style="color:var(--teal);">💧 About RenalWatch</h3>
        <p>
          In end-stage renal disease (ESRD), the majority of emergency admissions occur during the <b>interdialytic gap</b> (especially the 3-day weekend interval). Patients often face fluid overload or potassium spikes with little warning.
        </p>
        <p style="margin-top:6px;">
          RenalWatch provides a proactive early-warning companion that empowers patients to self-monitor while giving dialysis care teams a prioritized, explainable patient queue.
        </p>
      </div>

      <div class="info-block">
        <h4>Key Architectural Pillars</h4>
        <ul class="why">
          <li><b>Patient Logging:</b> Simple 1-minute daily check-in (Weight, BP, Heart Rate, Symptoms, and voice-assisted meals).</li>
          <li><b>Food-to-Nutrient Engine:</b> Natural language meal parsing mapped against Indian Food Composition Tables (IFCT) nutrient benchmarks (K, P, Na, Fluid). The database handles numbers; the AI handles language.</li>
          <li><b>Explainable Risk Engine:</b> 70% rule-based deterministic scoring + 30% lightweight Logistic Regression model trained on synthetic clinical trajectories.</li>
          <li><b>Clinician Dashboard:</b> Color-coded priority queue sorted by clinical urgency with a one-line explanation for each triage flag.</li>
          <li><b>Deterministic Safety Firewall:</b> Immediate red-flag routing with zero hallucination risk for critical emergency presentations.</li>
        </ul>
      </div>

      <div class="info-block">
        <h4>Technology Stack</h4>
        <p style="font-size:0.85rem; color:var(--mute);">
          <b>Backend:</b> Python 3.10+, FastAPI, SQLite with WAL mode, scikit-learn<br>
          <b>Frontend:</b> Vanilla HTML5, modern CSS with custom properties &amp; glass-morphism, Canvas particle VFX, Web Speech API<br>
          <b>Data:</b> 100% Synthetic clinically grounded patient cohorts
        </p>
      </div>

      <div class="disclaimer">
        <b>Proof of Concept:</b> Built for hackathon demonstration using synthetic datasets. Not evaluated on real patients. Designed for prospective pilot deployment in partnership with certified hemodialysis centers.
      </div>
    `;

    openModal('About RenalWatch & System Architecture', html);
  }

  // --- Global Event Delegation ---
  document.addEventListener('click', e => {
    // Patient row or peek item clicked
    const patientItem = e.target.closest('[data-patient-id]');
    if (patientItem) {
      const pid = parseInt(patientItem.getAttribute('data-patient-id'), 10);
      if (pid) openPatientModal(pid);
      return;
    }

    // Nav or CTA buttons with data-open
    const openBtn = e.target.closest('[data-open]');
    if (openBtn) {
      const target = openBtn.getAttribute('data-open');
      if (target === 'log') openLogModal();
      else if (target === 'food') openFoodModal();
      else if (target === 'safety') openSafetyModal();
      else if (target === 'about') openAboutModal();
      return;
    }

    // Dashboard filter chips
    const chipBtn = e.target.closest('[data-filter]');
    if (chipBtn) {
      currentFilter = chipBtn.getAttribute('data-filter');
      $$('.chip').forEach(c => c.classList.toggle('active', c === chipBtn));
      renderTable();
      return;
    }

    // Modal close button or backdrop click
    if (e.target.closest('.modal-close') || e.target === modalEl) {
      closeModal();
      return;
    }

    // Mobile hamburger menu toggle
    const hamburger = e.target.closest('.hamburger');
    if (hamburger) {
      const nav = $('.main-nav');
      if (nav) {
        nav.classList.toggle('open');
        const expanded = nav.classList.contains('open');
        hamburger.setAttribute('aria-expanded', String(expanded));
      }
      return;
    }
  });

  // Keyboard accessibility
  window.addEventListener('keydown', e => {
    if (e.key === 'Escape' && modalEl && !modalEl.hidden) {
      closeModal();
    }
  });

  // Initial load & recurring refresh every 30 seconds
  loadDashboard();
  setInterval(loadDashboard, 30000);
})();
