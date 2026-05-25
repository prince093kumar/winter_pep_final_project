import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { MessageSquare, Mail, Lock, User, AlertCircle, Loader, Sparkles, ArrowRight } from 'lucide-react';

const Register = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { register } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleMouseMove = (e) => {
    const cards = document.getElementsByClassName("interactive-bg");
    for(const card of cards) {
      const rect = card.getBoundingClientRect(),
            x = e.clientX - rect.left,
            y = e.clientY - rect.top;
      card.style.setProperty("--mouse-x", `${x}px`);
      card.style.setProperty("--mouse-y", `${y}px`);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!username || !email || !password) {
      return setError('Please fill in all fields');
    }

    if (password.length < 6) {
      return setError('Password must be at least 6 characters');
    }
    if (username.length < 8) {
      return setError('Username must be at least 8 characters');
    }
    if (username.includes(' ')) {
      return setError('Username cannot contain spaces');
    }
    const alphanumericRegex = /^[a-zA-Z0-9]+$/;
    if (!alphanumericRegex.test(username)) {
      return setError('Username must contain only alphanumeric characters');
    }

    setIsLoading(true);
    try {
      await register(username, email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen bg-slate-950/30 flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans interactive-bg group/page"
      onMouseMove={handleMouseMove}
    >
      <style>{`
        .glass-card {
          position: relative;
          background: rgba(2, 6, 23, 0.4);
          border: 1px solid rgba(255,255,255,0.1);
        }
        .glass-card::before {
          content: "";
          position: absolute;
          top: -1px; left: -1px; right: -1px; bottom: -1px;
          border-radius: inherit;
          padding: 1px;
          background: radial-gradient(
            800px circle at var(--mouse-x, 50%) var(--mouse-y, 50%),
            rgba(139, 92, 246, 0.5),
            transparent 40%
          );
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          pointer-events: none;
          z-index: -1;
          opacity: 0;
          transition: opacity 0.5s ease;
      `}</style>

      {/* Main Glassmorphic Wrapper */}
      <div className="w-full max-w-md backdrop-blur-xl rounded-3xl shadow-2xl shadow-black/50 p-8 md:p-10 z-10 glass-card">
        
        {/* Brand/Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3.5 bg-teal-600/20 text-teal-400 rounded-2xl shadow-inner border border-teal-500/20 mb-5 relative group">
            <div className="absolute inset-0 bg-teal-500 rounded-2xl blur-md opacity-20 group-hover:opacity-40 transition-opacity"></div>
            <MessageSquare className="w-8 h-8 relative z-10" />
          </div>
          
          <h2 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-300 tracking-tight">
            Create Account <Sparkles className="w-5 h-5 text-teal-400 inline mb-1" />
          </h2>
          <p className="mt-3 text-slate-400 font-medium">Join ChatPulse to connect with your team</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs rounded-xl flex items-center gap-3">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span className="font-semibold leading-normal">{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          
          {/* Username */}
          <div>
            <label className="block text-slate-400 text-xs font-semibold mb-2 uppercase tracking-wider">Username</label>
            <div className="relative group/input">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500 group-focus-within/input:text-teal-400 transition-colors" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="user123"
                className="w-full pl-11 pr-4 py-3.5 bg-slate-900/50 border border-slate-700/50 hover:border-slate-600 focus:border-teal-500/80 rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-4 focus:ring-teal-500/10 transition-all font-medium text-sm"
                required
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-slate-400 text-xs font-semibold mb-2 uppercase tracking-wider">Email Address</label>
            <div className="relative group/input">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500 group-focus-within/input:text-teal-400 transition-colors" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@domain.com"
                className="w-full pl-11 pr-4 py-3.5 bg-slate-900/50 border border-slate-700/50 hover:border-slate-600 focus:border-teal-500/80 rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-4 focus:ring-teal-500/10 transition-all font-medium text-sm"
                required
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-slate-400 text-xs font-semibold mb-2 uppercase tracking-wider">Password</label>
            <div className="relative group/input">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500 group-focus-within/input:text-teal-400 transition-colors" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-11 pr-4 py-3.5 bg-slate-900/50 border border-slate-700/50 hover:border-slate-600 focus:border-teal-500/80 rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-4 focus:ring-teal-500/10 transition-all font-medium text-sm"
                required
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-4 py-3.5 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-semibold rounded-xl shadow-[0_0_20px_rgba(20,184,166,0.3)] hover:shadow-[0_0_25px_rgba(20,184,166,0.5)] border border-teal-400/20 focus:outline-none hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 text-sm group/btn"
          >
            {isLoading ? (
              <Loader className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <span>Get Started</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-1" />
              </>
            )}
          </button>
        </form>

        {/* Link back to Login */}
        <div className="mt-8 text-center pt-6">
          <p className="text-slate-400 text-sm font-medium">
            Already have an account?{' '}
            <Link to="/login" className="text-teal-400 hover:text-teal-300 font-semibold transition-colors ml-1">
              Sign In
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
};

export default Register;
