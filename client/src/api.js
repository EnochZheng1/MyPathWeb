// client/src/api.js
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

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
        let data = null;
        const contentType = response.headers.get('content-type');

        if (response.status !== 204) {
            if (contentType && contentType.includes('application/json')) {
                data = await response.json();
            } else {
                data = await response.text();
            }
        }

        if (!response.ok) {
            const message = data && data.message ? data.message : 'An error occurred.';
            throw new Error(message);
        }

        return data;
    } catch (error) {
        console.error(`API service error calling ${endpoint}:`, error);
        throw error;
    }
};

export default apiService;
