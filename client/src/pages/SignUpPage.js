// client/src/pages/SignUpPage.js
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import hedgeLogo from '../assets/hedge-logo.png';
import apiService from '../api';
import '../App.css';

const SignUpPage = () => {
    const [formData, setFormData] = useState({
        name: '',
        gradeLevel: '',
        age: '',
        school: '',
        email: '',
        password: '',
        confirmPassword: ''
    });
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (formData.password !== formData.confirmPassword) {
            alert("Passwords do not match!");
            return;
        }
        try {
            const { age, confirmPassword, ...apiData } = formData;
            await apiService('/users/create', 'POST', apiData);
            alert('Account created successfully!');
            navigate('/login');
        } catch (error) {
            alert(`Sign up failed: ${error.message}`);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-form">
                <img src={hedgeLogo} alt="Hedge Logo" style={{ width: '250px', display: 'block', margin: '0 auto 0px auto' }} />
                <div className="auth-header">
                    <h2>Sign up</h2>
                    <Link to="/login" className="link-to-other">Log in</Link>
                </div>
                <form onSubmit={handleSubmit}>
                    <input type="text" name="name" className="form-input" placeholder="Name" onChange={handleChange} required />
                    <div className="input-group">
                        <input type="text" name="gradeLevel" className="form-input" placeholder="Grade Level" onChange={handleChange} />
                        <input type="number" name="age" className="form-input" placeholder="Age" onChange={handleChange} />
                    </div>
                    <input type="text" name="school" className="form-input" placeholder="Current school" onChange={handleChange} />
                    <input type="email" name="email" className="form-input" placeholder="Email" onChange={handleChange} required />
                    <input type="password" name="password" className="form-input" placeholder="Create a password" onChange={handleChange} required />
                    <input type="password" name="confirmPassword" className="form-input" placeholder="Confirm password" onChange={handleChange} required />
                    <button type="submit" className="btn btn-primary full-width">Create account</button>
                </form>
            </div>
        </div>
    );
};

export default SignUpPage;
