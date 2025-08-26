// client/src/pages/CollegeListPage.js
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../api';
import { useUser } from '../context/UserContext';
import ChatPanel from '../components/ChatPanel';
import ApplicationPlan from '../components/ApplicationPlan';

const CollegeListPage = () => {
    const { userId } = useUser();
    const navigate = useNavigate();
    const [collegeList, setCollegeList] = useState(null);
    const [strategies, setStrategies] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    const generateNewData = useCallback(async () => {
        if (!userId) return;
        setIsLoading(true);
        try {
            // These API calls will trigger the generation on the backend
            const listData = await apiService(`/colleges/generate`, 'POST', { userId });
            setCollegeList(listData);
            const strategyData = await apiService(`/strategies/generate`, 'POST', { userId });
            setStrategies(strategyData);
        } catch (error) {
            alert(`Failed to generate reports: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        const loadData = async () => {
            if (!userId) {
                setIsLoading(false);
                return;
            }
            setIsLoading(true);
            try {
                // 1. First, try to fetch existing reports
                const savedReports = await apiService(`/profile/${userId}/reports`);
                setCollegeList(savedReports.collegeList);
                setStrategies(savedReports.strategies);
            } catch (error) {
                // 2. If fetching fails (e.g., a 404), it means no reports exist.
                // So, we generate them for the first time.
                console.log("No saved reports found. Generating new ones...");
                await generateNewData();
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, [userId, generateNewData]);

    const renderCollegeRow = (college, index) => (
        <div key={index} className="college-row">
            <span>{index + 1}. {college.school}</span>
            <span>{college.admission_rate || 'N/A'}</span>
            <span>{college.test_policy || 'Test Optional'}</span>
            <button className="more-info-btn">→</button>
        </div>
    );

    return (
        <div className="report-page-container">
            <div className="main-content">
                <div className="profile-header">
                    <button className="back-btn" onClick={() => navigate('/account')}>&larr; My Account</button>
                    <h1>College List & Application Strategy</h1>
                </div>

                {isLoading ? (
                    <div className="loading-container">Generating your personalized reports...</div>
                ) : (
                    <>
                        {collegeList && (
                            <div className="report-section">
                                <div className="college-list-header">
                                    <span>Institution</span>
                                    <span>Admit Rate</span>
                                    <span>Testing</span>
                                    <span>More Info</span>
                                </div>
                                <h3>Reaches</h3>
                                {collegeList.reach.map(renderCollegeRow)}
                                <h3>Targets</h3>
                                {collegeList.target.map(renderCollegeRow)}
                                <h3>Likelies</h3>
                                {collegeList.likely.map(renderCollegeRow)}
                            </div>
                        )}

                        {strategies && (
                            <div className="report-section">
                                <ApplicationPlan strategies={strategies} />
                            </div>
                        )}
                    </>
                )}
            </div>

            <div className="chat-column">
                <ChatPanel userId={userId} />
            </div>
        </div>
    );
};

export default CollegeListPage;