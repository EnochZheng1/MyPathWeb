// client/src/pages/MyAccountPage.js

import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ChatPanel from '../components/ChatPanel'; // We will create this component next
import { useUser } from '../context/UserContext'; // Assuming a UserContext for userId

const MyAccountPage = () => {
    // This will eventually come from your UserContext after login
    const { userId } = useUser() || { userId: 'testuser@example.com' };
    const navigate = useNavigate();

    return (
        <div className="account-page-container">
            {/* --- Main Content Area (Left Side) --- */}
            <div className="main-content">
                <div className="account-header">
                    <div className="account-header-left">
                        <h2>My Account</h2>
                        {/* This is the new button to edit the profile */}
                        <button 
                            className="btn btn-secondary edit-profile-btn" 
                            onClick={() => navigate('/build-profile')}
                        >
                            Build My Profile
                        </button>
                    </div>
                    <button className="btn btn-secondary">Export as PDF</button>
                </div>

                <div className="account-dashboard">
                    <div className="left-panel">
                        <div className="checklist-card">
                            <h3>Aug 3 - 16 Checklist</h3>
                            <ul>
                                <li className="completed">Finalize college list</li>
                                <li className="completed">Draft personal statement</li>
                                <li>Start recording achievements</li>
                            </ul>
                        </div>
                        <div className="catch-up-card">
                            <h3>Catch Up / Get Ahead</h3>
                            <ul>
                                <li className="in-progress">Brainstorm personal statement</li>
                                <li>Write activity descriptions</li>
                            </ul>
                        </div>
                    </div>

                    <div className="right-panel">
                        <button className="report-btn">College list & Application strategy</button>
                        <button className="report-btn">Strengths & Improvements</button>
                        <button className="report-btn">Essay & Activities list</button>
                    </div>
                </div>
            </div>

            {/* --- Chat Panel (Right Side) --- */}
            <div className="chat-column">
                <ChatPanel userId={userId} />
            </div>
        </div>
    );
};

export default MyAccountPage;