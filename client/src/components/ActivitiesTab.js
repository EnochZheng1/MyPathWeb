import React, { useState, useEffect, useCallback } from 'react';
import apiService from '../api';
import { useUser } from '../context/UserContext';

const ActivitiesTab = () => {
    const { userId } = useUser();
    const [activities, setActivities] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [improvingId, setImprovingId] = useState(null); // To show a spinner on the specific item being improved

    const loadActivities = useCallback(async () => {
        if (!userId) return;
        setIsLoading(true);
        try {
            const savedAnswers = await apiService(`/profile/${userId}/answers`);
            // The activities are stored in the 'aboutMe' category under key 'a6'
            setActivities(savedAnswers.aboutMe?.a6 || []);
        } catch (error) {
            console.error("Error loading activities:", error);
        } finally {
            setIsLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        loadActivities();
    }, [loadActivities]);

    const handleImprove = async (activityId, currentDescription) => {
        try {
            const response = await apiService(`/profile/${userId}/activities/improve`, 'POST', {
                activityId: activityId,
                activityDescription: currentDescription
            });
            console.log(response);
            // Update the description in our local state with the new one from the API
            setActivities(prevActivities =>
                prevActivities.map(act =>
                    act.id === activityId
                        ? { ...act, description: response.improved_description }
                        : act
                )
            );
            loadActivities();
        } catch (error) {
            alert(`Failed to improve description: ${error.message}`);
        } finally {
            setImprovingId(null);
        }
    };

    if (isLoading) {
        return <div className="loading-container">Loading Activities...</div>;
    }

    return (
        <div className="activities-list">
            {activities.length === 0 ? (
                <p>You haven't added any activities yet. Go to "Build My Profile" to add them!</p>
            ) : (
                activities.map((activity) => (
                    <div key={activity.id} className="activity-item">
                        <div className="activity-info">
                            <h4>{activity.name}</h4>
                            <p>{activity.description}</p>
                        </div>
                        <button 
                            className="btn btn-secondary improve-btn" 
                            onClick={() => handleImprove(activity.id, activity.description)}
                            disabled={improvingId === activity.id}
                        >
                            {improvingId === activity.id ? 'Improving...' : 'Improve with AI'}
                        </button>
                    </div>
                ))
            )}
        </div>
    );
};

export default ActivitiesTab;