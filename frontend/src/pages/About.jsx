import React from 'react';
import { useNavigate } from 'react-router-dom';

function About() {
  const navigate = useNavigate();

  return (
    <div className="app min-h-screen bg-gray-100 py-10">
      <div className="container mx-auto px-4">
        
        <h1 className="text-4xl font-bold text-blue-800 mb-6">
          Welcome to QMaster – Your Ultimate Question Generation Platform
        </h1>
        <p className="text-lg text-gray-700 mb-6">
          At QMaster, we believe in empowering educators and learners by simplifying the process of creating high-quality educational content. Our platform leverages advanced AI technology to generate multiple-choice questions (MCQs) and descriptive questions from any text or PDF input, saving teachers time while ensuring students have access to challenging and relevant assessments.
        </p>

        
        <h2 className="text-3xl font-semibold text-blue-800 mt-8 mb-4">
          Our Mission
        </h2>
        <p className="text-lg text-gray-700 mb-6">
          Our mission is to revolutionize the way educational assessments are created. We aim to support teachers in crafting engaging, thought-provoking questions that enhance learning outcomes, while providing students with a seamless experience to test and expand their knowledge across various subjects.
        </p>

        
        <h2 className="text-3xl font-semibold text-blue-800 mt-8 mb-4">
          What We Offer
        </h2>
        <ul className="list-disc list-inside text-lg text-gray-700 mb-6 space-y-2">
          <li>
            <span className="font-medium">AI-Powered Question Generation:</span> Upload your notes or study material, and let QMaster generate customized MCQs and descriptive questions in seconds.
          </li>
          <li>
            <span className="font-medium">Tailored for Educators:</span> Designed with teachers in mind, QMaster helps you create assessments that align with your curriculum and teaching goals.
          </li>
          <li>
            <span className="font-medium">Student-Friendly Interface:</span> Students can access tests, submit answers, and track their progress with ease.
          </li>
          <li>
            <span className="font-medium">Secure and Reliable:</span> With robust user authentication and data management, your content and progress are always safe with us.
          </li>
        </ul>

        
        <h2 className="text-3xl font-semibold text-blue-800 mt-8 mb-4">
          Why Choose QMaster?
        </h2>
        <p className="text-lg text-gray-700 mb-6">
          QMaster is built to bridge the gap between teaching and learning. Whether you're a teacher looking to streamline your workflow or a student aiming to excel in your studies, our platform offers a smart, efficient, and user-friendly solution. We’re here to make education more interactive, accessible, and effective for everyone.
        </p>

        
        <h2 className="text-3xl font-semibold text-blue-800 mt-8 mb-4">
          Our Vision
        </h2>
        <p className="text-lg text-gray-700 mb-6">
          We envision a world where technology enhances education by fostering creativity, critical thinking, and collaboration. QMaster is committed to being at the forefront of this transformation, helping educators and learners unlock their full potential.
        </p>

       
        <h2 className="text-3xl font-semibold text-blue-800 mt-8 mb-4">
          Get Started Today
        </h2>
        <p className="text-lg text-gray-700 mb-6">
          Join the QMaster community and experience the future of educational assessments. Let’s make learning and teaching more dynamic, together!
        </p>

        
        
      </div>

      
      <p className="text-2xl text-center text-gray-600 mt-10">
        Contact: <a href="mailto:Qmaster@gmail.com" className="text-blue-600 hover:underline">Qmaster@gmail.com</a>
      </p>
    </div>
  );
}

export default About;