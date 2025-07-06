'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AuthPage from './auth/page';

export default function Home() {
  // const router = useRouter();

  // useEffect(() => {
  //   // Check if user is already logged in
  //   const token = localStorage.getItem('token');
  //   if (token) {
  //     router.push('/dashboard');
  //   } else {
  //     router.push('/auth');
  //   }
  // }, [router]);

  return (
    <AuthPage />
    // <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-rose-50 flex items-center justify-center">
    //   <div className="text-center">
    //     <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto"></div>
    //     <p className="mt-4 text-gray-600">Loading...</p>
    //   </div>
    // </div>
  );
} 