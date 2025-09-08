// client/src/pages/MyAccountPage.js
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom'; // 1. Import useNavigate
import apiService from '../api';
import ChatPanel from '../components/ChatPanel';
import { useUser } from '../context/UserContext';
import PdfReport from '../components/pdf/PdfReport';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const MyAccountPage = () => {
    const { userId } = useUser();
    const navigate = useNavigate(); // 2. Initialize the navigate function
    const [schedule, setSchedule] = useState({ checklist: [], catchUp: [] });
    const [profile, setProfile] = useState(null);
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
        if (!userId) {
            setIsLoading(false);
            return;
        };

        const fetchAllData = async () => {
            setIsLoading(true);
            try {
                // Use Promise.all to fetch all necessary data in parallel
                const [scheduleData, profileData] = await Promise.all([
                    apiService(`/profile/${userId}/schedule`),
                    apiService(`/profile/${userId}`) // We need the full profile for the PDF
                ]);
                setSchedule(scheduleData || { checklist: [], catchUp: [] });
                setProfile(profileData);
            } catch (error) {
                console.error("Could not load dashboard data:", error);
                setSchedule({ checklist: ['Generate your college list to see your tasks!'], catchUp: [] });
            } finally {
                setIsLoading(false);
            }
        };

        fetchAllData();
    }, [userId]);

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

    const handleExport = () => {
        if (!profile) {
            alert("Profile data is still loading. Please wait a moment and try again.");
            return;
        }
        const reportElement = document.getElementById('pdf-report-content');
        if (!reportElement) return;

        // Use a higher scale for better resolution
        html2canvas(reportElement, { scale: 2 }).then(canvas => {
            const pdf = new jsPDF('p', 'mm', 'a4'); // A4 size page
            
            const canvasWidth = canvas.width;
            const canvasHeight = canvas.height;
            
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            
            // Calculate the ratio to fit the canvas width to the PDF width
            const ratio = pdfWidth / canvasWidth;
            const imgHeight = canvasHeight * ratio;
            
            let heightLeft = imgHeight;
            let position = 0;
            
            // Add the first page
            pdf.addImage(canvas, 'PNG', 0, position, pdfWidth, imgHeight);
            heightLeft -= pdfHeight;
            
            // Add new pages as long as there is content left
            while (heightLeft > 0) {
                position = heightLeft - imgHeight; // Move the position up
                pdf.addPage();
                pdf.addImage(canvas, 'PNG', 0, position, pdfWidth, imgHeight);
                heightLeft -= pdfHeight;
            }
            
            pdf.save(`MyPath-Report-${profile.name}.pdf`);
        });
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
        <>
        {/* Render the hidden PDF component so it can be captured */}
        <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
            <PdfReport profile={profile} />
        </div>

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
                    <button className="btn btn-secondary" onClick={handleExport}>Export as PDF</button>
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
        </>
    );
};

export default MyAccountPage;