// client/src/pages/LoginPage.js
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import apiService from '../api';
import { useUser } from '../context/UserContext';
import '../App.css';

const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const { setUserId } = useUser();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const data = await apiService('/users/signin', 'POST', { email, password });
            setUserId(data.userId); // Save userId to global context
            navigate('/account'); // Redirect to the main dashboard
        } catch (error) {
            alert(`Login failed: ${error.message}`);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-form">
                <div className="auth-header">
                    <h2>Log in</h2>
                    <Link to="/signup" className="link-to-other">Sign up</Link>
                </div>
                <form onSubmit={handleSubmit}>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="form-input" placeholder="Email" required />
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="form-input" placeholder="Password" required />
                    <button type="submit" className="btn btn-primary full-width">Log In</button>
                </form>
            </div>
        </div>
    );
};

export default LoginPage;