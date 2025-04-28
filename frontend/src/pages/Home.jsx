import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaSignInAlt, FaUserPlus, FaInfoCircle, FaGraduationCap, FaClock, FaChartBar, FaArrowRight } from 'react-icons/fa';
import teacher from '../assets/teacher.png';

function Home() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="pt-16"> {/* Add padding top to account for fixed navbar from layout */}
        <div className="max-w-7xl mx-auto">
          {/* Hero Section */}
          <div className="flex flex-col lg:flex-row items-center justify-between px-4 lg:px-8 py-16">
            <div className="lg:w-1/2 space-y-8 text-center lg:text-left">
              <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 leading-tight animate-fade-in">
                Transform Your
                <span className="text-blue-600"> Teaching</span>
                <br />
                Experience
              </h1>
              <p className="text-xl text-gray-600 animate-fade-in-delay max-w-lg">
                Create, manage, and grade tests effortlessly with QMaster. 
                The ultimate platform for modern education.
              </p>
              <div className="flex flex-col sm:flex-row justify-center lg:justify-start space-y-4 sm:space-y-0 sm:space-x-6 animate-fade-in-delay-2">
                <button
                  onClick={() => navigate('/signup')}
                  className="group flex items-center justify-center px-8 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl"
                >
                  Sign Up
                  <FaArrowRight className="ml-2 group-hover:translate-x-1 transition-transform duration-300" />
                </button>
                <button
                  onClick={() => navigate('/signin')}
                  className="group flex items-center justify-center px-8 py-4 bg-white border border-blue-600 text-blue-600 rounded-xl hover:bg-blue-50 transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl"
                >
                  Sign In
                  <FaSignInAlt className="ml-2" />
                </button>
                <button
                  onClick={() => navigate('/about')}
                  className="group flex items-center justify-center px-8 py-4 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl"
                >
                  About
                  <FaInfoCircle className="ml-2" />
                </button>
              </div>
            </div>
            <div className="lg:w-1/2 mt-12 lg:mt-0 animate-fade-in-delay px-4 lg:px-0">
              <img
                src={teacher}
                alt="Student using QMaster"
                className="w-full h-auto rounded-2xl shadow-2xl transform hover:scale-[1.02] transition-transform duration-500"
              />
            </div>
          </div>

          {/* Features Section */}
          <div className="px-4 lg:px-8 py-20 bg-white">
            <h2 className="text-3xl lg:text-4xl font-bold text-center mb-16 text-gray-900">
              Why Choose QMaster?
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              <div className="p-8 bg-white rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-2 transition-all duration-300">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-6">
                  <FaGraduationCap className="text-3xl text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  Smart Question Generation
                </h3>
                <p className="text-gray-600">
                  Automatically generate questions from your content with AI-powered technology.
                </p>
              </div>
              <div className="p-8 bg-white rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-2 transition-all duration-300">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-6">
                  <FaClock className="text-3xl text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  Real-time Assessment
                </h3>
                <p className="text-gray-600">
                  Grade tests instantly and provide immediate feedback to students.
                </p>
              </div>
              <div className="p-8 bg-white rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-2 transition-all duration-300">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-6">
                  <FaChartBar className="text-3xl text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  Comprehensive Analytics
                </h3>
                <p className="text-gray-600">
                  Track student performance with detailed analytics and insights.
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <footer className="bg-gray-50 py-8 mt-20">
            <div className="text-center text-gray-600">
              <p>© 2024 QMaster. All rights reserved.</p>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}

export default Home;