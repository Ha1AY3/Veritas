import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import "../styles/login.scss"
import { useAuth } from '../hooks/useAuth'

const Login = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const { handleLogin, loading, error, clearError, isAuthenticated, fetchMe} = useAuth();
    const navigate = useNavigate();
    
    async function handleSubmit(e){
        e.preventDefault();

        try{
            await handleLogin(email, password);

            await fetchMe();

            navigate("/");

        }catch(err){
            console.error("Login failed: ", err);
        }

    }
  return (
      <div className="auth-container">
          <div className="auth-card">
              <h1>Welcome to Veritas</h1>
              <p className="subtitle">Answers you can trust. Learning you can follow.</p>

              {error && <div className="error-message">{error}</div>}

              <form className="auth-form" onSubmit={handleSubmit}>
                  <div className="form-group">
                      <label htmlFor="email">Email</label>
                      <input type="email" id="email" value={email}
                          onChange={(e) => {
                            setEmail(e.target.value);
                            clearError();
                          }}
                          placeholder="Enter your email"
                          required
                      />
                  </div>

                  <div className="form-group">
                      <label htmlFor="password">Password</label>
                      <input type="password" id="password" value={password}
                          onChange={(e) => {
                            setPassword(e.target.value);
                            clearError();
                          }}
                          placeholder="Enter your password"
                          required
                      />
                  </div>

                  <button type="submit" className="auth-btn">
                      Login
                  </button>
              </form>

              <p className="auth-link">
                  Don't have an account? <Link to="/register">Register</Link>
              </p>
          </div>
      </div>
  )
}

export default Login
