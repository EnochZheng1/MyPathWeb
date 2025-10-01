import React, { useState, useEffect, useCallback } from 'react';
import apiService from '../api';
import { useUser } from '../context/UserContext';

const emptyForm = {
    school: '',
    prompt: '',
    wordLimit: ''
};

const SupplementalsTab = () => {
    const { userId } = useUser();
    const [overview, setOverview] = useState([]);
    const [supplementals, setSupplementals] = useState([]);
    const [formData, setFormData] = useState(emptyForm);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [brainstormingId, setBrainstormingId] = useState(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isOverviewOpen, setIsOverviewOpen] = useState(false);

    const loadSupplementals = useCallback(async () => {
        if (!userId) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            const data = await apiService(`/profile/${userId}/supplementals`);
            setOverview(data.overview || []);
            setSupplementals(data.prompts || []);
        } catch (error) {
            console.error('Error loading supplementals:', error);
        } finally {
            setIsLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        loadSupplementals();
    }, [loadSupplementals]);

    const handleChange = (field) => (event) => {
        const value = event.target.value;
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleAddPrompt = async (event) => {
        event.preventDefault();
        const trimmedSchool = formData.school.trim();
        const trimmedPrompt = formData.prompt.trim();

        if (!trimmedSchool || !trimmedPrompt) {
            alert('Please provide both a college name and the prompt text.');
            return;
        }

        setIsSubmitting(true);
        try {
            await apiService(`/profile/${userId}/supplementals`, 'POST', {
                school: trimmedSchool,
                prompt: trimmedPrompt,
                wordLimit: formData.wordLimit.trim()
            });
            setFormData(emptyForm);
            setIsAddModalOpen(false);
            await loadSupplementals();
        } catch (error) {
            alert(`Could not save supplemental prompt: ${error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeletePrompt = async (promptId) => {
        try {
            await apiService(`/profile/${userId}/supplementals/${promptId}`, 'DELETE');
            await loadSupplementals();
        } catch (error) {
            alert(`Could not delete supplemental prompt: ${error.message}`);
        }
    };

    const handleBrainstorm = async (entry) => {
        setBrainstormingId(entry.id);
        try {
            const ideas = await apiService(`/profile/${userId}/essays/brainstorm`, 'POST', {
                prompt: {
                    id: entry.id,
                    school: entry.school,
                    details: entry.prompt,
                    wordLimit: entry.wordLimit || ''
                },
                promptType: 'supplementals'
            });

            setSupplementals(prev => prev.map(item =>
                item.id === entry.id ? { ...item, ideas } : item
            ));
        } catch (error) {
            alert(`Failed to brainstorm: ${error.message}`);
        } finally {
            setBrainstormingId(null);
        }
    };

    const openAddModal = () => {
        setFormData(emptyForm);
        setIsAddModalOpen(true);
    };

    if (isLoading) {
        return <div className="loading-container">Loading Supplemental Prompts...</div>;
    }

    return (
        <div className="supplementals-wrapper">
            <p className="tab-intro">
                Keep track of every supplemental by adding the prompt text and optional word limit. When you're ready,
                let MyPath draft tailored brainstorming ideas.
            </p>

            <div className="supplementals-actions">
                <button
                    className="btn btn-secondary"
                    onClick={() => setIsOverviewOpen(true)}
                    disabled={!overview || overview.length === 0}
                >
                    Colleges on your list
                </button>
                <button className="btn btn-secondary" onClick={openAddModal}>
                    Add supplemental prompt
                </button>
            </div>

            <div className="supplementals-list">
                {supplementals.length === 0 ? (
                    <p className="supplementals-empty">
                        No supplemental prompts yet. Add your first one above to start brainstorming ideas.
                    </p>
                ) : (
                    supplementals.map(entry => (
                        <div key={entry.id} className="supplemental-entry">
                            <div className="supplemental-entry-header">
                                <div>
                                    <h4>{entry.school}</h4>
                                    <p className="supplemental-prompt">{entry.prompt}</p>
                                    {entry.wordLimit && (
                                        <span className="supplemental-wordlimit">Word limit: {entry.wordLimit}</span>
                                    )}
                                </div>
                                <div className="supplemental-actions">
                                    <button
                                        className="btn btn-secondary"
                                        onClick={() => handleBrainstorm(entry)}
                                        disabled={brainstormingId === entry.id}
                                    >
                                        {brainstormingId === entry.id ? 'Thinking...' : 'Brainstorm with AI'}
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        onClick={() => handleDeletePrompt(entry.id)}
                                    >
                                        Remove
                                    </button>
                                </div>
                            </div>

                            {entry.ideas && entry.ideas.length > 0 && (
                                <div className="ideas-container">
                                    <h5>Brainstorming Ideas:</h5>
                                    <ul>
                                        {entry.ideas.map((idea, index) => (
                                            <li key={index}>{idea}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {isAddModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content supplemental-modal-content">
                        <button className="modal-close-btn" onClick={() => setIsAddModalOpen(false)}>&times;</button>
                        <h4>Add a Supplemental Prompt</h4>
                        <form onSubmit={handleAddPrompt}>
                            <div className="supplemental-form-row">
                                <div className="form-group">
                                    <label htmlFor="supplemental-school">College</label>
                                    <input
                                        id="supplemental-school"
                                        type="text"
                                        className="form-input"
                                        value={formData.school}
                                        onChange={handleChange('school')}
                                        placeholder="e.g., Stanford University"
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="supplemental-wordlimit">Word Limit (optional)</label>
                                    <input
                                        id="supplemental-wordlimit"
                                        type="text"
                                        className="form-input"
                                        value={formData.wordLimit}
                                        onChange={handleChange('wordLimit')}
                                        placeholder="e.g., 150"
                                    />
                                </div>
                            </div>
                            <div className="form-group">
                                <label htmlFor="supplemental-prompt">Prompt</label>
                                <textarea
                                    id="supplemental-prompt"
                                    className="form-input"
                                    rows={4}
                                    value={formData.prompt}
                                    onChange={handleChange('prompt')}
                                    placeholder="Paste the question prompt here"
                                    required
                                />
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn btn-secondary" onClick={() => setIsAddModalOpen(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                                    {isSubmitting ? 'Saving...' : 'Save Prompt'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isOverviewOpen && (
                <div className="modal-overlay">
                    <div className="modal-content supplemental-modal-content">
                        <button className="modal-close-btn" onClick={() => setIsOverviewOpen(false)}>&times;</button>
                        <h4>Colleges on your list</h4>
                        {(!overview || overview.length === 0) ? (
                            <p className="supplementals-empty">No colleges available yet. Generate your college list first.</p>
                        ) : (
                            <ul className="modal-overview-list">
                                {overview.map((item, index) => (
                                    <li key={`${item.school || 'school'}-${index}`}>
                                        <strong>{item.school}</strong>
                                        <span>{item.supplementalCount} prompt{item.supplementalCount === 1 ? '' : 's'} added</span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SupplementalsTab;
