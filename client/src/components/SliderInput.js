// client/src/components/SliderInput.js
import React from 'react';

const SliderInput = ({ label, value, onChange }) => {
    return (
        <div className="slider-group">
            <label>{label}</label>
            <div className="slider-container">
                <input
                    type="range"
                    min="0"
                    max="100"
                    value={value || 50}
                    className="slider"
                    onChange={(e) => onChange(e.target.value)}
                />
                <span>{value || 50}</span>
            </div>
        </div>
    );
};

export default SliderInput;