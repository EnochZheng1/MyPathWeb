import React from 'react';

const WhyCollegeModal = ({ isVisible, school, reasons, isLoading, onClose }) => {
    if (!isVisible) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <button className="modal-close-btn" onClick={onClose}>×</button>
                <h2>Why {school}?</h2>
                {isLoading ? (
                    <div className="loading-container">Finding reasons...</div>
                ) : (
                    <div className="reasons-list">
                        {reasons.map((item, index) => (
                            <div key={index} className="reason-item">
                                <h4>{item.title}</h4>
                                <p>{item.explanation}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default WhyCollegeModal;