import React from 'react';

const InterestsTab = ({ answers, onAnswersChange, setActiveTab }) => {
    const handleChange = (questionId, value) => {
        onAnswersChange({ ...answers, [questionId]: value });
    };

    const handleNext = () => {
        setActiveTab('About Me');
    };

    return (
        <div className="form-container">
            <div className="form-group">
                <label>Do you have a career or major in mind?</label>
                <input type="text" className="form-input" value={answers.i1 || ''} onChange={(e) => handleChange('i1', e.target.value)} />
            </div>
            <div className="form-group">
                <label>What are your favorite subjects? Why?</label>
                <textarea className="form-input" rows="4" value={answers.i2 || ''} onChange={(e) => handleChange('i2', e.target.value)} />
            </div>
            <div className="form-group">
                <label>What do you do in your free time?</label>
                <textarea className="form-input" rows="4" value={answers.i3 || ''} onChange={(e) => handleChange('i3', e.target.value)} />
            </div>
            <div className="form-actions">
                <button className="btn btn-primary" onClick={handleNext}>Next</button>
            </div>
        </div>
    );
};

export default InterestsTab;