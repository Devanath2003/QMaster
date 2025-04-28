import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import { FaEye, FaCheckSquare, FaTrophy, FaUser, FaWhatsapp, FaEnvelope, FaTimes, FaCopy } from 'react-icons/fa';

function QuestionPool({ token }) {
  const { tokenId } = useParams(); // Get tokenId from URL
  const [questions, setQuestions] = useState(null); // Initially null to track loading
  const [message, setMessage] = useState('');
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [desiredMCQs, setDesiredMCQs] = useState(5);
  const [desiredDescriptive, setDesiredDescriptive] = useState(3);
  const [showTestTokenModal, setShowTestTokenModal] = useState(false);
  const [testToken, setTestToken] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Fetch questions on component mount
  useEffect(() => {
    const fetchQuestions = async () => {
      if (!tokenId) {
        setError('Invalid token ID');
        setLoading(false);
        return;
      }
      setLoading(true);
      setError('');
      try {
        const res = await axios.get(`http://localhost:5000/api/teacher/questions/${tokenId}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        const { mcqs, descriptive, totalMCQs, totalDescriptive, subject: fetchedSubject } = res.data;
        setQuestions({ mcqs, descriptive, totalMCQs, totalDescriptive, subject: fetchedSubject || 'General' });

        if (totalMCQs < desiredMCQs) {
          setMessage(`Warning: Only ${totalMCQs} valid MCQs available, but ${desiredMCQs} requested.`);
          setDesiredMCQs(totalMCQs);
        }
        if (totalDescriptive < desiredDescriptive) {
          setMessage(`Warning: Only ${totalDescriptive} valid Descriptive questions available, but ${desiredDescriptive} requested.`);
          setDesiredDescriptive(totalDescriptive);
        } else {
          setMessage('Questions fetched successfully');
        }
      } catch (error) {
        setError(error.response?.data?.error || 'Failed to fetch questions');
      } finally {
        setLoading(false);
      }
    };
    fetchQuestions();
  }, [tokenId, token]);

  const handleCreateTest = async () => {
    if (desiredMCQs < 1 || desiredDescriptive < 1) {
      setMessage('Desired MCQs and Descriptive questions must be at least 1.');
      return;
    }
    if (desiredMCQs > questions.totalMCQs) {
      setMessage(`Cannot create test: Only ${questions.totalMCQs} valid MCQs available, but ${desiredMCQs} requested.`);
      return;
    }
    if (desiredDescriptive > questions.totalDescriptive) {
      setMessage(`Cannot create test: Only ${questions.totalDescriptive} valid Descriptive questions available, but ${desiredDescriptive} requested.`);
      return;
    }

    try {
      const res = await axios.post('http://localhost:5000/api/teacher/create-test', {
        token: tokenId,
        desiredMCQs,
        desiredDescriptive,
      }, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      setTestToken(res.data.testToken);
      setShowTestTokenModal(true);
      setMessage(`Test created! Token: ${res.data.testToken}`);
    } catch (error) {
      setMessage(error.response?.data?.error || 'Failed to create test');
    }
  };

  const handleViewResults = () => {
    navigate(`/leaderboard/${tokenId}`);
  };

  const formatOptions = (options) => {
    return options.map((opt, index) => `${String.fromCharCode(97 + index)}. ${opt}`).join('<br />');
  };

  const handleCopyToken = () => {
    navigator.clipboard.writeText(testToken)
      .then(() => {
        setMessage('Test token copied to clipboard!');
        setTimeout(() => setMessage(''), 2000); // Clear message after 2 seconds
      })
      .catch((err) => {
        setMessage('Failed to copy token to clipboard.');
      });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex justify-center items-center">
        <p className="text-xl text-gray-700">Loading questions...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 py-6">
        <div className="container mx-auto px-4">
          <div className="bg-white shadow-lg rounded-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4 text-center">Question Pool</h2>
            <p className="text-red-500 text-center mb-4">{error}</p>
            <div className="flex justify-center">
              <button
                onClick={() => navigate('/teacher')}
                className="bg-blue-500 text-white p-2 rounded flex items-center space-x-2 hover:bg-blue-600"
              >
                <span>Back to Dashboard</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!questions || (questions.totalMCQs === 0 && questions.totalDescriptive === 0)) {
    return (
      <div className="min-h-screen bg-gray-100 py-6">
        <div className="container mx-auto px-4">
          <div className="bg-white shadow-lg rounded-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4 text-center">Question Pool</h2>
            <p className="text-gray-700 text-center mb-4">No questions found for this token.</p>
            <div className="flex justify-center">
              <button
                onClick={() => navigate('/teacher')}
                className="bg-blue-500 text-white p-2 rounded flex items-center space-x-2 hover:bg-blue-600"
              >
                <span>Back to Dashboard</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-6">
      <div className="container mx-auto px-4">
        <div className="bg-white shadow-lg rounded-lg p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 text-center">Question Pool</h2>
          <h3 className="text-xl font-semibold text-gray-700 mb-4">
            Token: {tokenId} | Subject: {questions.subject}
          </h3>

          {questions.totalMCQs > 0 && (
            <>
              <h4 className="text-lg font-medium text-gray-700 mb-2">
                MCQs in Question Pool (Available: {questions.totalMCQs})
              </h4>
              {questions.mcqs.map((q, index) => (
                <div key={q._id} className="mb-2">
                  <div className="flex items-center">
                    <span className="text-gray-800">{index + 1}. {q.question}</span>
                    <button
                      onClick={() => setSelectedQuestion(q)}
                      className="ml-2 bg-blue-500 text-white p-1 rounded text-sm flex items-center space-x-1 hover:bg-blue-600"
                    >
                      <FaEye />
                      <span>View Details</span>
                    </button>
                  </div>
                  {selectedQuestion === q && (
                    <div className="ml-6 mt-2 p-4 bg-gray-50 rounded-md border">
                      <p className="font-medium">Options:</p>
                      <ul className="list-decimal ml-5 mt-1">
                        {q.options.map((opt, i) => (
                          <li
                            key={i}
                            className={q.correctAnswer === opt ? 'text-green-600' : 'text-gray-800'}
                          >
                            {opt} {q.correctAnswer === opt && '(Correct)'}
                          </li>
                        ))}
                      </ul>
                      <p className="mt-2"><strong>Context:</strong> {q.context}</p>
                      <p className="mt-1"><strong>Difficulty:</strong> {q.difficulty}</p>
                      <button
                        onClick={() => setSelectedQuestion(null)}
                        className="mt-2 bg-gray-500 text-white p-1 rounded flex items-center space-x-1 hover:bg-gray-600"
                      >
                        <FaTimes />
                        <span>Close</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </>
          )}

          {questions.totalDescriptive > 0 && (
            <>
              <h4 className="text-lg font-medium text-gray-700 mb-2 mt-4">
                Descriptive Questions in Question Pool (Available: {questions.totalDescriptive})
              </h4>
              {questions.descriptive.map((q, index) => (
                <div key={q._id} className="mb-2">
                  <div className="flex items-center">
                    <span className="text-gray-800">{index + 1}. {q.question}</span>
                    <button
                      onClick={() => setSelectedQuestion(q)}
                      className="ml-2 bg-blue-500 text-white p-1 rounded text-sm flex items-center space-x-1 hover:bg-blue-600"
                    >
                      <FaEye />
                      <span>View Details</span>
                    </button>
                  </div>
                  {selectedQuestion === q && (
                    <div className="ml-6 mt-2 p-4 bg-gray-50 rounded-md border">
                      <p className="font-medium"><strong>Answer:</strong> {q.correctAnswer}</p>
                      <p className="mt-2"><strong>Context:</strong> {q.context}</p>
                      <p className="mt-1"><strong>Difficulty:</strong> {q.difficulty}</p>
                      <button
                        onClick={() => setSelectedQuestion(null)}
                        className="mt-2 bg-gray-500 text-white p-1 rounded flex items-center space-x-1 hover:bg-gray-600"
                      >
                        <FaTimes />
                        <span>Close</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </>
          )}

          {(questions.totalMCQs > 0 || questions.totalDescriptive > 0) && (
            <>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700">
                  Desired MCQs for Test:
                </label>
                <input
                  type="number"
                  value={desiredMCQs}
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    if (value > questions.totalMCQs) {
                      setMessage(`Cannot set desired MCQs to ${value}. Only ${questions.totalMCQs} valid MCQs available.`);
                      setDesiredMCQs(questions.totalMCQs);
                    } else {
                      setDesiredMCQs(value);
                    }
                  }}
                  placeholder="Desired MCQs for Test"
                  className="mt-1 block w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  min="1"
                />
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700">
                  Desired Descriptive Questions for Test:
                </label>
                <input
                  type="number"
                  value={desiredDescriptive}
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    if (value > questions.totalDescriptive) {
                      setMessage(`Cannot set desired Descriptive questions to ${value}. Only ${questions.totalDescriptive} valid Descriptive questions available.`);
                      setDesiredDescriptive(questions.totalDescriptive);
                    } else {
                      setDesiredDescriptive(value);
                    }
                  }}
                  placeholder="Desired Descriptive for Test"
                  className="mt-1 block w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  min="1"
                />
              </div>
              <div className="flex justify-between space-x-4 mt-4">
                <button
                  onClick={handleCreateTest}
                  className="flex-1 bg-blue-500 text-white p-2 rounded flex items-center space-x-2 hover:bg-blue-600"
                >
                  <FaCheckSquare />
                  <span>Create Test</span>
                </button>
                <button
                  onClick={handleViewResults}
                  className="flex-1 bg-gray-500 text-white p-2 rounded flex items-center space-x-2 hover:bg-gray-600"
                >
                  <FaTrophy />
                  <span>View Results</span>
                </button>
                <button
                  onClick={() => navigate('/profile')}
                  className="flex-1 bg-purple-500 text-white p-2 rounded flex items-center space-x-2 hover:bg-purple-600"
                >
                  <FaUser />
                  <span>View Profile</span>
                </button>
              </div>
            </>
          )}

          {message && (
            <p className={`text-center mt-4 ${message.includes('success') ? 'text-green-500' : 'text-red-500'}`}>
              {message}
            </p>
          )}

          {showTestTokenModal && (
            <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center">
              <div className="bg-white p-6 rounded-lg shadow-lg max-w-sm w-full">
                <h3 className="text-lg font-bold mb-2">Test Created Successfully!</h3>
                <p className="mb-2">
                  <strong>Test Token:</strong>{' '}
                  <span className="inline-flex items-center">
                    {testToken}
                    <button
                      onClick={handleCopyToken}
                      className="ml-2 text-gray-500 hover:text-gray-700 focus:outline-none"
                    >
                      <FaCopy />
                    </button>
                  </span>
                </p>
                <p className="mb-4"><strong>Subject:</strong> {questions.subject}</p>
                <div className="flex justify-center space-x-4">
                  <a
                    href={`https://api.whatsapp.com/send?text=Here%20is%20my%20QMaster%20test%20token:%20${testToken}%20(Subject:%20${questions.subject})`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-green-500 text-white p-2 rounded flex items-center space-x-2 hover:bg-green-600"
                  >
                    <FaWhatsapp />
                    <span>Share via WhatsApp</span>
                  </a>
                  <a
                    href={`mailto:?subject=QMaster%20Test%20Token&body=Here%20is%20my%20QMaster%20test%20token:%20${testToken}%20(Subject:%20${questions.subject})`}
                    className="bg-red-500 text-white p-2 rounded flex items-center space-x-2 hover:bg-red-600"
                  >
                    <FaEnvelope />
                    <span>Share via Gmail</span>
                  </a>
                </div>
                <button
                  onClick={() => setShowTestTokenModal(false)}
                  className="mt-4 bg-gray-500 text-white p-2 rounded flex items-center space-x-2 mx-auto block hover:bg-gray-600"
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

export default QuestionPool;