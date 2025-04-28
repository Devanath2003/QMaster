import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function Student({ token, role, onLogout }) {
  const [tokenId, setTokenId] = useState('');
  const [questions, setQuestions] = useState({ mcqs: [], descriptive: [] });
  const [answers, setAnswers] = useState({ mcq: [], descriptive: [] });
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  if (role !== 'student') {
    navigate('/');
    return null;
  }

  const handleJoinTest = async () => {
    try {
      const res = await axios.post('http://localhost:5000/api/student/join', { token: tokenId }, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      setQuestions(res.data);
      setAnswers({
        mcq: res.data.mcqs.map(q => ({ id: q._id, answer: '' })),
        descriptive: res.data.descriptive.map(q => ({ id: q._id, answer: '' })),
      });
      setMessage('Test joined successfully');
    } catch (error) {
      setMessage(error.response?.data?.error || 'Failed to join test');
    }
  };

  const handleSubmitTest = async () => {
    try {
      const res = await axios.post('http://localhost:5000/api/student/submit', {
        token: tokenId,
        answers,
      }, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      setMessage(`Test submitted! Score: ${res.data.score}/${res.data.total}`);
    } catch (error) {
      setMessage(error.response?.data?.error || 'Failed to submit test');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto p-4">
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold mb-4">Student Dashboard</h2>
          <div className="flex mb-4">
            <button onClick={() => navigate('/profile')} className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 mr-2">
              View Profile
            </button>
            <button onClick={onLogout} className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600">
              Logout
            </button>
          </div>
          <h3 className="mb-2">Join Test</h3>
          <input
            type="text"
            value={tokenId}
            onChange={(e) => setTokenId(e.target.value)}
            placeholder="Enter Test Token"
            className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
          />
          <button onClick={handleJoinTest} className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600">
            Join Test
          </button>

          {questions.mcqs.length > 0 && (
            <>
              <h4 className="mt-4 font-medium">MCQs</h4>
              {questions.mcqs.map((q, index) => (
                <div key={q._id} className="mb-4">
                  <p className="font-medium">{index + 1}. {q.question}</p>
                  {q.options.map((opt, i) => (
                    <div key={i} className="flex items-center mt-1">
                      <input
                        type="radio"
                        name={`mcq-${q._id}`}
                        value={opt}
                        onChange={(e) => {
                          const newAnswers = [...answers.mcq];
                          newAnswers[index] = { id: q._id, answer: e.target.value };
                          setAnswers({ ...answers, mcq: newAnswers });
                        }}
                        className="mr-2"
                      />
                      <label>{opt}</label>
                    </div>
                  ))}
                </div>
              ))}
            </>
          )}
          {questions.descriptive.length > 0 && (
            <>
              <h4 className="mt-4 font-medium">Descriptive Questions</h4>
              {questions.descriptive.map((q, index) => (
                <div key={q._id} className="mb-4">
                  <p className="font-medium">{index + 1}. {q.question}</p>
                  <textarea
                    onChange={(e) => {
                      const newAnswers = [...answers.descriptive];
                      newAnswers[index] = { id: q._id, answer: e.target.value };
                      setAnswers({ ...answers, descriptive: newAnswers });
                    }}
                    placeholder="Your answer..."
                    className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 mt-2"
                    rows="3"
                  />
                </div>
              ))}
            </>
          )}
          {questions.mcqs.length > 0 && (
            <button onClick={handleSubmitTest} className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 mt-4">
              Submit Test
            </button>
          )}
          {message && <p className={`text-center mt-4 ${message.includes('success') ? 'text-green-500' : 'text-red-500'}`}>{message}</p>}
        </div>
      </div>
    </div>
  );
}

export default Student;