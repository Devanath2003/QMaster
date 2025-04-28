import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

function StudentResults({ token, role }) {
  const [results, setResults] = useState([]);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchResults = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/student/results', {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        setResults(res.data);
      } catch (error) {
        setMessage(error.response?.data?.error || 'Failed to fetch results');
      }
    };
    fetchResults();
  }, [token]);

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto p-4">
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <h2 className="text-center text-2xl font-bold mb-6">Your Test Results</h2>
          {results.length === 0 ? (
            <p className="text-center text-gray-500">No results available.</p>
          ) : (
            results.map((result, index) => (
              <div key={index} className="mb-4 p-4 border rounded shadow">
                <h3 className="font-bold">Test {index + 1}</h3>
                <p className="mb-1"><strong>Token:</strong> {result.token}</p>
                <p className="mb-1"><strong>Score:</strong> {result.score}/{result.totalMarks}</p>
                <p className="mb-2"><strong>Submitted At:</strong> {new Date(result.submittedAt).toLocaleString()}</p>

                {result.questions?.mcq?.length > 0 && (
                  <>
                    <h4 className="mt-4 font-medium">MCQs</h4>
                    {result.questions.mcq.map((q, qIndex) => {
                      const studentAnswer = result.answers.mcq.find(a => a.id === q._id)?.answer || 'Not answered';
                      const isCorrect = studentAnswer === q.correctAnswer;
                      return (
                        <div key={q._id} className="mt-2 p-2 border rounded">
                          <p><strong>{qIndex + 1}. {q.question}</strong></p>
                          <p><strong>Your Answer:</strong> {studentAnswer} {isCorrect ? <span className="text-green-500">(Correct)</span> : <span className="text-red-500">(Incorrect)</span>}</p>
                          {!isCorrect && <p><strong>Correct Answer:</strong> {q.correctAnswer}</p>}
                          <p><strong>Options:</strong> {q.options.join(', ')}</p>
                        </div>
                      );
                    })}
                  </>
                )}

                {result.questions?.descriptive?.length > 0 && (
                  <>
                    <h4 className="mt-4 font-medium">Descriptive Questions</h4>
                    {result.questions.descriptive.map((q, qIndex) => {
                      const studentAnswer = result.answers.descriptive.find(a => a.id === q._id)?.answer || 'Not answered';
                      return (
                        <div key={q._id} className="mt-2 p-2 border rounded">
                          <p><strong>{qIndex + 1}. {q.question}</strong></p>
                          <p><strong>Your Answer:</strong> {studentAnswer}</p>
                          <p><strong>Reference Answer:</strong> {q.correctAnswer}</p>
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            ))
          )}
          <div className="flex justify-center">
            <button onClick={() => navigate('/student')} className="mt-4 bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600">
              Back to Dashboard
            </button>
          </div>
          {message && <p className={`text-center mt-4 ${message.includes('success') ? 'text-green-500' : 'text-red-500'}`}>{message}</p>}
        </div>
      </div>
    </div>
  );
}

export default StudentResults;