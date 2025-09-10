import React, { useState } from 'react';

const AddTaskModal = ({ isOpen, onClose, onAddTask }) => {
    const [text, setText] = useState('');
    const [dueDate, setDueDate] = useState('');

    if (!isOpen) {
        return null;
    }

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!text.trim()) {
            alert("Please enter a task.");
            return;
        }
        onAddTask({ text, dueDate });
        // Reset form and close modal
        setText('');
        setDueDate('');
        onClose();
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <button className="modal-close-btn" onClick={onClose}>&times;</button>
                <h2>Add a New Task</h2>
                <form onSubmit={handleSubmit} className="modal-form">
                    <div className="form-group">
                        <label>Task Description</label>
                        <input
                            type="text"
                            className="form-input"
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            placeholder="e.g., Draft Common App Essay"
                            autoFocus
                        />
                    </div>
                    <div className="form-group">
                        <label>Due Date (Optional)</label>
                        <input
                            type="date"
                            className="form-input"
                            value={dueDate}
                            onChange={(e) => setDueDate(e.target.value)}
                        />
                    </div>
                    <div className="form-actions">
                        <button type="submit" className="btn btn-primary">Add Task</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddTaskModal;