'use client';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';
import { useTheme } from '@/contexts/ThemeContext';
export default function ConfirmPage() {
  const [confirmationCode, setConfirmationCode] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { confirmRegistration, resendConfirmation } = useAuth();
  const { darkMode } = useTheme();
  useEffect(() => {
    // Get email from URL query params
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [searchParams]);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await confirmRegistration(email, confirmationCode);
      setIsSuccess(true);
      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Confirmation failed. Please check your code and try again.');
    } finally {
      setIsLoading(false);
    }
  };
  const handleResendCode = async () => {
    if (!email) {
      setError('Please enter your email address');
      return;
    }
    setIsLoading(true);
    try {
      await resendConfirmation(email);
      setError(''); // Clear any existing errors
      alert('A new confirmation code has been sent to your email address.');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to resend confirmation code.');
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <div className={`min-h-screen flex flex-col items-center justify-center ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'} py-12 px-4 sm:px-6 lg:px-8`}>
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="flex justify-center mb-5">
            <div className={`w-20 h-20 rounded-full ${darkMode ? 'bg-blue-600' : 'bg-blue-600'} flex items-center justify-center shadow-lg`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <h1 className={`text-3xl font-extrabold ${darkMode ? 'text-white' : 'text-gray-900'} sm:text-4xl tracking-tight`}>
            Confirm Your Email
          </h1>
          <p className={`mt-2 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            Please enter the confirmation code sent to your email
          </p>
        </div>
        <div className={`${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-xl rounded-lg p-8 border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          {isSuccess ? (
            <div className="text-center">
              <div className="mb-4 flex justify-center">
                <div className={`w-16 h-16 rounded-full ${darkMode ? 'bg-green-900' : 'bg-green-100'} flex items-center justify-center`}>
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-10 w-10 ${darkMode ? 'text-green-400' : 'text-green-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              <h2 className={`text-lg font-medium ${darkMode ? 'text-white' : 'text-gray-900'} mb-2`}>Email Confirmed Successfully!</h2>
              <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'} mb-4`}>
                Your email has been confirmed. You will be redirected to the login page shortly.
              </p>
              <Link href="/login" className={`${darkMode ? 'text-blue-400' : 'text-blue-600'} hover:underline font-medium`}>
                Click here if you're not redirected
              </Link>
            </div>
          ) : (
            <>
              {error && (
                <div className={`mb-4 ${darkMode ? 'bg-red-900/30 text-red-400' : 'bg-red-50 text-red-700'} p-3 rounded-md text-sm`}>
                  {error}
                </div>
              )}
              <form className="space-y-6" onSubmit={handleSubmit}>
                <div>
                  <label htmlFor="email" className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Email address
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    className={`mt-1 appearance-none block w-full px-3 py-2 border ${darkMode ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300'} rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${darkMode ? 'focus:ring-blue-400 focus:border-blue-400' : ''} sm:text-sm`}
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
                <div>
                  <label htmlFor="confirmationCode" className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Confirmation Code
                  </label>
                  <div className="mt-1 flex justify-between gap-2">
                    {[0, 1, 2, 3, 4, 5].map((index) => (
                      <div key={index} className="w-1/6">
                        <input
                          type="password"
                          maxLength={1}
                          value={confirmationCode[index] || ''}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value.length <= 1 && /^[0-9]*$/.test(value)) {
                              const newCode = confirmationCode.split('');
                              newCode[index] = value;
                              setConfirmationCode(newCode.join(''));
                              // Auto-focus next input field if value is entered
                              if (value && index < 5) {
                                const nextInput = document.querySelector(`input[name=code-${index + 1}]`) as HTMLInputElement;
                                if (nextInput) nextInput.focus();
                              }
                            }
                          }}
                          onKeyDown={(e) => {
                            // Handle backspace to go to previous input
                            if (e.key === 'Backspace' && !confirmationCode[index] && index > 0) {
                              const prevInput = document.querySelector(`input[name=code-${index - 1}]`) as HTMLInputElement;
                              if (prevInput) prevInput.focus();
                            }
                          }}
                          name={`code-${index}`}
                          className={`w-full h-12 text-center text-lg font-bold ${
                            darkMode ? 'bg-gray-700 text-white border-gray-600' : 'bg-white text-gray-900 border-gray-300'
                          } rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                            darkMode ? 'focus:ring-blue-400 focus:border-blue-400' : ''
                          }`}
                          style={{ aspectRatio: '1/1' }}
                          required
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          disabled={isLoading}
                        />
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <button
                    type="submit"
                    className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${darkMode ? 'focus:ring-offset-gray-800' : ''} disabled:opacity-50 disabled:cursor-not-allowed`}
                    disabled={isLoading}
                  >
                    {isLoading ? 'Confirming...' : 'Confirm Email'}
                  </button>
                </div>
                <div className="text-sm text-center mt-4">
                  <button
                    type="button"
                    onClick={handleResendCode}
                    className={`${darkMode ? 'text-blue-400' : 'text-blue-600'} hover:text-blue-500 font-medium`}
                    disabled={isLoading}
                  >
                    Didn't receive a code? Resend
                  </button>
                </div>
              </form>
              <div className={`mt-6 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'} pt-4 text-center`}>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Already confirmed?{' '}
                  <Link href="/login" className={`${darkMode ? 'text-blue-400' : 'text-blue-600'} hover:text-blue-500 font-medium`}>
                    Go to Login
                  </Link>
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}