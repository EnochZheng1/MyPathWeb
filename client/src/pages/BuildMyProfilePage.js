import React, { useState, useEffect, useCallback, useRef } from 'react';
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
        if (!userId || !data || Object.keys(data).length === 0) return;
        
        clearTimeout(debounceTimeoutRef.current);
        setIsSaving(true);

        try {
            await apiService(`/profile/${userId}`, 'PUT', {
                questionnaire: { [category]: data }
            });
        } catch (error) {
            console.error(`Save failed for ${category}: ${error.message}`);
        } finally {
            setTimeout(() => setIsSaving(false), 1000);
        }
    }, [userId]);
    
    useEffect(() => {
        if (isLoading) return;

        if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
        }

        debounceTimeoutRef.current = setTimeout(() => {
            const categoryKey = activeTab.toLowerCase().replace(' ', '');
            const dataToSave = allAnswers[categoryKey];
            if (dataToSave) {
                 saveProfile(categoryKey, dataToSave);
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

    const handleTabSwitch = (newTab) => {
        const currentCategoryKey = activeTab.toLowerCase().replace(' ', '');
        const dataToSave = allAnswers[currentCategoryKey];
        if (dataToSave) {
            saveProfile(currentCategoryKey, dataToSave);
        }
        setActiveTab(newTab);
    };

    const handleFinish = () => {
        const dataToSave = allAnswers.aboutMe;
        if (dataToSave) {
            saveProfile('aboutMe', dataToSave);
        }
        navigate('/account');
    };

    const handleBackToAccount = () => {
        const currentCategoryKey = activeTab.toLowerCase().replace(' ', '');
        const dataToSave = allAnswers[currentCategoryKey];
        if (dataToSave) {
            saveProfile(currentCategoryKey, dataToSave);
        }
        navigate('/account');
    };

    const renderActiveTab = () => {
        if (isLoading) return <div>Loading profile...</div>;

        switch (activeTab) {
            case 'Interests':
                return <InterestsTab
                    answers={allAnswers.interests || {}}
                    onAnswersChange={(answers) => handleAnswersChange('interests', answers)}
                    onNext={() => handleTabSwitch('About Me')} />;
            case 'About Me':
                return <AboutMeTab
                    answers={allAnswers.aboutMe || {}}
                    onAnswersChange={(answers) => handleAnswersChange('aboutMe', answers)}
                    onFinish={handleFinish} />;
            case 'Priorities':
            default:
                return <PrioritiesTab
                    answers={allAnswers.priorities || {}}
                    onAnswersChange={(answers) => handleAnswersChange('priorities', answers)}
                    onNext={() => handleTabSwitch('Interests')} />;
        }
    };

    return (
        <div className="build-profile-container">
            <div className="main-content">
                <div className="profile-header">
                    <button className="back-btn" onClick={handleBackToAccount}>&larr; My Account</button>
                    <h1>Build My Profile {isSaving && <span style={{fontSize: '1rem', color: '#aaa'}}>Saving...</span>}</h1>
                </div>
                <div className="profile-content">
                    <div className="tab-navigation">
                        <button onClick={() => handleTabSwitch('Priorities')} className={activeTab === 'Priorities' ? 'active' : ''}>Priorities</button>
                        <button onClick={() => handleTabSwitch('Interests')} className={activeTab === 'Interests' ? 'active' : ''}>Interests</button>
                        <button onClick={() => handleTabSwitch('About Me')} className={activeTab === 'About Me' ? 'active' : ''}>About Me</button>
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