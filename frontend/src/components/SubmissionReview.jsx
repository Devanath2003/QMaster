import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

function SubmissionReview({ token, role }) {
  const { tokenId } = useParams();
  const [submissions, setSubmissions] = useState([]);
  const [classAverage, setClassAverage] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (!token || role !== 'teacher') {
      navigate('/signin');
      return;
    }

    const fetchSubmissions = async () => {
      try {
        const res = await axios.get(`http://localhost:5000/api/teacher/results/${tokenId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setSubmissions(res.data.submissions);
        setClassAverage(res.data.classAverage);
      } catch (error) {
        console.error('Failed to fetch submissions:', error);
        if (error.response?.status === 401 || error.response?.status === 403) {
          navigate('/signin');
        }
      }
    };
    fetchSubmissions();
  }, [token, role, tokenId, navigate]);

  return (
    <div className="container mx-auto p-4">
      <div className="bg-white p-6 rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold mb-4">Submissions for Token: {tokenId}</h2>
        <p className="mb-4">Class Average: {classAverage}</p>
        {submissions.length > 0 ? (
          submissions.map((submission) => (
            <div key={submission._id} className="mb-6 p-4 border rounded shadow">
              <h3 className="text-lg font-semibold">Student: {submission.studentName}</h3>
              <p>Score: {submission.score} / {submission.totalMarks}</p>
              <p>Submitted At: {new Date(submission.submittedAt).toLocaleString()}</p>
              <h4 className="mt-2 font-medium">MCQ Answers:</h4>
              {submission.answers.mcq?.map((answer, index) => (
                <div key={index} className="ml-4">
                  <p>
                    <strong>Question {index + 1}:</strong>{' '}
                    {submission.questions.mcq[index]?.question}
                  </p>
                  <p>Answer: {answer.answer}</p>
                  <p>Correct Answer: {submission.questions.mcq[index]?.correctAnswer}</p>
                </div>
              ))}
              <h4 className="mt-2 font-medium">Descriptive Answers:</h4>
              {submission.answers.descriptive?.map((answer, index) => (
                <div key={index} className="ml-4">
                  <p>
                    <strong>Question {index + 1}:</strong>{' '}
                    {submission.questions.descriptive[index]?.question}
                  </p>
                  <p>Answer: {answer.answer}</p>
                  <p>Correct Answer: {submission.questions.descriptive[index]?.correctAnswer}</p>
                </div>
              ))}
            </div>
          ))
        ) : (
          <p>No submissions yet.</p>
        )}
        <button
          onClick={() => navigate(`/leaderboard/${tokenId}`)}
          className="mt-4 bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
        >
          Back to Leaderboard
        </button>
      </div>
    </div>
  );
}

export default SubmissionReview;