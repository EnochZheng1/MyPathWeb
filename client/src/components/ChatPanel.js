// client/src/components/ChatPanel.js

import React from 'react';

const ChatPanel = ({ userId }) => {
    return (
        <div className="chat-panel">
            <div className="chat-header">Hedge</div>
            <div className="chat-messages">
                <div className="message hedge">
                    Hi Sophia! Let's check up and see how things are going. Have you joined any clubs, sports, or groups yet?
                </div>
                 <div className="message user">
                    Not yet, I'm still exploring my options.
                </div>
            </div>
            <form>
                <input
                    className="chat-input"
                    type="text"
                    placeholder="Ask anything"
                />
            </form>
        </div>
    );
};

export default ChatPanel;