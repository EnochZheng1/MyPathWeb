import React from 'react';
import { Link } from 'react-router-dom';
import '../App.css';

const LandingPage = () => {
    return (
        <div className="auth-container">
            <div className="landing-content">
                <div className="logo-section">
                    {/* Placeholder for the MyPath logo */}
                    <h1 className="logo-text">MyPath</h1>
                </div>
                <div className="actions-section">
                    <h2>Personalized AI guidance for your college journey</h2>
                    <Link to="/signup" className="btn btn-primary">Sign up</Link>
                    <Link to="/login" className="btn btn-secondary">Log in</Link>
                </div>
            </div>
        </div>
    );
};

export default LandingPage;