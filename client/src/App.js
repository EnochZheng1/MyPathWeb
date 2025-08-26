// client/src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { UserProvider } from './context/UserContext'; // Import the provider
import LandingPage from './pages/LandingPage';
import SignUpPage from './pages/SignUpPage';
import LoginPage from './pages/LoginPage';
import MyAccountPage from './pages/MyAccountPage';
import BuildMyProfilePage from './pages/BuildMyProfilePage';
import CollegeListPage from './pages/CollegeListPage';
import StrengthsImprovementsPage from './pages/StrengthsImprovementsPage';
import EssayActivitiesPage from './pages/EssayActivitiesPage';
import './App.css';

function App() {
  return (
    // Wrap the entire Router with the UserProvider
    <UserProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/account" element={<MyAccountPage />} />
          <Route path="/build-profile" element={<BuildMyProfilePage />} />
          <Route path="/college-list" element={<CollegeListPage />} />
          <Route path="/strengths-improvements" element={<StrengthsImprovementsPage />} />
          <Route path="/essays-activities" element={<EssayActivitiesPage />} />
        </Routes>
      </Router>
    </UserProvider>
  );
}

export default App;