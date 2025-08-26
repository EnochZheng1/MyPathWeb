// client/src/pages/BuildMyProfilePage.js
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../api';
import ChatPanel from '../components/ChatPanel';
import PrioritiesTab from '../components/PrioritiesTab';
import InterestsTab from '../components/InterestsTab';
import AboutMeTab from '../components/AboutMeTab';
import { useUser } from '../context/UserContext';

const BuildMyProfilePage = () => {
    const { userId } = useUser() || { userId: 'testuser@example.com' };
    const [activeTab, setActiveTab] = useState('Priorities');
    const [allAnswers, setAllAnswers] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();

    const fetchAllAnswers = useCallback(async () => {
        if (!userId) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            const savedAnswers = await apiService(`/profile/${userId}/answers`);
            setAllAnswers(savedAnswers || {});
        } catch (error) {
            console.log("No saved answers found or error fetching.");
            setAllAnswers({});
        } finally {
            setIsLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        fetchAllAnswers();
    }, [fetchAllAnswers]);

    const handleSave = async (category, answers) => {
        if (!userId) {
            alert("You must be logged in to save.");
            return false;
        }
        try {
            await apiService(`/profile/${userId}`, 'PUT', {
                questionnaire: { [category]: answers }
            });
            await fetchAllAnswers();
            return true;
        } catch (error) {
            alert(`Error saving: ${error.message}`);
            return false;
        }
    };

    const renderActiveTab = () => {
        if (isLoading) return <div>Loading profile...</div>;

        switch (activeTab) {
            case 'Interests':
                return <InterestsTab savedAnswers={allAnswers.interests} onSave={(answers) => handleSave('interests', answers)} setActiveTab={setActiveTab} />;
            case 'About Me':
                // THIS IS THE CORRECTED LINE:
                // We now correctly pass the onSave function to the AboutMeTab.
                return <AboutMeTab savedAnswers={allAnswers.aboutMe} onSave={(answers) => handleSave('aboutMe', answers)} />;
            case 'Priorities':
            default:
                return <PrioritiesTab savedAnswers={allAnswers.priorities} onSave={(answers) => handleSave('priorities', answers)} setActiveTab={setActiveTab} />;
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