// client/src/components/ChatPanel.js

import React, { useState, useEffect, useRef, useCallback } from 'react';
import apiService from '../api';
import hedgeLogo from '../assets/hedge-logo.png';


const ChatPanel = ({ userId }) => {

    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [sessionId, setSessionId] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isTyping, setIsTyping] = useState(false);
    const chatMessagesRef = useRef(null);

    useEffect(() => {
        if (chatMessagesRef.current){
            chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
        }
    }, [messages, isTyping]);

    // Effect to load the user's most recent chat session on initial load
    const loadLatestSession = useCallback(async () => {
        if (!userId) {
            setMessages([{ id: 'initial', text: 'Hello! I am Hedge. How can I help with your college application journey today?', sender: 'hedge' }]);
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            const sessions = await apiService(`/chat/sessions/${userId}`);
            if (sessions && sessions.length > 0) {
                const latestSessionId = sessions[0].id;
                const sessionMessages = await apiService(`/chat/session/${latestSessionId}`);
                setMessages(sessionMessages && sessionMessages.length > 0
                  ? sessionMessages
                  : [{ id: 'initial', text: 'Hello! I am Hedge. How can I help with your college application journey today?', sender: 'hedge' }]
                );
                setSessionId(latestSessionId);
            } else {
                // If no history, start with a default welcome message
                setMessages([{ id: 'initial', text: 'Hello! I am Hedge. How can I help with your college application journey today?', sender: 'hedge' }]);
            }
        } catch (error) {
            console.error("Failed to load chat session:", error);
            // Fallback: ensure a welcome message appears if nothing loaded
            setMessages(prev => prev && prev.length > 0 ? prev : [
                { id: 'initial', text: 'Hello! I am Hedge. How can I help with your college application journey today?', sender: 'hedge' }
            ]);
        } finally {
            setIsLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        loadLatestSession();
    }, [loadLatestSession]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        const userMessage = { id: Date.now(), text: newMessage, sender: 'user' };
        setMessages(prev => [...prev, userMessage]);
        const currentMessage = newMessage;
        setNewMessage('');
        setIsTyping(true);

        try {
            const response = await apiService('/chat/message', 'POST', {
                userId,
                message: currentMessage,
                sessionId: sessionId
            });

            const hedgeMessage = { id: Date.now() + 1, text: response.reply, sender: 'hedge' };
            setMessages(prev => [...prev, hedgeMessage]);

            setSessionId(response.sessionId);
        } catch (error) {
            console.error("Failed to send message:", error);
            const errorMessage = { id: Date.now() + 1, text: "Sorry, I couldn't get a response. Please try again.", sender: 'hedge' };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsTyping(false);
        }
    };

    return (
        <div className="chat-panel">
            <div className="chat-header">Hedge</div>
            <div className="chat-messages" ref={chatMessagesRef}>
                {isLoading ? (
                    <div className="loading-container">Loading chat...</div>
                ) : (
                    messages.map((msg) => (
                        msg.sender === 'hedge' ? (
                            <div key={msg.id} className="message-row hedge">
                                <img className="message-avatar" src={hedgeLogo} alt="Hedge avatar" />
                                <div className="message hedge">{msg.text}</div>
                            </div>
                        ) : (
                            <div key={msg.id} className={`message ${msg.sender}`}>
                                {msg.text}
                            </div>
                        )
                    ))
                )}
                {isTyping && (
                    <div className="message-row hedge">
                        <img className="message-avatar" src={hedgeLogo} alt="Hedge avatar" />
                        <div className="message hedge typing">Hedge is typing...</div>
                    </div>
                )}
            </div>
            <form onSubmit={handleSendMessage}>
                <input
                    className="chat-input"
                    type="text"
                    placeholder="Ask anything"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    disabled={isTyping}
                />
            </form>
        </div>
    );
};

export default ChatPanel;
