// client/src/api.js
const API_URL = process.env.BACKEND || 'http://localhost:3001/api';

const apiService = async (endpoint, method = 'GET', body = null) => {
    try {
        const options = {
            method,
            headers: { 'Content-Type': 'application/json' },
        };
        if (body) {
            options.body = JSON.stringify(body);
        }

        const response = await fetch(`${API_URL}${endpoint}`, options);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'An error occurred.');
        }
        return data;
    } catch (error) {
        console.error(`API service error calling ${endpoint}:`, error);
        throw error;
    }
};

export default apiService;