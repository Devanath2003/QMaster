import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaSignInAlt, FaUserPlus, FaUser, FaSignOutAlt, FaChalkboardTeacher, FaGraduationCap, FaTrophy, FaClipboardList, FaInfoCircle } from 'react-icons/fa';
import logo from "../assets/logo.png";

function Navbar({ token, setToken, setRole, role, tokenId }) {
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    setToken('');
    setRole('');
    localStorage.removeItem('teacherDashboardState');
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('latestToken');
    navigate('/');
  };

  return (
    <nav className="bg-blue-800 shadow-md w-full z-50">
      <div className="w-full px-0">
        <div className="flex justify-between h-16 items-center">
          {/* Logo Section */}
          <Link to="/" className="flex items-center group pl-2 sm:pl-4">
            <img
              src={logo}
              alt="QMaster Logo"
              className="h-10 w-auto transform group-hover:rotate-12 transition-transform duration-300"
            />
            <span className="ml-2 text-2xl font-bold text-white group-hover:text-blue-200 transition-colors duration-300">
              QMaster
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-2 pr-2 sm:pr-4">
            <Link
              to="/about"
              className="flex items-center px-1 py-2 text-white hover:text-blue-200 transition-colors duration-300"
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
                      className="flex items-center px-1 py-2 text-white hover:text-blue-200 transition-colors duration-300"
                    >
                      <FaChalkboardTeacher className="mr-2" />
                      Teacher Dashboard
                    </Link>
                    {tokenId && (
                      <>
                        <Link
                          to={`/leaderboard/${tokenId}`}
                          className="flex items-center px-1 py-2 text-white hover:text-blue-200 transition-colors duration-300"
                        >
                          <FaTrophy className="mr-2" />
                          Leaderboard
                        </Link>
                        <Link
                          to={`/submissionsreview/${tokenId}`}
                          className="flex items-center px-1 py-2 text-white hover:text-blue-200 transition-colors duration-300"
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
                      className="flex items-center px-1 py-2 text-white hover:text-blue-200 transition-colors duration-300"
                    >
                      <FaGraduationCap className="mr-2" />
                      Student Dashboard
                    </Link>
                    <Link
                      to="/results"
                      className="flex items-center px-1 py-2 text-white hover:text-blue-200 transition-colors duration-300"
                    >
                      <FaClipboardList className="mr-2" />
                      Results
                    </Link>
                  </>
                )}

                <Link
                  to="/profile"
                  className="flex items-center px-1 py-2 text-white hover:text-blue-200 transition-colors duration-300"
                >
                  <FaUser className="mr-2" />
                  Profile
                </Link>

                <button
                  onClick={handleLogout}
                  className="flex items-center px-2 py-2 bg-white text-blue-800 rounded-lg hover:bg-blue-100 transform hover:scale-105 transition-all duration-300 shadow-md hover:shadow-lg"
                >
                  <FaSignOutAlt className="mr-2" />
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/signin"
                  className="flex items-center px-1 py-2 text-white hover:text-blue-200 transition-colors duration-300"
                >
                  <FaSignInAlt className="mr-2" />
                  Sign In
                </Link>
                <Link
                  to="/signup"
                  className="flex items-center px-2 py-2 bg-white text-blue-800 rounded-lg hover:bg-blue-100 transform hover:scale-105 transition-all duration-300 shadow-md hover:shadow-lg"
                >
                  <FaUserPlus className="mr-2" />
                  Sign Up
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center pr-2 sm:pr-4">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-white hover:text-blue-200 hover:bg-blue-700 focus:outline-none"
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
            className="flex items-center px-3 py-2 text-white hover:text-blue-200 hover:bg-blue-600 rounded-md"
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
                    className="flex items-center px-3 py-2 text-white hover:text-blue-200 hover:bg-blue-600 rounded-md"
                  >
                    <FaChalkboardTeacher className="mr-2" />
                    Teacher Dashboard
                  </Link>
                  {tokenId && (
                    <>
                      <Link
                        to={`/leaderboard/${tokenId}`}
                        className="flex items-center px-3 py-2 text-white hover:text-blue-200 hover:bg-blue-600 rounded-md"
                      >
                        <FaTrophy className="mr-2" />
                        Leaderboard
                      </Link>
                      <Link
                        to={`/submissionsreview/${tokenId}`}
                        className="flex items-center px-3 py-2 text-white hover:text-blue-200 hover:bg-blue-600 rounded-md"
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
                    className="flex items-center px-3 py-2 text-white hover:text-blue-200 hover:bg-blue-600 rounded-md"
                  >
                    <FaGraduationCap className="mr-2" />
                    Student Dashboard
                  </Link>
                  <Link
                    to="/results"
                    className="flex items-center px-3 py-2 text-white hover:text-blue-200 hover:bg-blue-600 rounded-md"
                  >
                    <FaClipboardList className="mr-2" />
                    Results
                  </Link>
                </>
              )}

              <Link
                to="/profile"
                className="flex items-center px-3 py-2 text-white hover:text-blue-200 hover:bg-blue-600 rounded-md"
              >
                <FaUser className="mr-2" />
                Profile
              </Link>

              <button
                onClick={handleLogout}
                className="flex items-center w-full text-left px-3 py-2 text-white hover:text-blue-200 hover:bg-blue-600 rounded-md"
              >
                <FaSignOutAlt className="mr-2" />
                Logout
              </button>
            </>
          ) : (
            <>
              <Link
                to="/signin"
                className="flex items-center px-3 py-2 text-white hover:text-blue-200 hover:bg-blue-600 rounded-md"
              >
                <FaSignInAlt className="mr-2" />
                Sign In
              </Link>
              <Link
                to="/signup"
                className="flex items-center px-3 py-2 text-white hover:text-blue-200 hover:bg-blue-600 rounded-md"
              >
                <FaUserPlus className="mr-2" />
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;