import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import AuthLayout from './AuthLayout';
import Input from '../../components/Input';
import Button from '../../components/Button';

export const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }
    setError('');
    setIsSubmitted(true);
  };

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="Enter your email to receive recovery instructions."
    >
      {isSubmitted ? (
        <div className="outfitly-auth-success-card">
          <div className="outfitly-alert outfitly-alert--success">
            Password reset instructions have been dispatched if an account exists for {email}.
          </div>
          <p className="outfitly-auth-subtitle" style={{ marginTop: '1rem' }}>
            Check your spam folder if you do not see the email within a couple of minutes.
          </p>
          <div style={{ marginTop: '2rem' }}>
            <Link to="/login" className="outfitly-btn outfitly-btn--primary outfitly-btn--full outfitly-btn--large">
              Return to Sign In
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="outfitly-auth-form" noValidate>
          <Input
            id="forgot-email"
            label="Email Address"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            required
            error={error}
          />

          <Button type="submit" variant="primary" size="large" fullWidth>
            Send Reset Instructions
          </Button>

          <footer className="outfitly-auth-footer">
            <Link to="/login" className="outfitly-text-link outfitly-text-link--muted">
              Back to Sign In
            </Link>
          </footer>
        </form>
      )}
    </AuthLayout>
  );
};

export default ForgotPassword;
