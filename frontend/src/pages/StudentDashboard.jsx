import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { FaSignInAlt, FaTrophy, FaUser } from 'react-icons/fa';

function StudentDashboard({ token, role }) {
  const [testToken, setTestToken] = useState('');
  const [questions, setQuestions] = useState({ mcqs: [], descriptive: [] });
  const [answers, setAnswers] = useState({ mcq: [], descriptive: [] });
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  if (role !== 'student') {
    navigate('/');
    return null;
  }

  const handleJoinTest = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(
        'http://localhost:5000/api/student/join',
        { token: testToken },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      setQuestions({ mcqs: res.data.mcqs, descriptive: res.data.descriptive });
      setAnswers({
        mcq: res.data.mcqs.map(q => ({ id: q._id, answer: '' })),
        descriptive: res.data.descriptive.map(q => ({ id: q._id, answer: '' })),
      });
      setMessage('Test joined successfully. Questions have been randomly selected for you.');
    } catch (error) {
      setMessage(error.response?.data?.error || 'Failed to join test');
    }
  };

  const handleAnswerChange = (type, index, value) => {
    setAnswers(prev => {
      const newAnswers = { ...prev };
      newAnswers[type][index].answer = value;
      return newAnswers;
    });
  };

  const handleSubmitTest = async () => {
    try {
      const res = await axios.post(
        'http://localhost:5000/api/student/submit',
        { token: testToken, answers },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
      setMessage(`Test submitted! Score: ${res.data.score}/${res.data.total}`);
      setQuestions({ mcqs: [], descriptive: [] });
      setAnswers({ mcq: [], descriptive: [] });
      navigate('/results');
    } catch (error) {
      setMessage(error.response?.data?.error || 'Failed to submit test');
    }
  };

  const formatOptions = (options) => {
    return options.map((opt, index) => `${String.fromCharCode(97 + index)}. ${opt}`);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto p-4">
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h2 className="text-center text-2xl font-bold mb-6">Student Dashboard</h2>
          {!questions.mcqs.length && !questions.descriptive.length ? (
            <form onSubmit={handleJoinTest}>
              <div className="mb-6">
                <label htmlFor="testToken" className="block text-gray-700 mb-2">Enter Test Token</label>
                <input
                  type="text"
                  id="testToken"
                  value={testToken}
                  onChange={(e) => setTestToken(e.target.value)}
                  placeholder="Enter Test Token"
                  className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex justify-center space-x-4">
                <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 flex items-center space-x-2">
                  <FaSignInAlt />
                  <span>Join Test</span>
                </button>
                <button onClick={() => navigate('/results')} className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 flex items-center space-x-2">
                  <FaTrophy />
                  <span>View Results</span>
                </button>
                <button onClick={() => navigate('/profile')} className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 flex items-center space-x-2">
                  <FaUser />
                  <span>View Profile</span>
                </button>
              </div>
            </form>
          ) : (
            <>
              <h3 className="text-center mb-4">Test Questions (Randomly Selected)</h3>
              <h4 className="mt-4 font-medium">MCQs</h4>
              {questions.mcqs.map((q, index) => (
                <div key={q._id} className="mb-4">
                  <p className="font-medium">{index + 1}. {q.question}</p>
                  {formatOptions(q.options).map((opt, i) => (
                    <label key={i} className="block mt-1">
                      <input
                        type="radio"
                        name={`mcq-${index}`}
                        value={q.options[i]}
                        checked={answers.mcq[index].answer === q.options[i]}
                        onChange={(e) => handleAnswerChange('mcq', index, e.target.value)}
                        className="mr-2"
                      />
                      {opt}
                    </label>
                  ))}
                </div>
              ))}
              <h4 className="mt-4 font-medium">Descriptive Questions</h4>
              {questions.descriptive.map((q, index) => (
                <div key={q._id} className="mb-4">
                  <p className="font-medium">{index + 1}. {q.question}</p>
                  <textarea
                    value={answers.descriptive[index].answer}
                    onChange={(e) => handleAnswerChange('descriptive', index, e.target.value)}
                    className="w-full mt-2 p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows="3"
                    placeholder="Write your answer here..."
                  />
                </div>
              ))}
              <div className="flex justify-center">
                <button onClick={handleSubmitTest} className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 flex items-center space-x-2">
                  <FaSignInAlt />
                  <span>Submit Test</span>
                </button>
              </div>
            </>
          )}
          {message && <p className={`text-center mt-4 ${message.includes('success') ? 'text-green-500' : 'text-red-500'}`}>{message}</p>}
        </div>
      </div>
    </div>
  );
}

export default StudentDashboard;