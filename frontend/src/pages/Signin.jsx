import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { FaSignInAlt, FaUserPlus, FaKey } from 'react-icons/fa';

function Signin({ setToken, setRole }) {
  const [identifier, setIdentifier] = useState(''); // Changed from username to identifier
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [forgotPassword, setForgotPassword] = useState(false);
  const [forgotUsername, setForgotUsername] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [step, setStep] = useState('send-otp');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('http://localhost:5000/api/login', {
        username: identifier, // Send identifier as username (backend handles email/username)
        password,
      });
      setToken(res.data.token);
      setRole(res.data.role);
      localStorage.setItem('token', res.data.token); // Persist token
      localStorage.setItem('role', res.data.role);   // Persist role
      setMessage('Login successful');
      // Navigate directly to the respective dashboard based on role
      navigate(res.data.role === 'teacher' ? '/teacher' : '/student');
    } catch (error) {
      // Specific error message for invalid credentials
      const errorMessage = error.response?.data?.error || 'Invalid username, email, or password';
      setMessage(errorMessage);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('http://localhost:5000/api/forgot-password', {
        username: forgotUsername,
      });
      setMessage(res.data.message);
      setStep('enter-otp');
    } catch (error) {
      setMessage(error.response?.data?.error || 'Failed to send OTP');
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setMessage('Passwords do not match');
      return;
    }
    try {
      const res = await axios.post('http://localhost:5000/api/reset-password', {
        username: forgotUsername,
        otp: forgotOtp,
        newPassword,
        confirmPassword,
      });
      setMessage(res.data.message);
      setForgotPassword(false);
      setForgotUsername('');
      setForgotOtp('');
      setNewPassword('');
      setConfirmPassword('');
      setStep('send-otp');
    } catch (error) {
      setMessage(error.response?.data?.error || 'Password reset failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-2xl font-bold text-center mb-6">Login</h2>
        {!forgotPassword ? (
          <form onSubmit={handleLogin}>
            <div className="mb-4">
              <label htmlFor="identifier" className="block text-gray-700 mb-1">Username or Email</label>
              <input
                type="text"
                id="identifier"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Username or Email"
                className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="mb-4">
              <label htmlFor="password" className="block text-gray-700 mb-1">Password</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex justify-center space-x-4">
              <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 flex items-center space-x-2">
                <FaSignInAlt />
                <span>Login</span>
              </button>
              <button type="button" onClick={() => navigate('/signup')} className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 flex items-center space-x-2">
                <FaUserPlus />
                <span>Go to Register</span>
              </button>
            </div>
            {message && (
              <p className={`text-center mt-4 ${message === 'Login successful' ? 'text-green-500' : 'text-red-500'}`}>
                {message}
              </p>
            )}
            <p
              className="text-center mt-2 text-blue-500 cursor-pointer hover:underline"
              onClick={() => setForgotPassword(true)}
            >
              Forgot Password?
            </p>
          </form>
        ) : (
          <form onSubmit={step === 'enter-otp' ? handleResetPassword : handleForgotPassword}>
            <div className="mb-4">
              <label htmlFor="forgotUsername" className="block text-gray-700 mb-1">Username</label>
              <input
                type="text"
                id="forgotUsername"
                value={forgotUsername}
                onChange={(e) => setForgotUsername(e.target.value)}
                placeholder="Username"
                className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {step === 'send-otp' && (
              <div className="flex justify-center">
                <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 flex items-center space-x-2">
                  <FaKey />
                  <span>Send OTP</span>
                </button>
              </div>
            )}
            {step === 'enter-otp' && (
              <>
                <div className="mb-4">
                  <label htmlFor="forgotOtp" className="block text-gray-700 mb-1">Enter OTP</label>
                  <input
                    type="text"
                    id="forgotOtp"
                    value={forgotOtp}
                    onChange={(e) => setForgotOtp(e.target.value)}
                    placeholder="Enter OTP"
                    className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="mb-4">
                  <label htmlFor="newPassword" className="block text-gray-700 mb-1">New Password</label>
                  <input
                    type="password"
                    id="newPassword"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="New Password"
                    className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="mb-4">
                  <label htmlFor="confirmPassword" className="block text-gray-700 mb-1">Confirm Password</label>
                  <input
                    type="password"
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm Password"
                    className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex justify-center">
                  <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 flex items-center space-x-2">
                    <FaKey />
                    <span>Reset Password</span>
                  </button>
                </div>
              </>
            )}
            <p
              className="text-center mt-4 text-blue-500 cursor-pointer hover:underline"
              onClick={() => {
                setForgotPassword(false);
                setForgotUsername('');
                setForgotOtp('');
                setNewPassword('');
                setConfirmPassword('');
                setStep('send-otp');
              }}
            >
              Back to Login
            </p>
            {message && (
              <p className={`text-center mt-4 ${message.includes('success') ? 'text-green-500' : 'text-red-500'}`}>
                {message}
              </p>
            )}
          </form>
        )}
      </div>
    </div>
  );
}

export default Signin;