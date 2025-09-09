import React from 'react';
import SliderInput from './SliderInput';

const PrioritiesTab = ({ answers, onAnswersChange, setActiveTab }) => {
    const handleChange = (questionId, value) => {
        onAnswersChange({ ...answers, [questionId]: value });
    };

    const handleNext = () => {
        setActiveTab('Interests');
    };

    return (
        <div className="form-container priorities-grid">
            <SliderInput label="Academics" value={answers.p1} onChange={(val) => handleChange('p1', val)} />
            <SliderInput label="Party Scene" value={answers.p2} onChange={(val) => handleChange('p2', val)} />
            <SliderInput label="Diversity" value={answers.p3} onChange={(val) => handleChange('p3', val)} />
            <SliderInput label="Local Area" value={answers.p4} onChange={(val) => handleChange('p4', val)} />
            <SliderInput label="Athletics" value={answers.p5} onChange={(val) => handleChange('p5', val)} />
            <SliderInput label="Safety" value={answers.p6} onChange={(val) => handleChange('p6', val)} />
            <SliderInput label="Campus" value={answers.p7} onChange={(val) => handleChange('p7', val)} />
            <SliderInput label="Affordability" value={answers.p8} onChange={(val) => handleChange('p8', val)} />
            <div className="form-actions">
                <button className="btn btn-primary" onClick={handleNext}>Next</button>
            </div>
        </div>
    );
};

export default PrioritiesTab;