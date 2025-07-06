'use client';

import React, { useState } from 'react';
import LoginForm from '../login/page';
import SignupForm from '../signup/page';

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);

  const switchToSignup = () => setIsLogin(false);
  const switchToLogin = () => setIsLogin(true);

  return (
    <div className="min-h-screen">
      {isLogin ? (
        <LoginForm  />
      ) : (
        <SignupForm />
      )}
    </div>
  );
};

export default AuthPage; 