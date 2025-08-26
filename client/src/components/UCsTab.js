import React, { useState, useEffect, useCallback } from 'react';
import apiService from '../api';
import { useUser } from '../context/UserContext';

const UCsTab = () => {
    const { userId } = useUser();
    const [prompts, setPrompts] = useState([]);
    const [ideas, setIdeas] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [brainstormingId, setBrainstormingId] = useState(null);

    const loadData = useCallback(async () => {
        if (!userId) return;
        setIsLoading(true);
        try {
            const [promptsData, savedIdeasData] = await Promise.all([
                apiService('/essays/uc-prompts'),
                apiService(`/profile/${userId}/essays/uc-questions`)
            ]);
            setPrompts(promptsData);
            setIdeas(savedIdeasData || {});
        } catch (error) {
            alert("Failed to load UC PIQs.");
        } finally {
            setIsLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleBrainstorm = async (prompt) => {
        setBrainstormingId(prompt.id);
        try {
            const generatedIdeas = await apiService(`/profile/${userId}/essays/brainstorm`, 'POST', {
                prompt: prompt,
                promptType: 'ucQuestions' // Use the correct type for saving
            });
            setIdeas(prev => ({ ...prev, [prompt.id]: generatedIdeas }));
        } catch (error) {
            alert(`Failed to brainstorm ideas: ${error.message}`);
        } finally {
            setBrainstormingId(null);
        }
    };

    if (isLoading) return <div className="loading-container">Loading UC Questions...</div>;

    return (
        <div className="essay-prompts-list">
            <p className="tab-intro">You must choose 4 out of the 8 Personal Insight Questions to answer. Each response is limited to 350 words.</p>
            {prompts.map(prompt => (
                <div key={prompt.id} className="prompt-item">
                    <h4>{prompt.title}</h4>
                    <p>{prompt.details}</p>
                    <button
                        className="btn btn-secondary"
                        onClick={() => handleBrainstorm(prompt)}
                        disabled={brainstormingId === prompt.id}
                    >
                        {brainstormingId === prompt.id ? 'Thinking...' : 'Brainstorm Ideas'}
                    </button>
                    {ideas[prompt.id] && (
                        <div className="ideas-container">
                            <h5>Brainstorming Ideas:</h5>
                            <ul>
                                {ideas[prompt.id].map((idea, index) => (
                                    <li key={index}>{idea}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};

export default UCsTab;