// client/src/pages/EssayActivitiesPage.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import ChatPanel from '../components/ChatPanel';
// We will create these tab components next
import CommonAppTab from '../components/CommonAppTab';
import UCsTab from '../components/UCsTab';
import SupplementalsTab from '../components/SupplementalsTab';
import ActivitiesTab from '../components/ActivitiesTab';

const EssayActivitiesPage = () => {
    const { userId } = useUser() || { userId: 'testuser@example.com' };
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('Common App');

    const renderActiveTab = () => {
        switch (activeTab) {
            case 'UCs':
               return <UCsTab />;
            case 'Supplementals':
               return <SupplementalsTab />;
            case 'Activities':
               return <ActivitiesTab />;
            case 'Common App':
               return <CommonAppTab />;
            default:
                return <div>Common App content will go here.</div>; // Placeholder
        }
    };

    return (
        <div className="report-page-container">
            <div className="main-content">
                <div className="profile-header">
                    <button className="back-btn" onClick={() => navigate('/account')}>&larr; My Account</button>
                    <h1>Essay & Activities List</h1>
                </div>

                <div className="report-section">
                    <div className="essay-tab-navigation">
                        <button onClick={() => setActiveTab('Common App')} className={activeTab === 'Common App' ? 'active' : ''}>Common App</button>
                        <button onClick={() => setActiveTab('UCs')} className={activeTab === 'UCs' ? 'active' : ''}>UCs</button>
                        <button onClick={() => setActiveTab('Supplementals')} className={activeTab === 'Supplementals' ? 'active' : ''}>Supplementals</button>
                        <button onClick={() => setActiveTab('Activities')} className={activeTab === 'Activities' ? 'active' : ''}>Activities</button>
                    </div>
                    <div className="essay-tab-content">
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

export default EssayActivitiesPage;