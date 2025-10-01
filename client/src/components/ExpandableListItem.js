// client/src/components/ExpandableListItem.js
import React, { useState } from 'react';

const ExpandableListItem = ({ item, index }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="expandable-item">
            <button
                type="button"
                className="expandable-header"
                onClick={() => setIsOpen((prev) => !prev)}
                aria-expanded={isOpen}
            >
                <span className="expandable-title">{index + 1}. {item.title}</span>
                <span
                    className={`expandable-toggle ${isOpen ? 'open' : ''}`}
                    aria-hidden="true"
                />
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