import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ChatPanel from '../components/ChatPanel';
import PrioritiesTab from '../components/PrioritiesTab'; // Will be updated
import InterestsTab from '../components/InterestsTab'; // Will be updated
import AboutMeTab from '../components/AboutMeTab';   // Will be updated
import { useUser } from '../context/UserContext';

const BuildMyProfilePage = () => {
    const { userId } = useUser() || { userId: 'testuser@example.com' };
    const [activeTab, setActiveTab] = useState('Priorities');
    const navigate = useNavigate();

    // This function now just renders the correct tab component
    const renderActiveTab = () => {
        switch (activeTab) {
            case 'Interests':
                return <InterestsTab setActiveTab={setActiveTab} />;
            case 'About Me':
                return <AboutMeTab />;
            case 'Priorities':
            default:
                return <PrioritiesTab setActiveTab={setActiveTab} />;
        }
    };

    return (
        <div className="build-profile-container">
            <div className="main-content">
                <div className="profile-header">
                    <button className="back-btn" onClick={() => navigate('/account')}>&larr; My Account</button>
                    <h1>Build My Profile</h1>
                </div>
                <div className="profile-content">
                    <div className="tab-navigation">
                        <button onClick={() => setActiveTab('Priorities')} className={activeTab === 'Priorities' ? 'active' : ''}>Priorities</button>
                        <button onClick={() => setActiveTab('Interests')} className={activeTab === 'Interests' ? 'active' : ''}>Interests</button>
                        <button onClick={() => setActiveTab('About Me')} className={activeTab === 'About Me' ? 'active' : ''}>About Me</button>
                    </div>
                    <div className="tab-content">
                        {renderActiveTab()}
                    </div>
                </div>
            </div>
            <div className="chat-column">
                <ChatPanel userId={userId} />
            </div>
        </div>
    );
};

export default BuildMyProfilePage;