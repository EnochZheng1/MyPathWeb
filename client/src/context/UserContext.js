// client/src/context/UserContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';

// 1. Create the context
const UserContext = createContext(null);

// 2. Create a custom hook for easy access
export const useUser = () => useContext(UserContext);

// 3. Create the Provider component
export const UserProvider = ({ children }) => {
    // Initialize state from localStorage to keep the user logged in
    const [userId, setUserId] = useState(() => localStorage.getItem('userId'));

    // Effect to update localStorage whenever the userId changes
    useEffect(() => {
        if (userId) {
            localStorage.setItem('userId', userId);
        } else {
            localStorage.removeItem('userId');
        }
    }, [userId]);

    // The value provided to consuming components
    const value = { userId, setUserId };

    return (
        <UserContext.Provider value={value}>
            {children}
        </UserContext.Provider>
    );
};