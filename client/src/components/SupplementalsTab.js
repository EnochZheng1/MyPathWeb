import React, { useState, useEffect, useCallback } from 'react';
import apiService from '../api';
import { useUser } from '../context/UserContext';

const SupplementalsTab = () => {
    const { userId } = useUser();
    const [supplementals, setSupplementals] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const loadSupplementals = useCallback(async () => {
        if (!userId) return;
        setIsLoading(true);
        try {
            const data = await apiService(`/profile/${userId}/supplementals`);
            setSupplementals(data);
        } catch (error) {
            console.error("Error loading supplementals:", error);
        } finally {
            setIsLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        loadSupplementals();
    }, [loadSupplementals]);

    if (isLoading) {
        return <div className="loading-container">Loading Supplemental Essay Info...</div>;
    }

    return (
        <div className="supplementals-list">
            {supplementals.length === 0 ? (
                <p className="tab-placeholder">Your college list is empty. Add colleges to see their supplemental essay requirements here.</p>
            ) : (
                supplementals.map((item, index) => (
                    <div key={index} className="supplemental-item">
                        <span className="supplemental-school">{item.school}</span>
                        <span className="supplemental-count">{item.supplementalCount} Supplemental Essay{item.supplementalCount !== 1 ? 's' : ''}</span>
                        <button className="btn btn-primary go-btn">GO</button>
                    </div>
                ))
            )}
        </div>
    );
};

export default SupplementalsTab;