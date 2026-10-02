import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthLayout from './AuthLayout';
import Input from '../../components/Input';
import Button from '../../components/Button';
import { registerUser } from '../../services/api';

export const Register = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirm_password: '',
  });

  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const validate = () => {
    const newErrors = {};

    if (!formData.username.trim()) {
      newErrors.username = 'Username is required.';
    } else if (formData.username.trim().length < 3) {
      newErrors.username = 'Username must be at least 3 characters.';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = 'Please enter a valid email address.';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required.';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters.';
    }

    if (!formData.confirm_password) {
      newErrors.confirm_password = 'Confirm password is required.';
    } else if (formData.password !== formData.confirm_password) {
      newErrors.confirm_password = 'Passwords do not match.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
    if (serverError) {
      setServerError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    if (!validate()) {
      return;
    }

    setIsLoading(true);

    try {
      const cleanEmail = formData.email.trim().toLowerCase();
      const cleanUsername = formData.username.trim();

      await registerUser({
        username: cleanUsername,
        email: cleanEmail,
        password: formData.password,
        confirm_password: formData.confirm_password,
      });

      // Pass email to OTP page via route state for seamless UX
      navigate('/verify-otp', {
        state: {
          email: cleanEmail,
          message: 'Account created! Please enter the 6-digit code sent to your email.',
        },
      });
    } catch (err) {
      // Map DRF field-specific validation errors if available
      if (err.data && typeof err.data === 'object') {
        const fieldErrors = {};
        for (const [key, val] of Object.entries(err.data)) {
          if (Array.isArray(val)) {
            fieldErrors[key] = val.join(' ');
          } else if (typeof val === 'string') {
            fieldErrors[key] = val;
          }
        }
        setErrors((prev) => ({ ...prev, ...fieldErrors }));
      }
      setServerError(err.message || 'Registration failed. Please check your information.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Join Outfitly and start building outfits that match your style."
    >
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
          id="register-username"
          label="Username"
          name="username"
          type="text"
          value={formData.username}
          onChange={handleChange}
          placeholder="e.g. stylecurator"
          required
          autoComplete="username"
          error={errors.username}
          disabled={isLoading}
        />

        <Input
          id="register-email"
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

        <Input
          id="register-password"
          label="Password"
          name="password"
          type="password"
          value={formData.password}
          onChange={handleChange}
          placeholder="At least 8 characters"
          required
          autoComplete="new-password"
          error={errors.password}
          disabled={isLoading}
        />

        <Input
          id="register-confirm-password"
          label="Confirm Password"
          name="confirm_password"
          type="password"
          value={formData.confirm_password}
          onChange={handleChange}
          placeholder="Re-enter your password"
          required
          autoComplete="new-password"
          error={errors.confirm_password}
          disabled={isLoading}
        />

        <Button
          type="submit"
          variant="primary"
          size="large"
          fullWidth
          isLoading={isLoading}
        >
          Create Account
        </Button>

        <footer className="outfitly-auth-footer">
          <span className="outfitly-auth-footer__text">Already have an account?</span>{' '}
          <Link to="/login" className="outfitly-text-link">
            Sign in
          </Link>
        </footer>
      </form>
    </AuthLayout>
  );
};

export default Register;
