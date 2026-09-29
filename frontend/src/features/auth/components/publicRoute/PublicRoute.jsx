import React from 'react'
import { Navigate } from 'react-router';
import { useAuth } from '../../hooks/useAuth';

const PublicRoute = ({ children }) => {
     const { isAuthenticated, loading } = useAuth();

    if (loading) {
        return null;
    }

    if (isAuthenticated) {
        return <Navigate to="/" replace />;
    }

    return children;
}

export default PublicRoute
