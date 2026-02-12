'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import Image from 'next/image';

export default function LoginPage() {
    const router = useRouter();
    const { login } = useAuth();
    const [showPassword, setShowPassword] = useState(false);
    const [staySignedIn, setStaySignedIn] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

    const validateForm = () => {
        const errors: { email?: string; password?: string } = {};

        if (!email.trim()) {
            errors.email = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
            errors.email = 'Please enter a valid email address';
        }

        if (!password.trim()) {
            errors.password = 'Password is required';
        }

        setFieldErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (e?: React.FormEvent | React.MouseEvent<HTMLButtonElement>) => {
        e?.preventDefault();
        setError(null);
        setFieldErrors({});

        if (!validateForm()) {
            return;
        }

        setLoading(true);
        try {
            const res = await fetch((process.env.NEXT_PUBLIC_API_URL) + '/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data?.message || 'Login failed');
            }

            const token = data?.data?.token;
            const userData = data?.data?.user;

            if (!token || !userData) {
                throw new Error('Missing token or user data in response');
            }

            // Use auth context to store user data
            login(token, userData, staySignedIn);

            router.push('/dashboard/customers');
        } catch (err: unknown) {
            setError((err as Error).message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-3 sm:p-4">
            <div className="w-full max-w-md">
                {/* Logo Card */}
                <div className="w-full flex items-center justify-center mb-6 sm:mb-8">
                    <div className="w-50 h-50 sm:w-24 sm:h-24 rounded-2xl bg-white flex items-center justify-center overflow-hidden shadow-xl ring-1 ring-gray-100">
                        <Image src="/logo.png" alt="Expand Machinery" width={100} height={100} className="object-contain w-12 h-12 sm:w-16 sm:h-16" />
                    </div>
                </div>

                {/* Heading above card (like Figma) */}
                <div className="text-center mb-4 sm:mb-6">
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Welcome Back</h1>
                    <p className="text-sm sm:text-base text-gray-500">Sign in to your support account</p>
                </div>

                {/* Login Form Card */}
                <div className="bg-white rounded-2xl sm:rounded-3xl shadow-lg p-6 sm:p-8">
                    <form onSubmit={handleSubmit}>
                        <div className="space-y-4 sm:space-y-5">
                            {/* Email Input */}
                            <div>
                                <label htmlFor="email" className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                                    Email Address <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none">
                                        <Mail className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                                    </div>
                                    <input
                                        id="email"
                                        type="email"
                                        value={email}
                                        onChange={(e) => {
                                            setEmail(e.target.value);
                                            if (fieldErrors.email) {
                                                setFieldErrors({ ...fieldErrors, email: undefined });
                                            }
                                        }}
                                        placeholder="Enter your email address"
                                        className={`w-full pl-10 sm:pl-12 pr-3 sm:pr-4 py-2.5 sm:py-3 border bg-white text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-sm sm:text-base ${fieldErrors.email ? 'border-red-300 focus:ring-red-500' : 'border-gray-200'
                                            }`}
                                    />
                                </div>
                                {fieldErrors.email && (
                                    <p className="mt-1 text-xs sm:text-sm text-red-600">{fieldErrors.email}</p>
                                )}
                            </div>

                            {/* Password Input */}
                            <div>
                                <label htmlFor="password" className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                                    Password <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none">
                                        <Lock className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
                                    </div>
                                    <input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => {
                                            setPassword(e.target.value);
                                            if (fieldErrors.password) {
                                                setFieldErrors({ ...fieldErrors, password: undefined });
                                            }
                                        }}
                                        placeholder="Enter your password"
                                        className={`w-full pl-10 sm:pl-12 pr-10 sm:pr-12 py-2.5 sm:py-3 border bg-white text-gray-900 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-sm sm:text-base ${fieldErrors.password ? 'border-red-300 focus:ring-red-500' : 'border-gray-200'
                                            }`}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute inset-y-0 right-0 pr-3 sm:pr-4 flex items-center"
                                    >
                                        {showPassword ? (
                                            <EyeOff className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 hover:text-gray-600" />
                                        ) : (
                                            <Eye className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400 hover:text-gray-600" />
                                        )}
                                    </button>
                                </div>
                                {fieldErrors.password && (
                                    <p className="mt-1 text-xs sm:text-sm text-red-600">{fieldErrors.password}</p>
                                )}
                            </div>

                            {/* Remember Me & Forgot Password */}
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
                                <label className="flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={staySignedIn}
                                        onChange={(e) => setStaySignedIn(e.target.checked)}
                                        className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                                    />
                                    <span className="ml-2 text-xs sm:text-sm text-gray-600">Stay signed in for 30 days</span>
                                </label>
                                <a href="/forgot-password" className="text-xs sm:text-sm font-medium text-purple-600 hover:text-purple-700">
                                    Forgot Password?
                                </a>
                            </div>

                            {error && (
                                <div className="text-xs sm:text-sm text-red-600">{error}</div>
                            )}
                            {/* Sign In Button */}
                            <button
                                type="submit"
                                disabled={loading}
                                className={`w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-medium py-2.5 sm:py-3 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl text-sm sm:text-base cursor-pointer ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                            >
                                {loading ? 'Signing In...' : 'Sign In'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}