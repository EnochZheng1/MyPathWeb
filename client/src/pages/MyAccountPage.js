// client/src/pages/MyAccountPage.js
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom'; // 1. Import useNavigate
import apiService from '../api';
import ChatPanel from '../components/ChatPanel';
import { useUser } from '../context/UserContext';

const MyAccountPage = () => {
    const { userId } = useUser();
    const navigate = useNavigate(); // 2. Initialize the navigate function
    const [schedule, setSchedule] = useState({ checklist: [], catchUp: [] });
    const [isLoading, setIsLoading] = useState(true);

    const fetchSchedule = useCallback(async () => {
        if (!userId) return;
        setIsLoading(true);
        try {
            const scheduleData = await apiService(`/profile/${userId}/schedule`);
            setSchedule(scheduleData || { checklist: [], catchUp: [] });
        } catch (error) {
            console.error("Could not load schedule:", error);
        } finally {
            setIsLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        fetchSchedule();
    }, [fetchSchedule]);

    const handleToggleTask = async (taskId, currentStatus) => {
        const newStatus = currentStatus === 'completed' ? 'incomplete' : 'completed';
        try {
            const updatedSchedule = await apiService(
                `/profile/${userId}/schedule/tasks/${taskId}`,
                'PUT',
                { status: newStatus }
            );
            setSchedule(updatedSchedule);
        } catch (error) {
            alert(`Could not update task: ${error.message}`);
        }
    };

    // 3. Define the navigation handler functions
    const goToCollegeList = () => navigate('/college-list');
    const goToStrengths = () => navigate('/strengths-improvements');
    const goToEssays = () => navigate('/essays-activities');

    const renderTaskList = (tasks) => (
        <ul>
            {tasks.map(task => (
                <li
                    key={task.id}
                    className={task.status === 'completed' ? 'completed' : ''}
                    onClick={() => handleToggleTask(task.id, task.status)}
                >
                    {task.text}
                </li>
            ))}
        </ul>
    );

    return (
        <div className="account-page-container">
            <div className="main-content">
                <div className="account-header">
                    <div className="account-header-left">
                        <h2>My Account</h2>
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
                            <h3>My 2-Week Checklist</h3>
                            {isLoading ? <p>Loading...</p> : renderTaskList(schedule.checklist)}
                        </div>
                        <div className="catch-up-card">
                            <h3>Catch Up / Get Ahead</h3>
                             {isLoading ? <p>Loading...</p> : renderTaskList(schedule.catchUp)}
                        </div>
                    </div>
                    <div className="right-panel">
                        {/* 4. Use the onClick event to call the navigation handlers */}
                        <button className="report-btn" onClick={goToCollegeList}>College list & Application strategy</button>
                        <button className="report-btn" onClick={goToStrengths}>Strengths & Improvements</button>
                        <button className="report-btn" onClick={goToEssays}>Essay & Activities list</button>
                    </div>
                </div>
            </div>
            <div className="chat-column">
                <ChatPanel userId={userId} />
            </div>
        </div>
    );
};

export default MyAccountPage;