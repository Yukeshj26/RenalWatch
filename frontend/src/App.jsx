import React, { useState, useEffect, useCallback } from 'react';
import Navbar from './components/Navbar.jsx';
import RoleGateway from './components/RoleGateway.jsx';
import ClinicianDashboard from './components/ClinicianDashboard.jsx';
import PersonalizedPatientPortal from './components/PersonalizedPatientPortal.jsx';
import CursorTrail from './components/CursorTrail.jsx';
import Modal from './components/Modal.jsx';

import LogHealthModal from './components/LogHealthModal.jsx';
import FoodCheckModal from './components/FoodCheckModal.jsx';
import PatientDetailModal from './components/PatientDetailModal.jsx';
import SafetyModal from './components/SafetyModal.jsx';
import AboutModal from './components/AboutModal.jsx';
import LoginModal from './components/LoginModal.jsx';
import RegisterModal from './components/RegisterModal.jsx';

export default function App() {
  const [patients, setPatients] = useState([]);
  const [currentUser, setCurrentUser] = useState(null); // null | { role: 'patient', patient: {...} } | { role: 'clinician' }
  const [activeModal, setActiveModal] = useState(null); // 'log' | 'food' | 'safety' | 'about' | 'patient' | 'login' | 'register' | null
  const [loginInitialRole, setLoginInitialRole] = useState('patient');
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchPatients = useCallback(async () => {
    try {
      const res = await fetch('/api/patients');
      if (res.ok) {
        const text = await res.text();
        const data = text ? JSON.parse(text) : [];
        setPatients(data);
      }
    } catch (err) {
      console.error('Failed to fetch patients list:', err);
    }
  }, []);

  useEffect(() => {
    fetchPatients();
    const interval = setInterval(fetchPatients, 30000);
    return () => clearInterval(interval);
  }, [fetchPatients]);

  function handleOpenModal(type, extraRole = null) {
    if (extraRole) {
      setLoginInitialRole(extraRole);
    }
    setActiveModal(type);
  }

  function handleCloseModal() {
    setActiveModal(null);
  }

  function handleSelectPatient(id) {
    setSelectedPatientId(id);
    setActiveModal('patient');
  }

  function handleQuickLog(id) {
    setSelectedPatientId(id);
    setActiveModal('log');
  }

  function handleLoginSuccess(authData) {
    setCurrentUser(authData);
    setActiveModal(null);
  }

  function handleRegisterSuccess(authData) {
    setCurrentUser(authData);
    fetchPatients();
    setActiveModal(null);
  }

  function handleLogout() {
    setCurrentUser(null);
  }

  function handleDataUpdated() {
    fetchPatients();
    setRefreshKey(prev => prev + 1);
  }

  const currentPatient = currentUser?.role === 'patient' ? currentUser.patient : null;

  return (
    <div className="relative min-h-screen bg-bg text-ink flex flex-col selection:bg-tint selection:text-teal-dark">
      {/* Water-drop cursor trail canvas */}
      <CursorTrail />

      {/* Fixed Sticky Header Navigation */}
      <Navbar
        currentUser={currentUser}
        onOpenModal={handleOpenModal}
        onLogout={handleLogout}
      />

      {/* Main Content Area - Mutually Exclusive Views */}
      <main className="flex-1">
        {currentUser?.role === 'patient' ? (
          /* Personalized Patient Portal - Patient's own health view exclusively */
          <PersonalizedPatientPortal
            patient={currentUser.patient}
            onOpenLogModal={() => handleOpenModal('log')}
            onOpenFoodModal={() => handleOpenModal('food')}
            onOpenSafetyModal={() => handleOpenModal('safety')}
            onRefresh={refreshKey}
          />
        ) : currentUser?.role === 'clinician' ? (
          /* Clinician All-Patients Monitoring View - Care Team exclusively */
          <div className="pt-24 pb-16 px-4 sm:px-8 max-w-6xl mx-auto space-y-6 animate-fadeSlideUp">
            <div className="p-6 rounded-2xl bg-white border border-line shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-tint text-teal-dark text-xs font-bold mb-2">
                  <span className="w-2 h-2 rounded-full bg-teal animate-pulse" />
                  Clinician Mode Active
                </div>
                <h1 className="text-2xl sm:text-3xl font-heading font-bold text-ink">
                  Hemodialysis Care Team Dashboard
                </h1>
                <p className="text-sm text-mute mt-1">
                  Monitoring {patients.length} active dialysis patients. Ranked by urgency to prompt proactive interdialytic phone calls.
                </p>
              </div>

              <button
                onClick={() => handleOpenModal('register')}
                className="px-4 py-2.5 rounded-xl bg-teal hover:bg-teal-dark text-white text-xs font-semibold shadow-sm transition-all whitespace-nowrap"
              >
                + Register New Patient
              </button>
            </div>

            <ClinicianDashboard
              patients={patients}
              onSelectPatient={handleSelectPatient}
            />
          </div>
        ) : (
          /* Entrance Gateway: Asks Patient or Clinician Login when opening website */
          <RoleGateway
            patients={patients}
            onEnterAsPatient={handleLoginSuccess}
            onEnterAsClinician={handleLoginSuccess}
            onOpenLoginModal={(role) => handleOpenModal('login', role)}
            onOpenRegisterModal={() => handleOpenModal('register')}
            onOpenSafetyModal={() => handleOpenModal('safety')}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-line bg-white text-center text-xs text-mute space-y-1">
        <p className="font-medium text-ink/80">
          RenalWatch &mdash; Dialysis Early-Warning Companion (React + Tailwind Edition)
        </p>
        <p>Proof of concept using synthetic data. Not a medical device.</p>
      </footer>

      {/* Modals */}
      <Modal
        isOpen={activeModal === 'login'}
        onClose={handleCloseModal}
        title="Sign In to RenalWatch"
      >
        <LoginModal
          patients={patients}
          initialRole={loginInitialRole}
          onLoginSuccess={handleLoginSuccess}
          onSwitchToRegister={() => setActiveModal('register')}
        />
      </Modal>

      <Modal
        isOpen={activeModal === 'register'}
        onClose={handleCloseModal}
        title="Patient Registration"
      >
        <RegisterModal
          onRegisterSuccess={handleRegisterSuccess}
          onSwitchToLogin={() => handleOpenModal('login', 'patient')}
        />
      </Modal>

      <Modal
        isOpen={activeModal === 'log'}
        onClose={handleCloseModal}
        title={currentPatient ? `Daily Check-In: ${currentPatient.name}` : "Log Daily Health Check-In"}
      >
        <LogHealthModal
          patients={patients}
          selectedPatientId={selectedPatientId}
          currentPatient={currentPatient}
          onLogSaved={handleDataUpdated}
        />
      </Modal>

      <Modal
        isOpen={activeModal === 'food'}
        onClose={handleCloseModal}
        title={currentPatient ? `Diet & Nutrient Check: ${currentPatient.name}` : "Food & Nutrient Analyzer (IFCT)"}
      >
        <FoodCheckModal
          patients={patients}
          selectedPatientId={selectedPatientId}
          currentPatient={currentPatient}
          onMealLogged={handleDataUpdated}
        />
      </Modal>

      <Modal
        isOpen={activeModal === 'patient'}
        onClose={handleCloseModal}
        title="Patient Clinical Profile"
      >
        <PatientDetailModal
          patientId={selectedPatientId}
          onQuickLog={handleQuickLog}
          onSessionUpdated={handleDataUpdated}
        />
      </Modal>

      <Modal
        isOpen={activeModal === 'safety'}
        onClose={handleCloseModal}
        title="Clinical Safety Protocols"
      >
        <SafetyModal />
      </Modal>

      <Modal
        isOpen={activeModal === 'about'}
        onClose={handleCloseModal}
        title="About RenalWatch Architecture"
      >
        <AboutModal />
      </Modal>
    </div>
  );
}
