// client/src/pages/BuildMyProfilePage.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../api';
import ChatPanel from '../components/ChatPanel';
import PrioritiesTab from '../components/PrioritiesTab';
import InterestsTab from '../components/InterestsTab';
import AboutMeTab from '../components/AboutMeTab';
import { useUser } from '../context/UserContext';
import { useDebounce } from '../hooks/useDebounce';

const BuildMyProfilePage = () => {
    const { userId } = useUser() || { userId: 'testuser@example.com' };
    const [activeTab, setActiveTab] = useState('Priorities');
    const [allAnswers, setAllAnswers] = useState({
        priorities: {},
        interests: {},
        aboutMe: {}
    });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const debounceTimeoutRef = useRef(null);
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

    const saveProfile = useCallback(async (category, data) => {
        if (!userId || !data) return;
        setIsSaving(true);
        try {
            await apiService(`/profile/${userId}`, 'PUT', {
                questionnaire: { [category]: data }
            });
            fetchAllAnswers();
        } catch (error){
            console.error(`Auto-save failed for ${category}: ${error.message}`);
        } finally {
            setTimeout(() => setIsSaving(false), 500);
        }
    }, [userId, fetchAllAnswers]);

    useEffect(() => {
        if (debounceTimeoutRef.current){
            clearTimeout(debounceTimeoutRef.current);
        }
        if (isLoading) return;
        debounceTimeoutRef.current = setTimeout(() => {
            const changedCategory = Object.keys(allAnswers).find(cat => {
                return true;
            });
            if (changedCategory && allAnswers[activeTab]) {
                saveProfile(activeTab.toLowerCase().replace(' ', ''), allAnswers[activeTab]);
            }
        }, 2000);
        return () => {
            if (debounceTimeoutRef.current) {
                clearTimeout(debounceTimeoutRef.current);
            }
        };
    }, [allAnswers, activeTab, isLoading, saveProfile]);

    const handleAnswersChange = (category, updatedCategoryAnswers) => {
        setAllAnswers(prev => ({
            ...prev,
            [category]: updatedCategoryAnswers
        }));
    };

    const renderActiveTab = () => {
        if (isLoading) return <div>Loading profile...</div>;

        switch (activeTab) {
            case 'Interests':
                return <InterestsTab
                    answers={allAnswers.interests || {}}
                    onAnswersChange={(answers) => handleAnswersChange('interests', answers)}
                    setActiveTab={setActiveTab} />;
            case 'About Me':
                return <AboutMeTab
                    answers={allAnswers.aboutMe || {}}
                    onAnswersChange={(answers) => handleAnswersChange('aboutMe', answers)} />;
            case 'Priorities':
            default:
                return <PrioritiesTab
                    answers={allAnswers.priorities || {}}
                    onAnswersChange={(answers) => handleAnswersChange('priorities', answers)}
                    setActiveTab={setActiveTab} />;
        }
    };

    return (
        <div className="build-profile-container">
            <div className="main-content">
                <div className="profile-header">
                    <button className="back-btn" onClick={() => navigate('/account')}>&larr; My Account</button>
                    <h1>Build My Profile {isSaving && <span className="saving-indicator">Saving...</span>}</h1>
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