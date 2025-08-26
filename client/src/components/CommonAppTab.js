// client/src/components/CommonAppTab.js
import React, { useState, useEffect, useCallback } from 'react';
import apiService from '../api';
import { useUser } from '../context/UserContext';

const CommonAppTab = () => {
    const { userId } = useUser();
    const [prompts, setPrompts] = useState([]);
    const [ideas, setIdeas] = useState({}); // This will now be populated with saved data
    const [isLoading, setIsLoading] = useState(true);
    const [brainstormingId, setBrainstormingId] = useState(null);

    // This function now loads both prompts and any saved ideas
    const loadData = useCallback(async () => {
        if (!userId) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            // Use Promise.all to fetch both sets of data concurrently
            const [promptsData, savedIdeasData] = await Promise.all([
                apiService('/essays/common-app-prompts'),
                apiService(`/profile/${userId}/essays/common-app`)
            ]);
            
            setPrompts(promptsData);
            setIdeas(savedIdeasData || {}); // Populate state with saved ideas

        } catch (error) {
            alert("Failed to load Common App data.");
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
                promptType: 'commonApp'
            });
            // Update the state with the newly generated ideas
            setIdeas(prev => ({ ...prev, [prompt.id]: generatedIdeas }));
        } catch (error) {
            alert(`Failed to brainstorm ideas: ${error.message}`);
        } finally {
            setBrainstormingId(null);
        }
    };

    if (isLoading) return <div className="loading-container">Loading Prompts...</div>;

    return (
        <div className="essay-prompts-list">
            {prompts.map(prompt => (
                <div key={prompt.id} className="prompt-item">
                    <h4>{prompt.title}</h4>
                    <p>{prompt.details}</p>
                    <button
                        className="btn btn-secondary"
                        onClick={() => handleBrainstorm(prompt)}
                        disabled={brainstormingId === prompt.id}
                    >
                        {brainstormingId === prompt.id ? 'Thinking...' : 'Brainstorm Ideas with AI'}
                    </button>
                    {/* This section will now show previously saved ideas on page load */}
                    {ideas[prompt.id] && (
                        <div className="ideas-container">
                            <h5>Here are a few ideas to get you started:</h5>
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

export default CommonAppTab;