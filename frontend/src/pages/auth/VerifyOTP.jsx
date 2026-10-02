import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import AuthLayout from './AuthLayout';
import Button from '../../components/Button';
import { verifyOTP, resendOTP } from '../../services/api';

export const VerifyOTP = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Retrieve email passed via state from Register or previous step
  const stateEmail = location.state?.email || '';
  const initialNotice = location.state?.message || '';

  const [email, setEmail] = useState(stateEmail);
  const [isEditingEmail, setIsEditingEmail] = useState(!stateEmail);
  const [digits, setDigits] = useState(['', '', '', '', '', '']);

  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [infoMessage, setInfoMessage] = useState(initialNotice);
  const [countdown, setCountdown] = useState(60);

  // Array of 6 input refs for fluid focus transitions
  const inputRefs = useRef([]);

  // Countdown timer for resend cooldown
  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown((prev) => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  // Focus the first input box on mount
  useEffect(() => {
    if (!isEditingEmail && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [isEditingEmail]);

  // Handle individual digit input
  const handleDigitChange = (index, value) => {
    // Only allow single numeric digit
    const cleaned = value.replace(/\D/g, '');
    const char = cleaned.slice(-1); // Take latest char

    const newDigits = [...digits];
    newDigits[index] = char;
    setDigits(newDigits);
    setErrorMessage('');

    // Advance focus to next input if digit entered
    if (char && index < 5 && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1].focus();
    }
  };

  // Handle keyboard navigation (Backspace, Arrow keys)
  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0 && inputRefs.current[index - 1]) {
        // Current is empty, backspace moves to previous
        inputRefs.current[index - 1].focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1].focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1].focus();
    }
  };

  // Support pasting entire 6-digit code
  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    const numericChars = pastedData.replace(/\D/g, '').slice(0, 6);

    if (numericChars) {
      const newDigits = [...digits];
      for (let i = 0; i < 6; i++) {
        newDigits[i] = numericChars[i] || '';
      }
      setDigits(newDigits);
      setErrorMessage('');

      // Focus the last filled box or next empty box
      const targetIndex = Math.min(numericChars.length, 5);
      if (inputRefs.current[targetIndex]) {
        inputRefs.current[targetIndex].focus();
      }
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setInfoMessage('');

    if (!email.trim()) {
      setErrorMessage('Please provide the email address associated with your account.');
      setIsEditingEmail(true);
      return;
    }

    const otpCode = digits.join('');
    if (otpCode.length < 6) {
      setErrorMessage('Please enter all 6 digits of the verification code.');
      return;
    }

    setIsLoading(true);

    try {
      await verifyOTP({
        email: email.trim().toLowerCase(),
        otp: otpCode,
      });

      // On successful verification, redirect to login with confirmation
      navigate('/login', {
        state: {
          email: email.trim().toLowerCase(),
          message: 'Email verified successfully. You can now sign in.',
        },
      });
    } catch (err) {
      setErrorMessage(err.message || 'Verification failed. The code may be invalid or expired.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0 || isResending) return;

    if (!email.trim()) {
      setErrorMessage('Please enter your email to resend the code.');
      setIsEditingEmail(true);
      return;
    }

    setIsResending(true);
    setErrorMessage('');
    setInfoMessage('');

    try {
      const res = await resendOTP({ email: email.trim().toLowerCase() });
      setInfoMessage(res.message || 'A new 6-digit verification code has been sent to your email.');
      setCountdown(60);
      setDigits(['', '', '', '', '', '']);
      if (inputRefs.current[0]) inputRefs.current[0].focus();
    } catch (err) {
      setErrorMessage(err.message || 'Could not resend verification code. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <AuthLayout
      title="Verify your email"
      subtitle="We've sent a 6-digit verification code to your email."
    >
      {/* Target Email Display & Edit */}
      <div className="outfitly-email-badge-card">
        {isEditingEmail ? (
          <div className="outfitly-email-edit-row">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="outfitly-input outfitly-input--compact"
              autoFocus
            />
            <button
              type="button"
              className="outfitly-btn outfitly-btn--outline outfitly-btn--small"
              onClick={() => setIsEditingEmail(false)}
            >
              Done
            </button>
          </div>
        ) : (
          <div className="outfitly-email-display-row">
            <span className="outfitly-email-label">Verification code sent to:</span>
            <div className="outfitly-email-value-wrap">
              <strong className="outfitly-email-value">{email || 'your email'}</strong>
              <button
                type="button"
                className="outfitly-text-link outfitly-text-link--small"
                onClick={() => setIsEditingEmail(true)}
              >
                Change
              </button>
            </div>
          </div>
        )}
      </div>

      {infoMessage && (
        <div className="outfitly-alert outfitly-alert--info" role="status">
          <svg className="outfitly-alert__icon" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <span>{infoMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="outfitly-alert outfitly-alert--error" role="alert">
          <svg className="outfitly-alert__icon" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleVerify} className="outfitly-auth-form" noValidate>
        {/* 6 Digit Input Matrix */}
        <fieldset className="outfitly-otp-fieldset">
          <legend className="outfitly-otp-legend">Enter 6-digit code</legend>
          <div className="outfitly-otp-group" onPaste={handlePaste}>
            {digits.map((digit, index) => (
              <input
                key={index}
                ref={(el) => (inputRefs.current[index] = el)}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={digit}
                onChange={(e) => handleDigitChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                disabled={isLoading}
                aria-label={`Digit ${index + 1} of 6`}
                className={`outfitly-otp-cell ${digit ? 'outfitly-otp-cell--filled' : ''}`}
                autoComplete="one-time-code"
              />
            ))}
          </div>
        </fieldset>

        <Button
          type="submit"
          variant="primary"
          size="large"
          fullWidth
          isLoading={isLoading}
          disabled={digits.join('').length < 6}
        >
          Verify Email
        </Button>

        {/* Resend Code Section */}
        <div className="outfitly-otp-resend">
          <span className="outfitly-otp-resend__text">Didn’t receive the code?</span>{' '}
          {countdown > 0 ? (
            <span className="outfitly-otp-countdown">
              Resend in <strong>{countdown}s</strong>
            </span>
          ) : (
            <button
              type="button"
              onClick={handleResend}
              disabled={isResending}
              className="outfitly-btn-link outfitly-btn-link--accent"
            >
              {isResending ? 'Resending...' : 'Resend Code'}
            </button>
          )}
        </div>

        <footer className="outfitly-auth-footer">
          <Link to="/login" className="outfitly-text-link outfitly-text-link--muted">
            Back to Sign In
          </Link>
        </footer>
      </form>
    </AuthLayout>
  );
};

export default VerifyOTP;
