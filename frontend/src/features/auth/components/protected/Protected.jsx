import React from 'react'
import { useAuth } from '../../hooks/useAuth'
import { Navigate } from 'react-router';

const Protected = ({ children }) => {

    const {isAuthenticated,loading, user} = useAuth();


    if (loading) {
        return (
            <div className="loading-container">
                <div className="spinner"></div>
                <p>Loading...</p>
            </div>
        );
    }

    if(!isAuthenticated){
        return <Navigate to="/login"/>
    }
  return children;
}

export default Protected
