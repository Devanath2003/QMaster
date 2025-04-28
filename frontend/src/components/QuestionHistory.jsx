import { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { FaArrowLeft } from 'react-icons/fa';

function QuestionHistory({ token, role }) {
  const { tokenId } = useParams();
  const [questionHistory, setQuestionHistory] = useState([]);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (role !== 'teacher') {
      navigate('/');
      return;
    }
    const fetchQuestionHistory = async () => {
      try {
        const res = await axios.get(`http://localhost:5000/api/teacher/question-history/${tokenId}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        setQuestionHistory(res.data.history);
        setMessage('Question history fetched successfully');
      } catch (error) {
        setMessage(error.response?.data?.error || 'Failed to fetch question history');
      }
    };
    fetchQuestionHistory();
  }, [tokenId, token, role, navigate]);

  const formatOptions = (options) => {
    return options.map((opt, index) => `${String.fromCharCode(97 + index)}. ${opt}`).join('<br />');
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto p-4">
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold text-center mb-4">Question History for Token: {tokenId}</h2>
          {questionHistory.length > 0 ? (
            <div className="mt-4">
              {questionHistory.map((q, index) => (
                <div key={q._id} className="mb-4 p-2 border rounded shadow">
                  <p className="font-bold"><span>{index + 1}. {q.question}</span> (Subject: {q.subject}, Difficulty: {q.difficulty})</p>
                  {q.type === 'mcq' && (
                    <div className="ml-4 mt-2" dangerouslySetInnerHTML={{ __html: `
                      <p><strong>Options:</strong></p>
                      <ul class="list-disc pl-5">
                        ${formatOptions(q.options).replace(/\n/g, '<br />')}
                      </ul>
                      <p><strong>Correct Answer:</strong> ${q.correctAnswer}</p>
                    `}} />
                  )}
                  {q.type === 'descriptive' && (
                    <p className="ml-4 mt-2"><strong>Correct Answer:</strong> {q.correctAnswer}</p>
                  )}
                  <p className="ml-4 mt-2"><strong>Context:</strong> {q.context}</p>
                  <h5 className="mt-2 font-medium">Student Performance:</h5>
                  {q.studentPerformance.length > 0 ? (
                    q.studentPerformance.map((perf, perfIndex) => (
                      <div key={perfIndex} className="ml-6 p-2 border rounded">
                        <p><strong>Student:</strong> {perf.studentName}</p>
                        <p><strong>Answer:</strong> {perf.answer}</p>
                        {q.type === 'mcq' ? (
                          <p><strong>Correct:</strong> {perf.isCorrect ? 'Yes' : 'No'} (Score: {perf.score}/{q.marks})</p>
                        ) : (
                          <p><strong>Similarity:</strong> {perf.similarity.toFixed(2)} (Score: {perf.score}/{q.marks})</p>
                        )}
                        <p><strong>Submitted At:</strong> {new Date(perf.submittedAt).toLocaleString()}</p>
                      </div>
                    ))
                  ) : (
                    <p className="ml-6 text-gray-500">No student submissions yet.</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500">No questions found for this token.</p>
          )}
          {message && <p className={`text-center mt-4 ${message.includes('success') ? 'text-green-500' : 'text-red-500'}`}>{message}</p>}
          <button onClick={() => navigate('/profile')} className="mt-4 bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 flex items-center space-x-2">
            <FaArrowLeft />
            <span>Back to Profile</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default QuestionHistory;