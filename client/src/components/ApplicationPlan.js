// client/src/components/ApplicationPlan.js
import React from 'react';
import '../App.css';

const ApplicationPlan = ({ strategies }) => {
    // Helper to render a list of schools for a specific application type
    const renderStrategyList = (schools, type) => {
        if (!schools || schools.length === 0) {
            return null; // Don't render anything if there are no suggestions
        }
        return (
            <div className="strategy-wave">
                {schools.map((item, index) => (
                    <div key={index} className="strategy-item">
                        <span className={`strategy-badge ${type.toLowerCase()}`}>{type}</span>
                        <span className="strategy-school">{item.school}</span>
                        <span className="strategy-date">{item.deadline || 'Nov 1'}</span>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="application-plan-container">
            <h2>Your college list by application plan</h2>
            {renderStrategyList(strategies.earlyDecision, 'ED')}
            {renderStrategyList(strategies.earlyAction, 'EA')}
            {/* You can add sections for RD waves here as the feature evolves */}
        </div>
    );
};

export default ApplicationPlan;