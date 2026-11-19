import React from 'react';
import {
  Activity,
  Utensils,
  ShieldAlert,
  Home,
  LogOut,
  UserPlus,
  Stethoscope,
  Plus,
} from 'lucide-react';

export default function MobileBottomNav({
  currentUser,
  onOpenModal,
  onLogout,
}) {
  if (!currentUser) {
    // When on the entrance gateway on mobile, show quick navigation
    return (
      <nav
        aria-label="Mobile Navigation"
        className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-line shadow-lg sm:hidden px-3 py-2 pb-[max(0.6rem,env(safe-area-inset-bottom))] flex items-center justify-around"
      >
        <button
          onClick={() => onOpenModal('login', 'patient')}
          className="flex flex-col items-center gap-1 py-1 px-3 text-mute hover:text-teal active:scale-95 transition-all text-center"
        >
          <div className="w-8 h-8 rounded-full bg-tint flex items-center justify-center text-teal">
            <Activity size={18} />
          </div>
          <span className="text-[10px] font-bold">Patient Portal</span>
        </button>

        <button
          onClick={() => onOpenModal('login', 'clinician')}
          className="flex flex-col items-center gap-1 py-1 px-3 text-mute hover:text-teal active:scale-95 transition-all text-center"
        >
          <div className="w-8 h-8 rounded-full bg-tint flex items-center justify-center text-teal">
            <Stethoscope size={18} />
          </div>
          <span className="text-[10px] font-bold">Clinic Mode</span>
        </button>

        <button
          onClick={() => onOpenModal('safety')}
          className="flex flex-col items-center gap-1 py-1 px-3 text-risk-high hover:opacity-80 active:scale-95 transition-all text-center"
        >
          <div className="w-8 h-8 rounded-full bg-risk-highBg flex items-center justify-center text-risk-high">
            <ShieldAlert size={18} />
          </div>
          <span className="text-[10px] font-bold">Emergency</span>
        </button>
      </nav>
    );
  }

  if (currentUser.role === 'patient') {
    return (
      <nav
        aria-label="Patient Mobile Navigation"
        className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-line shadow-lg sm:hidden px-2 py-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] flex items-center justify-around"
      >
        {/* Home / Overview */}
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="flex flex-col items-center gap-0.5 py-1 px-2.5 text-mute hover:text-teal active:scale-95 transition-all text-center min-w-[56px]"
        >
          <Home size={18} />
          <span className="text-[10px] font-semibold">Home</span>
        </button>

        {/* Check Meals */}
        <button
          onClick={() => onOpenModal('food')}
          className="flex flex-col items-center gap-0.5 py-1 px-2.5 text-mute hover:text-teal active:scale-95 transition-all text-center min-w-[56px]"
        >
          <Utensils size={18} />
          <span className="text-[10px] font-semibold">Check Food</span>
        </button>

        {/* Elevated Center Primary Action: Log My Health */}
        <button
          onClick={() => onOpenModal('log')}
          className="flex flex-col items-center -mt-5 active:scale-90 transition-transform focus:outline-none"
        >
          <div className="w-13 h-13 rounded-full bg-teal hover:bg-teal-dark text-white flex items-center justify-center shadow-lg border-3 border-white">
            <Plus size={24} strokeWidth={2.5} />
          </div>
          <span className="text-[10px] font-bold text-teal-dark mt-0.5">Log Vitals</span>
        </button>

        {/* Safety Rules */}
        <button
          onClick={() => onOpenModal('safety')}
          className="flex flex-col items-center gap-0.5 py-1 px-2.5 text-mute hover:text-risk-high active:scale-95 transition-all text-center min-w-[56px]"
        >
          <ShieldAlert size={18} />
          <span className="text-[10px] font-semibold">Emergency</span>
        </button>

        {/* Switch / Logout */}
        <button
          onClick={onLogout}
          className="flex flex-col items-center gap-0.5 py-1 px-2.5 text-mute hover:text-risk-high active:scale-95 transition-all text-center min-w-[56px]"
        >
          <LogOut size={18} />
          <span className="text-[10px] font-semibold">Switch</span>
        </button>
      </nav>
    );
  }

  // Clinician Mode
  return (
    <nav
      aria-label="Clinician Mobile Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-line shadow-lg sm:hidden px-3 py-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] flex items-center justify-around"
    >
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className="flex flex-col items-center gap-0.5 py-1 px-3 text-teal font-bold active:scale-95 transition-all text-center"
      >
        <Stethoscope size={18} />
        <span className="text-[10px]">Triage Queue</span>
      </button>

      <button
        onClick={() => onOpenModal('register')}
        className="flex flex-col items-center gap-0.5 py-1 px-3 text-mute hover:text-teal active:scale-95 transition-all text-center"
      >
        <UserPlus size={18} />
        <span className="text-[10px] font-semibold">+ Add Patient</span>
      </button>

      <button
        onClick={() => onOpenModal('safety')}
        className="flex flex-col items-center gap-0.5 py-1 px-3 text-mute hover:text-risk-high active:scale-95 transition-all text-center"
      >
        <ShieldAlert size={18} />
        <span className="text-[10px] font-semibold">Emergency</span>
      </button>

      <button
        onClick={onLogout}
        className="flex flex-col items-center gap-0.5 py-1 px-3 text-mute hover:text-risk-high active:scale-95 transition-all text-center"
      >
        <LogOut size={18} />
        <span className="text-[10px] font-semibold">Exit</span>
      </button>
    </nav>
  );
}
