import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import AuthLayout from './AuthLayout';
import Input from '../../components/Input';
import Button from '../../components/Button';
import { loginUser } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  // Retrieve any flash messages or pre-filled email from previous navigation (e.g. from VerifyOTP)
  const initialEmail = location.state?.email || '';
  const successNotice = location.state?.message || '';

  const [formData, setFormData] = useState({
    email: initialEmail,
    password: '',
  });

  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [successMessage, setSuccessMessage] = useState(successNotice);
  const [isLoading, setIsLoading] = useState(false);

  const validate = () => {
    const newErrors = {};

    if (!formData.email.trim()) {
      newErrors.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = 'Please enter a valid email address.';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error on typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
    if (serverError) {
      setServerError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMessage('');
    setServerError('');

    if (!validate()) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await loginUser({
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
      });

      // Update auth context state with user and tokens
      login(response);

      // Navigate to authenticated destination or home
      navigate('/', { replace: true });
    } catch (err) {
      // Check if user is unverified and redirect to OTP verification if requested
      const errMsg = err.message || 'Login failed. Please verify your credentials.';
      if (errMsg.toLowerCase().includes('verify your email')) {
        setServerError('Please verify your email before logging in. Redirecting to verification...');
        setTimeout(() => {
          navigate('/verify-otp', { state: { email: formData.email.trim().toLowerCase() } });
        }, 1500);
      } else {
        setServerError(errMsg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to continue building your perfect outfit."
    >
      {/* Success Notification (e.g. from OTP verification) */}
      {successMessage && (
        <div className="outfitly-alert outfitly-alert--success" role="status">
          <svg className="outfitly-alert__icon" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span>{successMessage}</span>
        </div>
      )}

      {/* Error Notification */}
      {serverError && (
        <div className="outfitly-alert outfitly-alert--error" role="alert">
          <svg className="outfitly-alert__icon" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span>{serverError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="outfitly-auth-form" noValidate>
        <Input
          id="login-email"
          label="Email Address"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          placeholder="name@example.com"
          required
          autoComplete="email"
          error={errors.email}
          disabled={isLoading}
        />

        <div>
          <Input
            id="login-password"
            label="Password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="Enter your password"
            required
            autoComplete="current-password"
            error={errors.password}
            disabled={isLoading}
          />
          <div className="outfitly-field-subrow">
            <Link to="/forgot-password" className="outfitly-text-link outfitly-text-link--muted">
              Forgot password?
            </Link>
          </div>
        </div>

        <Button
          type="submit"
          variant="primary"
          size="large"
          fullWidth
          isLoading={isLoading}
        >
          Sign In
        </Button>

        <footer className="outfitly-auth-footer">
          <span className="outfitly-auth-footer__text">Don’t have an account?</span>{' '}
          <Link to="/register" className="outfitly-text-link">
            Create account
          </Link>
        </footer>
      </form>
    </AuthLayout>
  );
};

export default Login;
