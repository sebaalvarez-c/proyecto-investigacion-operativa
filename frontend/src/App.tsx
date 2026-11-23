import { Routes, Route } from 'react-router-dom';
import { LandingPage } from './features/landing/LandingPage';
import { DispatchPage } from './features/dispatch/DispatchPage';
import { AmbulancePage } from './features/ambulance/AmbulancePage';
import { HospitalPage } from './features/hospital/HospitalPage';
import './App.css';

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/dispatch" element={<DispatchPage />} />
      <Route path="/ambulance" element={<AmbulancePage />} />
      <Route path="/hospital" element={<HospitalPage />} />
      <Route path="*" element={<LandingPage />} />
    </Routes>
  );
}

export default App;
