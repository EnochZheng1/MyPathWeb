// client/src/components/ExpandableListItem.js
import React, { useState } from 'react';

const ExpandableListItem = ({ item, index }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="expandable-item">
            <button className="expandable-header" onClick={() => setIsOpen(!isOpen)}>
                <span>{index + 1}. {item.title}</span>
                <span className={`arrow ${isOpen ? 'open' : ''}`}>^</span>
            </button>
            {isOpen && (
                <div className="expandable-content">
                    <p>{item.details}</p>
                </div>
            )}
        </div>
    );
};

export default ExpandableListItem;