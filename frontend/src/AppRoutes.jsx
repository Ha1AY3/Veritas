import React from 'react'
import { BrowserRouter, Route, Routes } from "react-router";
import Register from './features/auth/pages/Register';
import Login from './features/auth/pages/Login';
import VerifyEmail from './features/auth/pages/VerifyEmail';
import Protected from './features/auth/components/protected/Protected';
import Chat from './features/Chats/pages/chat/Chat';
import Library from './features/Chats/pages/library/Library';
import AppLayout from './layouts/AppLayout';
import { useState } from 'react';
import { useEffect } from 'react';
import LoadingScreen from './features/Chats/components/loading/LoadingScreen';
import PublicRoute from './features/auth/components/publicRoute/PublicRoute';


const AppRoutes = () => {
   const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1600);

    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return <LoadingScreen />;
  }
  return (
    <BrowserRouter>
        <Routes>
            <Route path="/register" element={<PublicRoute><Register/></PublicRoute>}/>
            <Route path='/login' element={<PublicRoute><Login /></PublicRoute>}/>
            <Route path='/verify-email' element={<VerifyEmail />}/>
            <Route element={<AppLayout />}>
              <Route path='/' element={<Protected><Chat/></Protected>}/>
              <Route path='/chat/:id?' element={<Protected><Chat/></Protected>}/>
              <Route path='/library' element={<Protected><Library/></Protected>}/>
            </Route>
        </Routes>
    </BrowserRouter>
  )
}

export default AppRoutes
