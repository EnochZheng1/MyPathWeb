// client/src/pages/StrengthsImprovementsPage.js
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../api';
import { useUser } from '../context/UserContext';
import ChatPanel from '../components/ChatPanel';
import ExpandableListItem from '../components/ExpandableListItem';

const StrengthsImprovementsPage = () => {
    const { userId } = useUser();
    const navigate = useNavigate();
    const [strengths, setStrengths] = useState([]);
    const [improvements, setImprovements] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const loadData = useCallback(async () => {
        if (!userId) return;
        setIsLoading(true);
        try {
            // First, try to GET existing data
            const strengthsData = await apiService(`/profile/${userId}/strengths`);
            setStrengths(strengthsData);
        } catch (error) {
            // If it fails (404), POST to generate new data
            console.log("No saved strengths found, generating new ones...");
            const newStrengths = await apiService(`/profile/${userId}/analyze/strengths`, 'POST');
            setStrengths(newStrengths);
        }

        try {
            const improvementsData = await apiService(`/profile/${userId}/improvements`);
            setImprovements(improvementsData);
        } catch (error) {
            console.log("No saved improvements found, generating new ones...");
            const newImprovements = await apiService(`/profile/${userId}/analyze/improvements`, 'POST');
            setImprovements(newImprovements);
        } finally {
            setIsLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        loadData();
    }, [loadData]);


    const regenerateInsights = async () => {
        if (!userId) return;
        setIsRefreshing(true);
        try {
            const [latestStrengths, latestImprovements] = await Promise.all([
                apiService(`/profile/${userId}/analyze/strengths`, 'POST'),
                apiService(`/profile/${userId}/analyze/improvements`, 'POST')
            ]);
            setStrengths(latestStrengths);
            setImprovements(latestImprovements);
        } catch (error) {
            console.error('Failed to regenerate insights:', error);
            alert(`Could not regenerate insights: ${error.message}`);
        } finally {
            setIsRefreshing(false);
        }
    };
    return (
        <div className="report-page-container">
            <div className="main-content">
                <div className="profile-header">
                    <button className="back-btn" onClick={() => navigate('/account')}>&larr; My Account</button>
                    <div className="header-actions">
                        <h1>Strengths & Improvements</h1>
                        <button
                            className="btn btn-secondary"
                            onClick={regenerateInsights}
                            disabled={isLoading || isRefreshing}
                        >
                            {isRefreshing ? 'Regenerating...' : 'Regenerate insights'}
                        </button>
                    </div>
                </div>

                {isLoading ? (
                    <div className="loading-container">Analyzing your profile...</div>
                ) : (
                    <div className="report-section">
                        <h2 className="report-subtitle">Strengths</h2>
                        {strengths.map((item, index) => (
                            <ExpandableListItem key={index} item={item} index={index} />
                        ))}

                        <h2 className="report-subtitle improvements">Improvements</h2>
                        {improvements.map((item, index) => (
                            <ExpandableListItem key={index} item={item} index={index} />
                        ))}
                    </div>
                )}
            </div>
            <div className="chat-column">
                <ChatPanel userId={userId} />
            </div>
        </div>
    );
};

export default StrengthsImprovementsPage;