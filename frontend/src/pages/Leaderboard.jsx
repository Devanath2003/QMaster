import { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';

function Leaderboard({ token, role }) {
  const [leaderboard, setLeaderboard] = useState({ submissions: [], classAverage: 0, totalQuestions: 0 });
  const [message, setMessage] = useState('');
  const { token: testToken } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const res = await axios.get(`http://localhost:5000/api/leaderboard/${testToken}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        setLeaderboard(res.data);
      } catch (error) {
        setMessage(error.response?.data?.error || 'Failed to fetch leaderboard');
      }
    };
    fetchLeaderboard();
  }, [token, testToken]);

  return (
    <div className="app">
      <div className="container">
        <div className="card">
          <h2>Leaderboard (Token: {testToken})</h2>
          <p>Class Average: {leaderboard.classAverage}</p>
          <p>Total Questions: {leaderboard.totalQuestions}</p>
          {leaderboard.submissions.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Student</th>
                  <th>Score</th>
                  <th>Total Marks</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.submissions.map((sub, index) => (
                  <tr key={index}>
                    <td>{index + 1}</td>
                    <td>{sub.studentName}</td>
                    <td>{sub.score}</td>
                    <td>{sub.totalMarks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>No submissions yet.</p>
          )}
          {message && <p className="error">{message}</p>}
          {role === 'teacher' && (
            <button onClick={() => navigate(`/teacher/results/${testToken}`)}>View Detailed Results</button>
          )}
        </div>
      </div>
    </div>
  );
}

export default Leaderboard;