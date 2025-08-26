import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const AboutMeTab = ({ savedAnswers, onSave }) => {
    const [scores, setScores] = useState({});
    const [activities, setActivities] = useState([{ id: `activity-${Date.now()}`, name: '', description: '' }]);
    const navigate = useNavigate();

    // This useEffect is crucial for populating the form with saved data
    useEffect(() => {
        if (savedAnswers) {
            setScores({
                uwgpa: savedAnswers.a1 || '',
                wgpa: savedAnswers.a2 || '',
                satReading: savedAnswers.a3 || '',
                satMath: savedAnswers.a4 || '',
                act: savedAnswers.a5 || ''
            });
            if (savedAnswers.a6 && savedAnswers.a6.length > 0) {
                const activitiesWithIds = savedAnswers.a6.map(act => ({
                    ...act,
                    id: act.id || `activity-${Date.now()}-${Math.random()}` // Add an ID if it's missing
                }));
                setActivities(activitiesWithIds);
            }
        }
    }, [savedAnswers]); // This runs whenever the savedAnswers prop changes

    const handleScoreChange = (field, value) => {
        setScores(prev => ({ ...prev, [field]: value }));
    };

    const handleActivityChange = (index, field, value) => {
        const newActivities = [...activities];
        newActivities[index][field] = value;
        setActivities(newActivities);
    };

    const addActivity = () => {
        setActivities([...activities, { id: `activity-${Date.now()}`, name: '', description: '' }]);
    };
    
    const handleSave = async () => {
        const answersToSave = {
            a1: scores.uwgpa,
            a2: scores.wgpa,
            a3: scores.satReading,
            a4: scores.satMath,
            a5: scores.act,
            a6: activities.filter(a => a.name.trim() !== '') // Only save activities with a name
        };
        const success = await onSave(answersToSave);
        if (success) {
            navigate('/account');
        }
    };

    return (
        <div className="form-container">
            <div className="score-grid">
                 <div className="form-group"><label>UW GPA</label><input type="text" className="form-input" value={scores.uwgpa || ''} onChange={e => handleScoreChange('uwgpa', e.target.value)} /></div>
                <div className="form-group"><label>W GPA</label><input type="text" className="form-input" value={scores.wgpa || ''} onChange={e => handleScoreChange('wgpa', e.target.value)} /></div>
                <div className="form-group"><label>SAT Reading</label><input type="text" className="form-input" value={scores.satReading || ''} onChange={e => handleScoreChange('satReading', e.target.value)} /></div>
                <div className="form-group"><label>SAT Math</label><input type="text" className="form-input" value={scores.satMath || ''} onChange={e => handleScoreChange('satMath', e.target.value)} /></div>
                <div className="form-group full-width"><label>ACT Score</label><input type="text" className="form-input" value={scores.act || ''} onChange={e => handleScoreChange('act', e.target.value)} /></div>
            </div>
            
            <hr className="divider" />

            <h3>Extracurricular Activities</h3>
            {activities.map((activity, index) => (
                <div key={index} className="activity-group">
                    <input type="text" className="form-input" placeholder="Activity Name" value={activity.name} onChange={e => handleActivityChange(index, 'name', e.target.value)} />
                    <textarea className="form-input" rows="3" placeholder="Description of Activity" value={activity.description} onChange={e => handleActivityChange(index, 'description', e.target.value)} />
                </div>
            ))}
            <button className="btn btn-secondary" onClick={addActivity}>+ Add Another Activity</button>

            <div className="form-actions">
                <button className="btn btn-primary" onClick={handleSave}>Save Profile</button>
            </div>
        </div>
    );
};

export default AboutMeTab;