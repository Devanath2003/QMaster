import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

function Leaderboard({ token, role }) {
  const { token: testToken } = useParams();
  const [leaderboard, setLeaderboard] = useState([]);
  const [classAverage, setClassAverage] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) {
      navigate('/signin');
      return;
    }

    const fetchLeaderboard = async () => {
      try {
        const res = await axios.get(`http://localhost:5000/api/leaderboard/${testToken}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setLeaderboard(res.data.leaderboard);
        setClassAverage(res.data.classAverage);
        setTotalQuestions(res.data.totalQuestions);
      } catch (error) {
        console.error('Failed to fetch leaderboard:', error);
        if (error.response?.status === 401 || error.response?.status === 403) {
          navigate('/signin');
        }
      }
    };
    fetchLeaderboard();
  }, [token, testToken, navigate]);

  return (
    <div className="container mx-auto p-4">
      <div className="bg-white p-6 rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold mb-4">Leaderboard for Token: {testToken}</h2>
        <p className="mb-2">Class Average: {classAverage}</p>
        <p className="mb-4">Total Questions: {totalQuestions}</p>
        {leaderboard.length > 0 ? (
          <table className="min-w-full bg-white border">
            <thead>
              <tr className="bg-gray-200">
                <th className="py-2 px-4 border-b">Rank</th>
                <th className="py-2 px-4 border-b">Student Name</th>
                <th className="py-2 px-4 border-b">Score</th>
                <th className="py-2 px-4 border-b">Total Marks</th>
                <th className="py-2 px-4 border-b">Submitted At</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((entry) => (
                <tr key={entry._id} className="border-t">
                  <td className="py-2 px-4">{entry.rank}</td>
                  <td className="py-2 px-4">{entry.studentName}</td>
                  <td className="py-2 px-4">{entry.score}</td>
                  <td className="py-2 px-4">{entry.totalMarks}</td>
                  <td className="py-2 px-4">{new Date(entry.submittedAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-center text-gray-500">No submissions yet.</p>
        )}
        {role === 'teacher' && (
          <button
            onClick={() => navigate(`/submissionsreview/${testToken}`)}
            className="mt-4 bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
          >
            View Submissions
          </button>
        )}
      </div>
    </div>
  );
}

export default Leaderboard;