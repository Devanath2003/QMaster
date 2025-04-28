import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import Navbar from './components/Navbar.jsx';
import Home from './pages/Home.jsx';
import About from './pages/About.jsx';
import SignIn from './pages/Signin.jsx';
import SignUp from './pages/Signup.jsx';
import StudentDashboard from './pages/StudentDashboard.jsx';
import StudentResults from './pages/StudentResults.jsx';
import QuestionPool from './components/QuestionPool.jsx';
import Profile from './components/Profile.jsx'; // Ensure this import is correct
import Teacher from './components/Teacher.jsx';
import Leaderboard from './components/Leaderboard.jsx';
import SubmissionReview from './components/SubmissionReview.jsx';
import QuestionHistory from './components/QuestionHistory.jsx';
import './App.css';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [role, setRole] = useState(localStorage.getItem('role') || '');
  const [latestToken, setLatestToken] = useState(localStorage.getItem('latestToken') || '');

  useEffect(() => {
    const fetchProfile = async () => {
      if (!token) return;
      try {
        const res = await axios.get('http://localhost:5000/api/profile', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setLatestToken(res.data.latestToken || '');
      } catch (error) {
        console.error('Failed to fetch profile:', error);
        setLatestToken('');
      }
    };
    fetchProfile();
  }, [token]);

  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
      localStorage.setItem('role', role);
      localStorage.setItem('latestToken', latestToken);
    } else {
      localStorage.removeItem('token');
      localStorage.removeItem('role');
      localStorage.removeItem('latestToken');
      setLatestToken('');
    }
  }, [token, role, latestToken]);

  const updateLatestToken = (newToken) => {
    setLatestToken(newToken);
  };

  return (
    <Router>
      <div className="app">
        <Navbar token={token} setToken={setToken} setRole={setRole} role={role} tokenId={latestToken} />
        <div className="container">
          <div className="card">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route
                path="/signin"
                element={token ? <Navigate to={role === 'teacher' ? '/teacher' : '/student'} /> : <SignIn setToken={setToken} setRole={setRole} />}
              />
              <Route
                path="/signup"
                element={token ? <Navigate to={role === 'teacher' ? '/teacher' : '/student'} /> : <SignUp />}
              />
              <Route path="/about" element={<About />} />
              <Route
                path="/teacher"
                element={token && role === 'teacher' ? <Teacher token={token} role={role} updateLatestToken={updateLatestToken} /> : <Navigate to="/signin" />}
              />
              <Route
                path="/student"
                element={token && role === 'student' ? <StudentDashboard token={token} role={role} /> : <Navigate to="/signin" />}
              />
              <Route
                path="/profile"
                element={token ? <Profile token={token} role={role} setToken={setToken} setRole={setRole} /> : <Navigate to="/signin" />}
              />
              <Route
                path="/leaderboard/:token"
                element={token ? <Leaderboard token={token} role={role} /> : <Navigate to="/signin" />}
              />
              <Route
                path="/submissionsreview/:tokenId"
                element={token && role === 'teacher' ? <SubmissionReview token={token} role={role} /> : <Navigate to="/signin" />}
              />
              <Route
                path="/results"
                element={token && role === 'student' ? <StudentResults token={token} role={role} /> : <Navigate to="/signin" />}
              />
              <Route
                path="/teacher/questions/:tokenId"
                element={token && role === 'teacher' ? <QuestionPool token={token} role={role} /> : <Navigate to="/signin" />}
              />
              <Route
                path="/teacher/question-history/:tokenId"
                element={token && role === 'teacher' ? <QuestionHistory token={token} role={role} /> : <Navigate to="/signin" />}
              />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </div>
        </div>
      </div>
    </Router>
  );
}

export default App;