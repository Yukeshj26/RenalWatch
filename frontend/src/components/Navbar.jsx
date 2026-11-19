import React, { useState } from 'react';
import {
  Activity,
  Utensils,
  ShieldAlert,
  Info,
  Menu,
  X,
  User,
  Stethoscope,
  LogOut,
  UserPlus,
} from 'lucide-react';

export default function Navbar({ currentUser, onOpenModal, onLogout }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  function handleAction(modalType, role = null) {
    setMobileOpen(false);
    onOpenModal(modalType, role);
  }

  return (
    <header className="fixed top-0 left-0 right-0 h-16 z-40 bg-bg/90 backdrop-blur-md border-b border-line flex items-center justify-between px-4 sm:px-8 transition-all">
      {/* Brand Logo & Name */}
      <div
        onClick={onLogout}
        className="flex items-center gap-2.5 text-ink font-heading font-bold text-xl group cursor-pointer"
        title="RenalWatch - Return to Portal Gateway"
      >
        <span className="logo-drop" aria-hidden="true" />
        <span className="group-hover:text-teal transition-colors">RenalWatch</span>
      </div>

      {/* Desktop Navigation */}
      <nav className="hidden md:flex items-center gap-2">
        {currentUser?.role === 'patient' ? (
          /* Logged-in Patient Navigation */
          <>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-tint text-teal-dark text-xs font-bold mr-1">
              <span className="w-2 h-2 rounded-full bg-teal animate-pulse" />
              {currentUser.patient?.name} (Dry: {currentUser.patient?.dry_weight}kg)
            </span>

            <button
              onClick={() => handleAction('log')}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-teal border border-teal/30 hover:border-teal hover:bg-tint rounded-lg transition-all"
            >
              <Activity size={14} />
              Log My Health
            </button>

            <button
              onClick={() => handleAction('food')}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-teal border border-teal/30 hover:border-teal hover:bg-tint rounded-lg transition-all"
            >
              <Utensils size={14} />
              Check Food
            </button>

            <button
              onClick={() => handleAction('safety')}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-teal-dark hover:bg-tint-light rounded-lg transition-all"
            >
              <ShieldAlert size={14} />
              Safety Rules
            </button>

            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-mute hover:text-risk-high hover:bg-risk-highBg rounded-lg transition-all ml-1 border border-line hover:border-risk-high/30"
              title="Return to Portal Selection Gateway"
            >
              <LogOut size={13} />
              Switch Portal
            </button>
          </>
        ) : currentUser?.role === 'clinician' ? (
          /* Clinician Navigation */
          <>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-tint text-teal-dark text-xs font-bold mr-1">
              <Stethoscope size={13} className="text-teal" />
              Clinician Care Team View
            </span>

            <button
              onClick={() => handleAction('register')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-teal border border-teal/30 hover:border-teal hover:bg-tint rounded-lg transition-all"
            >
              <UserPlus size={14} />
              + Add Patient
            </button>

            <button
              onClick={() => handleAction('safety')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-teal-dark hover:bg-tint-light rounded-lg transition-all"
            >
              <ShieldAlert size={14} />
              Safety Rules
            </button>

            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-mute hover:text-risk-high hover:bg-risk-highBg rounded-lg transition-all ml-1 border border-line hover:border-risk-high/30"
              title="Return to Portal Selection Gateway"
            >
              <LogOut size={13} />
              Exit Clinician Mode
            </button>
          </>
        ) : (
          /* Gateway Navigation (No user logged in) */
          <>
            <button
              onClick={() => handleAction('about')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-mute hover:text-ink hover:bg-tint-light rounded-lg transition-colors"
            >
              <Info size={14} />
              About System
            </button>

            <button
              onClick={() => handleAction('safety')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-mute hover:text-ink hover:bg-tint-light rounded-lg transition-colors"
            >
              <ShieldAlert size={14} />
              Safety Protocols
            </button>

            <button
              onClick={() => handleAction('login', 'patient')}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-teal border border-teal/40 hover:bg-tint rounded-lg transition-all"
            >
              <User size={14} />
              Patient Login
            </button>

            <button
              onClick={() => handleAction('login', 'clinician')}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-teal hover:bg-teal-dark shadow-sm rounded-lg transition-all"
            >
              <Stethoscope size={14} />
              Clinician Portal
            </button>
          </>
        )}
      </nav>

      {/* Mobile Hamburger Button */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="md:hidden p-2 text-ink hover:bg-tint-light rounded-lg transition-colors"
        aria-label="Toggle navigation menu"
      >
        {mobileOpen ? <X size={22} /> : <Menu size={22} />}
      </button>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed top-16 left-0 right-0 bg-white border-b border-line shadow-xl p-4 flex flex-col gap-2 animate-fadeSlideUp">
          {currentUser ? (
            <>
              <div className="p-2.5 rounded-lg bg-tint-light text-xs font-bold text-teal-dark">
                Signed in as: {currentUser.role === 'patient' ? currentUser.patient?.name : 'Clinician Care Team'}
              </div>
              {currentUser.role === 'patient' && (
                <>
                  <button
                    onClick={() => handleAction('log')}
                    className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-teal hover:bg-tint rounded-lg text-left"
                  >
                    <Activity size={16} /> Log Today's Health
                  </button>
                  <button
                    onClick={() => handleAction('food')}
                    className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-teal hover:bg-tint rounded-lg text-left"
                  >
                    <Utensils size={16} /> Check Food &amp; Nutrients
                  </button>
                </>
              )}
              {currentUser.role === 'clinician' && (
                <button
                  onClick={() => handleAction('register')}
                  className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-teal hover:bg-tint rounded-lg text-left"
                >
                  <UserPlus size={16} /> + Register New Patient
                </button>
              )}
              <button
                onClick={() => { setMobileOpen(false); onLogout(); }}
                className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-risk-high hover:bg-risk-highBg rounded-lg text-left"
              >
                <LogOut size={16} /> Switch Portal
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => handleAction('login', 'patient')}
                className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-teal hover:bg-tint rounded-lg text-left"
              >
                <User size={16} /> Patient Login
              </button>
              <button
                onClick={() => handleAction('register')}
                className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-teal hover:bg-tint rounded-lg text-left"
              >
                <UserPlus size={16} /> Register as Patient
              </button>
              <button
                onClick={() => handleAction('login', 'clinician')}
                className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-teal-dark hover:bg-tint-light rounded-lg text-left"
              >
                <Stethoscope size={16} /> Clinician Portal
              </button>
            </>
          )}
          <button
            onClick={() => handleAction('safety')}
            className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-mute hover:text-ink rounded-lg text-left"
          >
            <ShieldAlert size={16} /> Safety Protocols
          </button>
          <button
            onClick={() => handleAction('about')}
            className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-mute hover:text-ink rounded-lg text-left"
          >
            <Info size={16} /> About Architecture
          </button>
        </div>
      )}
    </header>
  );
}
