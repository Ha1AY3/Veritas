import React, { useState } from 'react'
import "../styles/register.scss"
import { Link, useNavigate } from 'react-router'
import { useAuth } from '../hooks/useAuth'

const Register = () => {
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [success, setSuccess] = useState(null);

    const {handleRegister, error, loading, clearError} = useAuth();
    const navigate = useNavigate();

    async function handleSubmit(e){
        e.preventDefault();

        try{
            await handleRegister(username, email, password);
            setSuccess(`Registration successful ✅ ! We've sent a verification link to ${email}. 
                Please check your inbox and click the link to verify your email.`);
        }catch(err){
            console.error("Registration failed: ", err);
        }
    }
  return (
      <div className="auth-container">
          <div className="auth-card">
              <h1>Create Your Account</h1>
              <p className="subtitle">Start your journey with Veritas</p>
            
              {error && <div className="error-message">{error}</div>}
              {success && <div className='success'>{success}</div>}

              <form className="auth-form" onSubmit={handleSubmit}>
                  <div className="form-group">
                      <label htmlFor="username">Username</label>
                      <input
                          type="text"
                          id="username"
                          value={username}
                          onChange={(e) => {
                            setUsername(e.target.value);
                          }}
                          placeholder="Choose a username"
                          required
                      />
                  </div>

                  <div className="form-group">
                      <label htmlFor="email">Email</label>
                      <input
                          type="email"
                          id="email"
                          value={email}
                          onChange={(e) => {
                            setEmail(e.target.value);
                          }}
                          placeholder="your@gmail.com"
                          required
                      />
                  </div>

                  <div className="form-group">
                      <label htmlFor="password">Password</label>
                      <input
                          type="password"
                          id="password"
                          value={password}
                          onChange={(e) => {
                            setPassword(e.target.value);
                          }}
                          placeholder="Min 6 characters"
                          required
                      />
                  </div>

                  <button type="submit" className="auth-btn">
                      Register
                  </button>
              </form>

              <p className="auth-link">
                  Already have an account? <Link to="/login">Login</Link>
              </p>
          </div>
      </div>
  )
}

export default Register
