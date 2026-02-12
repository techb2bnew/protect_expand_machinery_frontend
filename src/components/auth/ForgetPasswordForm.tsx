'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, ArrowLeft } from 'lucide-react';
import Image from 'next/image';

export default function ForgetPasswordForm() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const res = await fetch((process.env.NEXT_PUBLIC_API_URL) + '/auth/forgot-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email }),
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data?.message || 'Failed to send reset email');
            }

            setSuccess(true);
        } catch (err: unknown) {
            setError((err as Error).message || 'Failed to send reset email');
        } finally {
            setLoading(false);
        }
    };

    const handleBackToLogin = () => {
        router.push('/');
    };

    if (success) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
                <div className="w-full max-w-md">
                    {/* Logo Card */}
                    <div className="w-full flex items-center justify-center mb-8">
                        <div className="w-24 h-24 rounded-2xl bg-white flex items-center justify-center overflow-hidden shadow-xl ring-1 ring-gray-100">
                            <Image src="/logo.png" alt="Expand Machinery" width={64} height={64} className="object-contain" />
                        </div>
                    </div>

                    {/* Heading above card */}
                    <div className="text-center mb-6">
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">Check Your Email</h1>
                        <p className="text-gray-500">We&apos;ve sent you a password reset link</p>
                    </div>

                    {/* Success Card */}
                    <div className="bg-white rounded-3xl shadow-lg p-8">
                        <div className="text-center space-y-6">
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                                <Mail className="h-8 w-8 text-green-600" />
                            </div>

                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                    Email Sent Successfully
                                </h3>
                                <p className="text-gray-600 text-sm">
                                    We&apos;ve sent a password reset link to <strong>{email}</strong>.
                                    Please check your email and follow the instructions to reset your password.
                                </p>
                            </div>

                            <div className="space-y-3">
                                <button
                                    onClick={handleBackToLogin}
                                    className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-medium py-3 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl"
                                >
                                    Back to Login
                                </button>

                                <button
                                    onClick={() => setSuccess(false)}
                                    className="w-full text-purple-600 hover:text-purple-700 font-medium py-2 rounded-xl transition-all duration-200"
                                >
                                    Try Different Email
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Logo Card */}
                <div className="w-full flex items-center justify-center mb-8">
                    <div className="w-24 h-24 rounded-2xl bg-white flex items-center justify-center overflow-hidden shadow-xl ring-1 ring-gray-100">
                        <Image src="/logo.png" alt="Expand Machinery" width={64} height={64} className="object-contain" />
                    </div>
                </div>

                {/* Heading above card */}
                <div className="text-center mb-6">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Forgot Password?</h1>
                    <p className="text-gray-500">Enter your email to reset your password</p>
                </div>

                {/* Forget Password Form Card */}
                <div className="bg-white rounded-3xl shadow-lg p-8">
                    <div className="space-y-5">
                        {/* Email Input */}
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                                Email Address
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Mail className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="Enter your email address"
                                    className="w-full pl-12 pr-4 py-3 border border-gray-200 bg-white text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="text-sm text-red-600">{error}</div>
                        )}

                        {/* Send Reset Link Button */}
                        <button
                            disabled={loading || !email}
                            onClick={handleSubmit}
                            className={`cursor-pointer w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-medium py-3 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl ${loading || !email ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                            {loading ? 'Sending...' : 'Send Reset Link'}
                        </button>

                        {/* Back to Login */}
                        <button
                            onClick={handleBackToLogin}
                            className="cursor-pointer w-full flex items-center justify-center text-gray-600 hover:text-gray-800 font-medium py-2 rounded-xl transition-all duration-200"
                        >
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Login
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
