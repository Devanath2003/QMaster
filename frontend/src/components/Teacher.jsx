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
  FaSpinner,
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

  // Animation dots for loading state
  const LoadingAnimation = () => {
    return (
      <div className="flex flex-col items-center justify-center bg-white rounded-lg shadow-lg p-8 mt-4">
        <div className="w-full flex items-center justify-center mb-6">
          <div className="flex space-x-3">
            <div className="h-5 w-5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="h-5 w-5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="h-5 w-5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            <div className="h-5 w-5 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '450ms' }}></div>
          </div>
        </div>
        
        <div className="relative h-2 w-64 bg-gray-200 rounded-full overflow-hidden">
          <div className="absolute top-0 left-0 h-full bg-blue-600 animate-pulse"></div>
          <div className="absolute top-0 left-0 h-full w-1/2 bg-blue-500 rounded-full animate-progress"></div>
        </div>
        
        <div className="mt-8 text-center">
          <div className="flex items-center justify-center mb-2">
            <FaSpinner className="animate-spin text-blue-600 mr-2 text-xl" />
            <p className="text-lg font-medium text-gray-800">Processing content, please wait...</p>
          </div>
          <p className="text-sm text-gray-600">
            Generating questions and preparing your content. This may take a few moments.
          </p>
        </div>
      </div>
    );
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

          {isPolling ? (
            <LoadingAnimation />
          ) : (
            message && (
              <div
                className={`mt-4 p-3 rounded-md text-center ${
                  message.includes('success') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                }`}
              >
                {message}
              </div>
            )
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