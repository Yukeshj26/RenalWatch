import React from 'react';
import { ShieldAlert, AlertTriangle, Languages, Lock } from 'lucide-react';

export default function SafetyModal() {
  return (
    <div className="space-y-5 text-sm">
      <div className="p-4 rounded-xl bg-risk-highBg border border-risk-high/30 flex items-start gap-3">
        <ShieldAlert size={22} className="text-risk-high shrink-0 mt-0.5" />
        <div>
          <h3 className="font-heading font-bold text-risk-high text-base">
            Hard-Coded Emergency Protocols
          </h3>
          <p className="text-xs text-ink/80 mt-1 leading-relaxed">
            RenalWatch enforces strict safety firewalls. When life-threatening symptoms are reported, the system <b>immediately displays direct emergency guidance</b> without passing through any generative AI text model.
          </p>
        </div>
      </div>

      <div>
        <h4 className="text-xs font-bold uppercase tracking-wider text-mute mb-2 flex items-center gap-1.5">
          <AlertTriangle size={14} className="text-risk-high" /> Critical Red-Flag Symptoms
        </h4>
        <ul className="space-y-2 text-xs">
          <li className="p-2.5 rounded-lg bg-bg border border-line">
            <b className="text-ink">Breathlessness / Shortness of Breath (மூச்சுத்திணறல் / सांस फूलना):</b> Indicates acute pulmonary edema or massive interdialytic fluid retention.
          </li>
          <li className="p-2.5 rounded-lg bg-bg border border-line">
            <b className="text-ink">Chest Pain or Tightness (நெஞ்சு வலி / छाती में दर्द):</b> Indicates potential acute coronary event or severe pericarditis.
          </li>
          <li className="p-2.5 rounded-lg bg-bg border border-line">
            <b className="text-ink">Severe Weakness or Palpitations (படபடப்பு / धड़कन):</b> Critical clinical indicator of life-threatening hyperkalemia (potassium &gt; 6.5 mEq/L).
          </li>
          <li className="p-2.5 rounded-lg bg-bg border border-line">
            <b className="text-ink">Syncope or Unconsciousness (மயக்கம் / बेहोश):</b> Immediate medical dispatch required.
          </li>
        </ul>
      </div>

      <div>
        <h4 className="text-xs font-bold uppercase tracking-wider text-mute mb-2 flex items-center gap-1.5">
          <Languages size={14} className="text-teal" /> Multilingual Emergency Directives
        </h4>
        <div className="space-y-2 text-xs">
          <div className="p-2.5 rounded-lg bg-risk-highBg/60 border-l-4 border-risk-high">
            <b className="text-risk-high">English:</b> "EMERGENCY: Serious symptoms detected. Contact your nephrologist or call emergency services now. Do not wait for your next session."
          </div>
          <div className="p-2.5 rounded-lg bg-risk-highBg/60 border-l-4 border-risk-high">
            <b className="text-risk-high">Tamil:</b> "அவசரநிலை: தீவிர அறிகுறிகள் கண்டறியப்பட்டன. உடனடியாக உங்கள் சிறுநீரக மருத்துவரை தொடர்புகொள்ளுங்கள்."
          </div>
          <div className="p-2.5 rounded-lg bg-risk-highBg/60 border-l-4 border-risk-high">
            <b className="text-risk-high">Hindi:</b> "आपातकाल: गंभीर लक्षण पाए गए हैं। कृपया तुरंत अपने नेफ्रोलॉजिस्ट से संपर्क करें।"
          </div>
        </div>
      </div>

      <div className="p-3 rounded-lg bg-tint-light border border-teal/20 text-xs text-mute flex items-start gap-2">
        <Lock size={16} className="text-teal shrink-0 mt-0.5" />
        <p>
          <b>Responsible AI Policy:</b> All safety rules are deterministic code paths. No machine learning model or LLM produces emergency triage instructions.
        </p>
      </div>
    </div>
  );
}
