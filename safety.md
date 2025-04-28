# Home

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaSignInAlt, FaUserPlus, FaInfoCircle } from 'react-icons/fa';

function Home() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-6 rounded-lg shadow-lg text-center max-w-md w-full">
        <h2 className="text-2xl font-bold mb-4">Welcome to QMaster</h2>
        <p className="text-gray-600 mb-6">Please sign in or sign up to continue.</p>
        <div className="flex justify-center space-x-4">
          <button onClick={() => navigate('/signin')} className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 flex items-center space-x-2">
            <FaSignInAlt />
            <span>Sign In</span>
          </button>
          <button onClick={() => navigate('/signup')} className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 flex items-center space-x-2">
            <FaUserPlus />
            <span>Sign Up</span>
          </button>
          <button onClick={() => navigate('/about')} className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 flex items-center space-x-2">
            <FaInfoCircle />
            <span>About</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default Home;

# Navbar

import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import logo from "../assets/logo.png";
function Navbar({ token, setToken, setRole, role, tokenId }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    setToken('');
    setRole('');
    localStorage.removeItem('teacherDashboardState'); // Clear persisted state on logout
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('latestToken');
    navigate('/');
  };

  return (
    <nav className="bg-blue-800 text-white p-4">
      <div className="container mx-auto flex items-center">
      <img src={logo} alt="logo" className='h-16 w-auto' />
        <Link to="/" className="text-xl font-bold">QMaster</Link>
        <div className="flex space-x-6 text-lg font-medium ml-auto">
          <Link to="/about" className="hover:underline">About</Link>
          {token ? (
            <>
              {role === 'teacher' && (
                <>
                  <Link to="/teacher" className="hover:underline">Teacher Dashboard</Link>
                  {tokenId && (
                    <>
                      <Link to={`/leaderboard/${tokenId}`} className="hover:underline">Leaderboard</Link>
                      <Link to={`/submissionsreview/${tokenId}`} className="hover:underline">Submissions</Link>
                    </>
                  )}
                </>
              )}
              {role === 'student' && (
                <>
                  <Link to="/student" className="hover:underline">Student Dashboard</Link>
                  <Link to="/results" className="hover:underline">Results</Link>
                </>
              )}
              <Link to="/profile" className="hover:underline">Profile</Link>
              <button onClick={handleLogout} className="hover:underline">Logout</button>
            </>
          ) : (
            <>
              <Link to="/signin" className="hover:underline">Sign In</Link>
              <Link to="/signup" className="hover:underline">Sign Up</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;

# Teacher

import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import {
  FaUpload,
  FaQuestionCircle,
  FaCheckSquare,
  FaTrophy,
  FaUser,
  FaWhatsapp,
  FaEnvelope,
  FaTimes,
} from 'react-icons/fa';

function Teacher({ token, role, updateLatestToken }) {
  const loadInitialState = () => {
    const savedState = localStorage.getItem('teacherDashboardState');
    if (savedState) {
      const parsed = JSON.parse(savedState);
      parsed.pdfFile = null; // Reset pdfFile as it can't be persisted
      return parsed;
    }
    return {
      inputType: 'text',
      textContent: '',
      pdfFile: null,
      numMCQs: 5,
      numDescriptive: 3,
      mcqMarks: 2,
      descriptiveMarks: 10,
      tokenId: '',
      message: '',
      showTokenModal: false,
      generatedToken: '',
      subject: 'General',
      requestId: '',
      isPolling: false,
    };
  };

  const [state, setState] = useState(loadInitialState());
  const {
    inputType,
    textContent,
    pdfFile,
    numMCQs,
    numDescriptive,
    mcqMarks,
    descriptiveMarks,
    tokenId,
    message,
    showTokenModal,
    generatedToken,
    subject,
    requestId,
    isPolling,
  } = state;

  const navigate = useNavigate();

  useEffect(() => {
    const stateToSave = { ...state, pdfFile: null }; // Exclude pdfFile from being saved
    localStorage.setItem('teacherDashboardState', JSON.stringify(stateToSave));
  }, [state]);

  const clearState = () => {
    const initialState = {
      inputType: 'text',
      textContent: '',
      pdfFile: null,
      numMCQs: 5,
      numDescriptive: 3,
      mcqMarks: 2,
      descriptiveMarks: 10,
      tokenId: '',
      message: '',
      showTokenModal: false,
      generatedToken: '',
      subject: 'General',
      requestId: '',
      isPolling: false,
    };
    setState(initialState);
    localStorage.setItem('teacherDashboardState', JSON.stringify(initialState));
  };

  useEffect(() => {
    if (role !== 'teacher') {
      navigate('/');
    }
  }, [role, navigate]);

  useEffect(() => {
    let pollingInterval;
    if (requestId && isPolling) {
      pollingInterval = setInterval(async () => {
        try {
          const res = await axios.get(`http://localhost:5000/api/token-status/${requestId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const { status, token: newToken, error } = res.data;
          if (status === 'completed') {
            setState(prev => ({
              ...prev,
              tokenId: newToken,
              generatedToken: newToken,
              showTokenModal: true,
              message: 'Content uploaded successfully',
              isPolling: false,
              requestId: '',
            }));
            updateLatestToken(newToken);
            clearInterval(pollingInterval);
          } else if (status === 'failed') {
            setState(prev => ({
              ...prev,
              message: error || 'Upload failed',
              isPolling: false,
              requestId: '',
            }));
            clearInterval(pollingInterval);
          }
        } catch (error) {
          setState(prev => ({
            ...prev,
            message: error.response?.data?.error || 'Failed to check token status',
            isPolling: false,
            requestId: '',
          }));
          clearInterval(pollingInterval);
        }
      }, 2000); // Poll every 2 seconds
    }
    return () => clearInterval(pollingInterval);
  }, [requestId, isPolling, token, updateLatestToken]);

  const updateState = (newState) => {
    setState(prev => ({ ...prev, ...newState }));
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!subject.trim()) {
      updateState({ message: 'Please enter a subject' });
      return;
    }
    const formData = new FormData();
    formData.append('inputType', inputType);
    formData.append('subject', subject);

    if (inputType === 'text') {
      if (!textContent.trim()) {
        updateState({ message: 'Please provide text content' });
        return;
      }
      formData.append('textContent', textContent);
    } else if (inputType === 'pdf') {
      if (!pdfFile) {
        updateState({ message: 'Please upload a PDF file' });
        return;
      }
      formData.append('pdf', pdfFile);
    }

    formData.append('numMCQs', numMCQs);
    formData.append('numDescriptive', numDescriptive);
    formData.append('mcqMarks', mcqMarks);
    formData.append('descriptiveMarks', descriptiveMarks);

    try {
      const res = await axios.post('http://localhost:5000/api/upload-content', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });
      const newRequestId = res.data.request_id;
      updateState({
        requestId: newRequestId,
        isPolling: true,
        message: 'Processing content, please wait...',
      });
    } catch (error) {
      updateState({ message: error.response?.data?.error || 'Upload failed' });
    }
  };

  const handleFetchQuestions = () => {
    if (!tokenId) {
      updateState({ message: 'Please upload content and wait for processing to complete before fetching questions.' });
      return;
    }
    // Navigate to QuestionPool component instead of fetching questions here
    navigate(`/teacher/questions/${tokenId}`);
  };

  const handleViewResults = () => {
    navigate(`/leaderboard/${tokenId}`);
  };

  return (
    <div className="min-h-screen bg-gray-100 py-6">
      <div className="container mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">Teacher Dashboard</h1>
        <div className="bg-white shadow-lg rounded-lg p-6">
          <h2 className="text-2xl font-semibold text-gray-700 mb-4">Upload Content</h2>
          <form onSubmit={handleUpload} className="space-y-4">
            <div>
              <label htmlFor="subject" className="block text-sm font-medium text-gray-700">
                Subject
              </label>
              <input
                type="text"
                id="subject"
                value={subject}
                onChange={(e) => updateState({ subject: e.target.value })}
                placeholder="Enter subject (e.g., Math, Science)"
                className="mt-1 block w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label htmlFor="inputType" className="block text-sm font-medium text-gray-700">
                Select Input Type
              </label>
              <select
                id="inputType"
                value={inputType}
                onChange={(e) => {
                  updateState({ inputType: e.target.value, textContent: '', pdfFile: null });
                }}
                className="mt-1 block w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="text">Text</option>
                <option value="pdf">PDF</option>
              </select>
            </div>

            {inputType === 'text' ? (
              <div>
                <label htmlFor="textContent" className="block text-sm font-medium text-gray-700">
                  Text Content
                </label>
                <textarea
                  id="textContent"
                  value={textContent}
                  onChange={(e) => updateState({ textContent: e.target.value })}
                  placeholder="Paste text for question generation (up to 3000 words)"
                  className="mt-1 block w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows="5"
                />
              </div>
            ) : (
              <div>
                <label htmlFor="pdfFile" className="block text-sm font-medium text-gray-700">
                  Upload PDF
                </label>
                <input
                  id="pdfFile"
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => updateState({ pdfFile: e.target.files[0] })}
                  className="mt-1 block w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            )}

            <div>
              <label htmlFor="numMCQs" className="block text-sm font-medium text-gray-700">
                Number of MCQs to Generate
              </label>
              <input
                id="numMCQs"
                type="number"
                value={numMCQs}
                onChange={(e) => updateState({ numMCQs: Math.max(e.target.value) })}
                placeholder="Number of MCQs"
                className="mt-1 block w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                
              />
            </div>
            <div>
              <label htmlFor="numDescriptive" className="block text-sm font-medium text-gray-700">
                Number of Descriptive Questions to Generate
              </label>
              <input
                id="numDescriptive"
                type="number"
                value={numDescriptive}
                onChange={(e) => updateState({ numDescriptive: Math.max(e.target.value) })}
                placeholder="Number of Descriptive Questions"
                className="mt-1 block w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                
              />
            </div>
            <div>
              <label htmlFor="mcqMarks" className="block text-sm font-medium text-gray-700">
                Marks per MCQ
              </label>
              <input
                id="mcqMarks"
                type="number"
                value={mcqMarks}
                onChange={(e) => updateState({ mcqMarks: Math.max(1, e.target.value) })}
                placeholder="Marks per MCQ"
                className="mt-1 block w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                min="1"
                step="0.5"
              />
            </div>
            <div>
              <label htmlFor="descriptiveMarks" className="block text-sm font-medium text-gray-700">
                Marks per Descriptive
              </label>
              <input
                id="descriptiveMarks"
                type="number"
                value={descriptiveMarks}
                onChange={(e) => updateState({ descriptiveMarks: Math.max(1, e.target.value) })}
                placeholder="Marks per Descriptive"
                className="mt-1 block w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                min="1"
                step="0.5"
              />
            </div>
            <button
              type="submit"
              disabled={(!subject || (inputType === 'text' && !textContent) || (inputType === 'pdf' && !pdfFile)) || isPolling}
              className="w-full bg-blue-600 text-white p-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              <FaUpload />
              <span>{isPolling ? 'Processing...' : 'Upload'}</span>
            </button>
          </form>

          {message && (
            <div
              className={`mt-4 p-3 rounded-md text-center ${
                message.includes('success') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}
            >
              {message}
            </div>
          )}

          {tokenId && (
            <div className="mt-6">
              <h3 className="text-xl font-semibold text-gray-700 mb-4">
                Token: {tokenId} | Subject: {subject}
              </h3>
              <button
                onClick={handleFetchQuestions}
                className="bg-green-600 text-white p-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 mb-4 flex items-center space-x-2"
              >
                <FaQuestionCircle />
                <span>Fetch Question Pool</span>
              </button>

              <div className="flex justify-between space-x-4">
                <button
                  onClick={handleViewResults}
                  className="flex-1 bg-gray-600 text-white p-2 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 flex items-center justify-center space-x-2"
                >
                  <FaTrophy />
                  <span>View Results</span>
                </button>
                <button
                  onClick={() => navigate('/profile')}
                  className="flex-1 bg-purple-600 text-white p-2 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 flex items-center justify-center space-x-2"
                >
                  <FaUser />
                  <span>View Profile</span>
                </button>
              </div>
            </div>
          )}

          {showTokenModal && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
                <h3 className="text-xl font-bold text-gray-800 mb-4">Upload Successful!</h3>
                <p className="text-gray-700 mb-2"><strong>Generated Token:</strong> {generatedToken}</p>
                <p className="text-gray-700 mb-4"><strong>Subject:</strong> {subject}</p>
                <div className="flex justify-center space-x-4">
                  <a
                    href={`https://api.whatsapp.com/send?text=Here%20is%20my%20QMaster%20token:%20${generatedToken}%20(Subject:%20${subject})`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 flex items-center space-x-2"
                  >
                    <FaWhatsapp />
                    <span>Share via WhatsApp</span>
                  </a>
                  <a
                    href={`mailto:?subject=QMaster%20Token&body=Here%20is%20my%20QMaster%20token:%20${generatedToken}%20(Subject:%20${subject})`}
                    className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 flex items-center space-x-2"
                  >
                    <FaEnvelope />
                    <span>Share via Gmail</span>
                  </a>
                </div>
                <button
                  onClick={() => updateState({ showTokenModal: false })}
                  className="mt-6 w-full bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 flex items-center justify-center space-x-2"
                >
                  <FaTimes />
                  <span>Close</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Teacher;


# Nav bar-animated

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaSignInAlt, FaUserPlus, FaUser, FaSignOutAlt, FaChalkboardTeacher, FaGraduationCap, FaTrophy, FaClipboardList, FaInfoCircle } from 'react-icons/fa';
import logo from "../assets/logo.png";

function Navbar({ token, setToken, setRole, role, tokenId }) {
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [hoverIndex, setHoverIndex] = useState(null);

  const handleLogout = () => {
    setToken('');
    setRole('');
    localStorage.removeItem('teacherDashboardState');
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('latestToken');
    navigate('/');
  };

  // Animation variables for navbar links
  let desktopLinks = [];
  if (token) {
    if (role === 'teacher') {
      desktopLinks.push({ to: "/teacher", icon: <FaChalkboardTeacher className="mr-2" />, text: "Teacher Dashboard" });
      if (tokenId) {
        desktopLinks.push({ to: `/leaderboard/${tokenId}`, icon: <FaTrophy className="mr-2" />, text: "Leaderboard" });
        desktopLinks.push({ to: `/submissionsreview/${tokenId}`, icon: <FaClipboardList className="mr-2" />, text: "Submissions" });
      }
    } else if (role === 'student') {
      desktopLinks.push({ to: "/student", icon: <FaGraduationCap className="mr-2" />, text: "Student Dashboard" });
      desktopLinks.push({ to: "/results", icon: <FaClipboardList className="mr-2" />, text: "Results" });
    }
    desktopLinks.push({ to: "/profile", icon: <FaUser className="mr-2" />, text: "Profile" });
  } else {
    desktopLinks.push({ to: "/signin", icon: <FaSignInAlt className="mr-2" />, text: "Sign In" });
  }
  
  // Always add About link at beginning
  desktopLinks.unshift({ to: "/about", icon: <FaInfoCircle className="mr-2" />, text: "About" });

  // Calculate SVG animation values
  const getStrokeDasharray = (index) => {
    const totalLinks = desktopLinks.length;
    const segmentLength = 100 / totalLinks;
    const startPosition = index * segmentLength;
    const endPosition = startPosition + segmentLength;
    
    // Return the stroke-dasharray value for this link
    return `0 ${startPosition} ${segmentLength} ${100 - endPosition}`;
  };

  return (
    <nav className="w-full z-50 bg-blue-800 shadow-md relative">
      <div className="container mx-auto px-4 relative">
        <div className="flex items-center justify-between h-16">
          {/* Logo Section */}
          <Link to="/" className="flex items-center group">
            <img
              src={logo}
              alt="QMaster Logo"
              className="h-10 w-auto transform group-hover:rotate-12 transition-transform duration-300"
            />
            <span className="ml-2 text-2xl font-bold text-white group-hover:text-blue-200 transition-colors duration-300">
              QMaster
            </span>
          </Link>

          {/* Desktop Navigation with animation */}
          <div className="hidden md:flex items-center justify-end relative" 
               style={{ height: '60px', flex: '1', maxWidth: '800px' }}
               onMouseLeave={() => setHoverIndex(null)}>
            <div className="flex items-center justify-around w-full">
              {desktopLinks.map((link, index) => (
                <Link
                  key={index}
                  to={link.to}
                  className="flex items-center px-4 py-2 text-white cursor-pointer hover:bg-white/20 transition-colors duration-300 z-10"
                  onMouseEnter={() => setHoverIndex(index)}
                >
                  {link.icon}
                  {link.text}
                </Link>
              ))}
              
              {token && (
                <button
                  onClick={handleLogout}
                  className="flex items-center px-4 py-2 text-white bg-blue-700 hover:bg-blue-600 rounded transition-colors duration-300 z-10 ml-2"
                  onMouseEnter={() => setHoverIndex(desktopLinks.length)}
                >
                  <FaSignOutAlt className="mr-2" />
                  Logout
                </button>
              )}
              
              {!token && (
                <Link
                  to="/signup"
                  className="flex items-center px-4 py-2 text-white bg-blue-700 hover:bg-blue-600 rounded transition-colors duration-300 z-10 ml-2"
                  onMouseEnter={() => setHoverIndex(desktopLinks.length)}
                >
                  <FaUserPlus className="mr-2" />
                  Sign Up
                </Link>
              )}
            </div>
            
            {/* Animated outline */}
            <svg
              className="absolute inset-0 pointer-events-none"
              width="100%"
              height="60"
              viewBox="0 0 800 60"
              xmlns="http://www.w3.org/2000/svg"
              style={{ width: '100%' }}
            >
              <rect
                x="0"
                y="0"
                width="100%"
                height="60"
                fill="transparent"
                stroke="#ffffff"
                strokeWidth="2"
                strokeDasharray={hoverIndex !== null ? getStrokeDasharray(hoverIndex) : "0 0 0 100"}
                pathLength="100"
                style={{ transition: '0.5s' }}
              />
            </svg>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-white hover:bg-blue-700 focus:outline-none"
            >
              <svg
                className={`${isMobileMenuOpen ? 'hidden' : 'block'} h-6 w-6`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
              <svg
                className={`${isMobileMenuOpen ? 'block' : 'hidden'} h-6 w-6`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <div className={`${isMobileMenuOpen ? 'block' : 'hidden'} md:hidden bg-blue-700`}>
        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
          <Link
            to="/about"
            className="flex items-center px-3 py-2 text-white hover:bg-blue-600 rounded-md"
          >
            <FaInfoCircle className="mr-2" />
            About
          </Link>

          {token ? (
            <>
              {role === 'teacher' && (
                <>
                  <Link
                    to="/teacher"
                    className="flex items-center px-3 py-2 text-white hover:bg-blue-600 rounded-md"
                  >
                    <FaChalkboardTeacher className="mr-2" />
                    Teacher Dashboard
                  </Link>
                  {tokenId && (
                    <>
                      <Link
                        to={`/leaderboard/${tokenId}`}
                        className="flex items-center px-3 py-2 text-white hover:bg-blue-600 rounded-md"
                      >
                        <FaTrophy className="mr-2" />
                        Leaderboard
                      </Link>
                      <Link
                        to={`/submissionsreview/${tokenId}`}
                        className="flex items-center px-3 py-2 text-white hover:bg-blue-600 rounded-md"
                      >
                        <FaClipboardList className="mr-2" />
                        Submissions
                      </Link>
                    </>
                  )}
                </>
              )}

              {role === 'student' && (
                <>
                  <Link
                    to="/student"
                    className="flex items-center px-3 py-2 text-white hover:bg-blue-600 rounded-md"
                  >
                    <FaGraduationCap className="mr-2" />
                    Student Dashboard
                  </Link>
                  <Link
                    to="/results"
                    className="flex items-center px-3 py-2 text-white hover:bg-blue-600 rounded-md"
                  >
                    <FaClipboardList className="mr-2" />
                    Results
                  </Link>
                </>
              )}

              <Link
                to="/profile"
                className="flex items-center px-3 py-2 text-white hover:bg-blue-600 rounded-md"
              >
                <FaUser className="mr-2" />
                Profile
              </Link>

              <button
                onClick={handleLogout}
                className="flex items-center w-full text-left px-3 py-2 text-white hover:bg-blue-600 rounded-md"
              >
                <FaSignOutAlt className="mr-2" />
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                to="/signin"
                className="flex items-center px-3 py-2 text-white hover:bg-blue-600 rounded-md"
              >
                <FaSignInAlt className="mr-2" />
                Sign In
              </Link>
              <Link
                to="/signup"
                className="flex items-center px-3 py-2 text-white hover:bg-blue-600 rounded-md"
              >
                <FaUserPlus className="mr-2" />
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
      
      {/* Add CSS for animation */}
      <style jsx>{`
        @keyframes dash {
          to {
            stroke-dashoffset: 0;
          }
        }
      `}</style>
    </nav>
  );
}

export default Navbar;