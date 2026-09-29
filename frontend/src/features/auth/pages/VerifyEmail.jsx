import React, { useEffect, useState } from 'react'
import "../styles/verfiyEmail.scss"
import { Link, useLocation, useSearchParams } from 'react-router'
import EmailVerifying from '../components/VerifyEmail/EmailVerifying';
import EmailVerified from '../components/VerifyEmail/EmailVerified';
import EmailVerificationFailed from '../components/VerifyEmail/EmailVerificationFailed';
import { useAuth } from '../hooks/useAuth';

const VerifyEmail = () => {

    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');

    const {verifyUserEmail} = useAuth();

    const [loading, setLoading] = useState(true);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState(false);


    useEffect(() => {
      if(!token){
        setLoading(false);
        setError(true);
        
        return;
      }

      async function handleEmailVerification(){
        try{
          await verifyUserEmail(token);
          setLoading(false);
          setSuccess(true);
        }catch(err){
          console.error("Email verification failed: ", err);
          setLoading(false);
          setError(true);
        }
      }

      handleEmailVerification();
    }, [token, verifyUserEmail]);

  return (

      <div className="email-container">

          <div className="email-card">

              {loading && <EmailVerifying />}

              {success && <EmailVerified />}

              {error && <EmailVerificationFailed />}

          </div>

      </div>
      
  )
}

export default VerifyEmail
