// client/src/components/AboutMeTab.js
import React from 'react';

const AboutMeTab = ({ answers, onAnswersChange, onFinish }) => {

    const scores = {
        uwgpa: answers.a1 || '',
        wgpa: answers.a2 || '',
        satReading: answers.a3 || '',
        satMath: answers.a4 || '',
        act: answers.a5 || ''
    };
    const activities = answers.a6 && answers.a6.length > 0
        ? answers.a6
        : [{ id: `activity-${Date.now()}`, name: '', description: '' }];

    const handleScoreChange = (field, value) => {
        const newScores = { ...scores, [field]: value };
        const updatedAnswers = {
            a1: newScores.uwgpa,
            a2: newScores.wgpa,
            a3: newScores.satReading,
            a4: newScores.satMath,
            a5: newScores.act,
            a6: activities
        };
        onAnswersChange(updatedAnswers);
    };

    const handleActivityChange = (index, field, value) => {
        const newActivities = activities.map((act, i) =>
            i === index ? { ...act, [field]: value } : act
        );
        onAnswersChange({ ...answers, a6: newActivities });
    };

    const addActivity = () => {
        const newActivities = [...activities, { id: `activity-${Date.now()}`, name: '', description: '' }];
        onAnswersChange({ ...answers, a6: newActivities });
    };

    return (
        <div className="form-container">
            <div className="score-grid">
                <div className="form-group"><label>UW GPA</label><input type="text" className="form-input" value={scores.uwgpa} onChange={e => handleScoreChange('uwgpa', e.target.value)} /></div>
                <div className="form-group"><label>W GPA</label><input type="text" className="form-input" value={scores.wgpa} onChange={e => handleScoreChange('wgpa', e.target.value)} /></div>
                <div className="form-group"><label>SAT Reading</label><input type="text" className="form-input" value={scores.satReading} onChange={e => handleScoreChange('satReading', e.target.value)} /></div>
                <div className="form-group"><label>SAT Math</label><input type="text" className="form-input" value={scores.satMath} onChange={e => handleScoreChange('satMath', e.target.value)} /></div>
                <div className="form-group full-width"><label>ACT Score</label><input type="text" className="form-input" value={scores.act} onChange={e => handleScoreChange('act', e.target.value)} /></div>
            </div>
            
            <hr className="divider" />

            <h3>Extracurricular Activities</h3>
            {activities.map((activity, index) => (
                <div key={activity.id || index} className="activity-group">
                    <input type="text" className="form-input" placeholder="Activity Name" value={activity.name} onChange={e => handleActivityChange(index, 'name', e.target.value)} />
                    <textarea className="form-input" rows="3" placeholder="Description of Activity" value={activity.description} onChange={e => handleActivityChange(index, 'description', e.target.value)} />
                </div>
            ))}
            <button className="btn btn-secondary" onClick={addActivity}>+ Add Another Activity</button>

            <div className="form-actions">
                <button className="btn btn-primary" onClick={onFinish}>Finish</button>
            </div>
        </div>
    );
};

export default AboutMeTab;