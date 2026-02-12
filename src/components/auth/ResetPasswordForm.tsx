'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Lock, Eye, EyeOff, CheckCircle } from 'lucide-react';
import Image from 'next/image';

export default function ResetPasswordForm() {
    const router = useRouter();
    const params = useParams();
    const token = params?.token as string;

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        if (!token) {
            setError('Invalid reset token');
        }
    }, [token]);

    const handleSubmit = async (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        setError(null);

        if (!password || !confirmPassword) {
            setError('Please fill in all fields');
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters long');
            return;
        }

        setLoading(true);

        try {
            const res = await fetch((process.env.NEXT_PUBLIC_API_URL) + `/auth/reset-password/${token}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ password }),
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data?.message || 'Failed to reset password');
            }

            setSuccess(true);
        } catch (err: unknown) {
            setError((err as Error).message || 'Failed to reset password');
        } finally {
            setLoading(false);
        }
    };

    const handleBackToLogin = () => {
        router.push('/');
    };

    if (success) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4 transition-colors duration-200">
                <div className="w-full max-w-md">
                    {/* Logo Card */}
                    <div className="w-full flex items-center justify-center mb-8">
                        <div className="w-24 h-24 rounded-2xl bg-white dark:bg-gray-800 flex items-center justify-center overflow-hidden shadow-xl ring-1 ring-gray-100 dark:ring-gray-700">
                            <Image src="/logo.png" alt="Expand Machinery" width={64} height={64} className="object-contain" />
                        </div>
                    </div>

                    {/* Heading above card */}
                    <div className="text-center mb-6">
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Password Reset Successful</h1>
                        <p className="text-gray-500 dark:text-gray-400">Your password has been updated</p>
                    </div>

                    {/* Success Card */}
                    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg p-8">
                        <div className="text-center space-y-6">
                            <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto">
                                <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
                            </div>

                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                    Password Updated Successfully
                                </h3>
                                <p className="text-gray-600 dark:text-gray-400 text-sm">
                                    Your password has been successfully reset. You can now log in with your new password.
                                </p>
                            </div>

                            <button
                                onClick={handleBackToLogin}
                                className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-medium py-3 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl"
                            >
                                Back to Login
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4 transition-colors duration-200">
            <div className="w-full max-w-md">
                {/* Logo Card */}
                <div className="w-full flex items-center justify-center mb-8">
                    <div className="w-24 h-24 rounded-2xl bg-white dark:bg-gray-800 flex items-center justify-center overflow-hidden shadow-xl ring-1 ring-gray-100 dark:ring-gray-700">
                        <Image src="/logo.png" alt="Expand Machinery" width={64} height={64} className="object-contain" />
                    </div>
                </div>

                {/* Heading above card */}
                <div className="text-center mb-6">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Reset Password</h1>
                    <p className="text-gray-500 dark:text-gray-400">Enter your new password</p>
                </div>

                {/* Reset Password Form Card */}
                <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-lg p-8">
                    <div className="space-y-5">
                        {/* New Password Input */}
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                New Password
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                                </div>
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Enter your new password"
                                    className="w-full pl-12 pr-12 py-3 border border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-4 flex items-center"
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-5 w-5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300" />
                                    ) : (
                                        <Eye className="h-5 w-5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300" />
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Confirm Password Input */}
                        <div>
                            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Confirm New Password
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                                </div>
                                <input
                                    id="confirmPassword"
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Confirm your new password"
                                    className="w-full pl-12 pr-12 py-3 border border-gray-200 dark:border-gray-700 dark:bg-gray-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute inset-y-0 right-0 pr-4 flex items-center"
                                >
                                    {showConfirmPassword ? (
                                        <EyeOff className="h-5 w-5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300" />
                                    ) : (
                                        <Eye className="h-5 w-5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300" />
                                    )}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="text-sm text-red-600 dark:text-red-400">{error}</div>
                        )}

                        {/* Reset Password Button */}
                        <button
                            disabled={loading || !password || !confirmPassword}
                            onClick={handleSubmit}
                            className={`cursor-pointer w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-medium py-3 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl ${loading || !password || !confirmPassword ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                            {loading ? 'Resetting Password...' : 'Reset Password'}
                        </button>

                        {/* Back to Login */}
                        <button
                            onClick={handleBackToLogin}
                            className="cursor-pointer w-full text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 font-medium py-2 rounded-xl transition-all duration-200"
                        >
                            Back to Login
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
