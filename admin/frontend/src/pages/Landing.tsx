import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import illustration from '../assets/img/illustration.png';
import logo from '../assets/img/Logo.png';

export const Landing = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Log that component mounted
    console.log('Landing page mounted');
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* Logo and Navigation Section */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-20 border-b border-gray-100 bg-white/50 backdrop-blur-sm"
      >
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-48">
            {/* Logo */}
            <Link to="/" className="flex items-center">
              <img src={logo} alt="Logo" className="h-40 w-auto" />
            </Link>

            {/* Navigation Buttons */}
            <div className="flex items-center space-x-4">
              <Link 
                to="/login" 
                className="px-8 py-4 border-2 border-gray-300 text-gray-600 rounded-full hover:border-blue-500 hover:text-blue-500 transition-colors"
              >
                Login
              </Link>
              <Link 
                to="/onboarding"
                className="px-8 py-4 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors flex items-center space-x-2"
              >
                <span>Get Started</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Hero Section */}
      <div className="relative h-[calc(100vh-12rem)]">
        <div className="relative z-10 max-w-7xl mx-auto px-6 pt-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left Column - Text */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="space-y-8"
            >
              <h1 className="text-6xl font-bold text-gray-900 leading-tight">
                Healthcare
                <span className="block text-blue-500">Reimagined</span>
              </h1>
              <p className="text-xl text-gray-600 max-w-3xl">
                Experience seamless patient care with our innovative platform. 
                Designed for modern healthcare professionals.
              </p>
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.8 }}
                className="flex space-x-4"
              >
                <Link 
                  to="/onboarding"
                  className="px-8 py-4 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors flex items-center space-x-2"
                >
                  <span>Get Started</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </Link>
                <Link 
                  to="/login" 
                  className="px-8 py-4 border-2 border-gray-300 text-gray-600 rounded-full hover:border-blue-500 hover:text-blue-500 transition-colors"
                >
                  Login
                </Link>
              </motion.div>
            </motion.div>

            {/* Right Column - Image */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="relative"
            >
              <img 
                src={illustration} 
                alt="Healthcare Dashboard" 
                className="w-full h-auto rounded-2xl shadow-2xl"
              />
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default Landing;