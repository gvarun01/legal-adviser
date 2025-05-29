
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthForms from '@/components/AuthForms';
import { useAuth } from '@/context/AuthContext';

const AuthPage = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  
  // Redirect to home if already logged in
  useEffect(() => {
    if (user && !loading) {
      navigate('/', { replace: true });
    }
  }, [user, loading, navigate]);
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold">ClearClause</h1>
          <p className="text-muted-foreground mt-2">AI Legal Simplifier</p>
        </div>
        
        <AuthForms />
        
        <p className="text-center text-sm text-muted-foreground mt-6">
          ClearClause helps you understand complex legal language in plain English
        </p>
      </div>
    </div>
  );
};

export default AuthPage;
