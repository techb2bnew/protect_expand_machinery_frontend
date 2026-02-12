'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { User, ArrowLeft, Loader2, Eye, EyeOff } from 'lucide-react';
import userService, { UserProfile, UpdateProfileData } from '@/services/userService';
import toast from '@/utils/toast';

export default function ProfilePage() {
    const router = useRouter();
    const { updateUser } = useAuth();
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);
    const [errors, setErrors] = useState<{ 
        firstName?: string; 
        lastName?: string; 
        email?: string; 
        phone?: string;
        currentPassword?: string;
        newPassword?: string;
        confirmPassword?: string;
    }>({});
    
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    
    // Password visibility state
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    
    // Password change state
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    
    // Profile form state
    const [profileData, setProfileData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        role: '',
    });
    
    // Password form state
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });

    // Fetch user profile on component mount
    useEffect(() => {
        const fetchUserProfile = async () => {
            try {
                setInitialLoading(true);
                const profile = await userService.getCurrentUser();
                setUserProfile(profile);

                // Split name into first and last
                const nameParts = (profile.name || 'Manager User').split(' ');
                const firstName = nameParts[0] || 'Manager';
                const lastName = nameParts.slice(1).join(' ') || 'User';

                setProfileData({
                    firstName,
                    lastName,
                    email: profile.email || '',
                    phone: profile.phone || '',
                    role: profile.role || 'Admin',
                });
            } catch (error) {
                console.error('Error fetching user profile:', error);
                toast.error('Failed to load profile data');
            } finally {
                setInitialLoading(false);
            }
        };

        fetchUserProfile();
    }, []);

    const validateProfile = () => {
        const newErrors: { firstName?: string; lastName?: string; email?: string; phone?: string } = {};
        if (!profileData.firstName.trim()) newErrors.firstName = 'First name is required';
        if (!profileData.lastName.trim()) newErrors.lastName = 'Last name is required';

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!profileData.email.trim()) newErrors.email = 'Email is required';
        else if (!emailRegex.test(profileData.email.trim())) newErrors.email = 'Enter a valid email address';

        const phoneDigits = profileData.phone.replace(/\D/g, '');
        if (profileData.phone && (phoneDigits.length < 10 || phoneDigits.length > 15)) {
            newErrors.phone = 'Phone number must be between 10 and 15 digits';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const validatePassword = () => {
        const newErrors: { 
            currentPassword?: string; 
            newPassword?: string; 
            confirmPassword?: string 
        } = {};

        if (!passwordData.currentPassword.trim()) {
            newErrors.currentPassword = 'Current password is required';
        }

        if (!passwordData.newPassword.trim()) {
            newErrors.newPassword = 'New password is required';
        } else if (passwordData.newPassword.length < 6) {
            newErrors.newPassword = 'Password must be at least 6 characters';
        }

        if (!passwordData.confirmPassword.trim()) {
            newErrors.confirmPassword = 'Please confirm your new password';
        } else if (passwordData.newPassword !== passwordData.confirmPassword) {
            newErrors.confirmPassword = 'Passwords do not match';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSaveChanges = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        
        // Validate profile data
        if (!validateProfile()) { 
            setLoading(false); 
            return; 
        }

        try {
            const updateData: UpdateProfileData = {
                name: `${profileData.firstName} ${profileData.lastName}`.trim(),
                email: profileData.email,
                phone: profileData.phone,
            };

            // If changing password, add password fields
            if (isChangingPassword) {
                if (!validatePassword()) {
                    setLoading(false);
                    return;
                }
                updateData.currentPassword = passwordData.currentPassword;
                updateData.newPassword = passwordData.newPassword;
            }

            await userService.updateProfile(updateData);
            
            // Always fetch fresh profile from API (source of truth)
            const fresh = await userService.getCurrentUser();
            setUserProfile(fresh);
            
            if (updateUser) updateUser({
                id: fresh._id,
                name: fresh.name,
                email: fresh.email,
                role: fresh.role,
                profileImage: fresh.profileImage
            });

            // Reset password form if password was changed
            if (isChangingPassword) {
                setPasswordData({
                    currentPassword: '',
                    newPassword: '',
                    confirmPassword: '',
                });
                setIsChangingPassword(false);
                toast.success('Profile and password updated successfully!');
            } else {
                toast.success('Profile updated successfully!');
            }
        } catch (error: unknown) {
            console.error('Error updating profile:', error);
            toast.error((error as Error).message || 'Failed to update profile');
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        router.push('/dashboard/customers');
    };

    const togglePasswordChange = () => {
        setIsChangingPassword(!isChangingPassword);
        // Reset password errors when toggling
        setErrors({
            ...errors,
            currentPassword: undefined,
            newPassword: undefined,
            confirmPassword: undefined
        });
    };

    // Show loading spinner while fetching initial data
    if (initialLoading) {
        return (
            <main className="flex-1 overflow-auto p-8 bg-gray-50 dark:bg-gray-900 min-h-screen">
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="flex items-center gap-3">
                        <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
                        <span className="text-gray-600 dark:text-gray-400">Loading profile...</span>
                    </div>
                </div>
            </main>
        );
    }

    return (
        <main className="flex-1 overflow-auto p-8 bg-gray-50 dark:bg-gray-900 min-h-screen">
            <div className="flex items-center gap-6 mb-8">
                <button
                    onClick={() => router.push('/dashboard/customers')}
                    className="cursor-pointer flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                    <span className="text-sm font-medium">Back to Dashboard</span>
                </button>
                <div className="flex-1">
                    <h1 className="text-4xl font-bold text-purple-600 dark:text-purple-400">
                        {userProfile?.role === 'manager' ? 'Administrator' : 'Agent'} Profile
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">Manage your account information</p>
                </div>
            </div>
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="max-w-3xl">
                    {/* Profile Card */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-8">
                        <form onSubmit={handleSaveChanges}>
                            {/* Avatar and Name Section */}
                            <div className="flex items-start gap-6 mb-8 pb-8 border-b border-gray-200 dark:border-gray-700">
                                <div className="relative">
                                    <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg overflow-hidden">
                                        {userProfile?.profileImage ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={`${process.env.NEXT_PUBLIC_FILE_BASE_URL}${userProfile.profileImage}`} alt="Avatar" className="w-full h-full object-cover" />
                                        ) : (
                                            <User className="w-12 h-12 text-white" />
                                        )}
                                    </div>
                                    <input
                                        id="profileImageInput"
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={async (e) => {
                                            const file = e.target.files?.[0];
                                            if (!file) return;
                                            try {
                                                setLoading(true);
                                                await userService.uploadProfileImage(file);
                                                // Fetch fresh data from API so navbar also updates
                                                const fresh = await userService.getCurrentUser();
                                                setUserProfile(fresh);
                                                // Update name split too
                                                const nameParts = (fresh.name || '').split(' ');
                                                setProfileData((prev) => ({
                                                    ...prev,
                                                    firstName: nameParts[0] || prev.firstName,
                                                    lastName: nameParts.slice(1).join(' ') || prev.lastName,
                                                }));
                                                if (updateUser) updateUser({
                                                    id: fresh._id,
                                                    name: fresh.name,
                                                    email: fresh.email,
                                                    role: fresh.role,
                                                    profileImage: fresh.profileImage
                                                });
                                                toast.success('Profile image updated successfully!');
                                            } catch (err: unknown) {
                                                toast.error((err as Error).message || 'Failed to upload profile image');
                                            } finally {
                                                setLoading(false);
                                                e.currentTarget.value = '';
                                            }
                                        }}
                                    />
                                </div>

                                <div className="flex-1">
                                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                                        {profileData.firstName} {profileData.lastName}
                                    </h2>
                                    <p className="text-gray-500 dark:text-gray-400 mb-3">{profileData.role}</p>
                                    <button
                                        type="button"
                                        className="text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-medium cursor-pointer"
                                        onClick={() => document.getElementById('profileImageInput')?.click()}
                                        title="Change Avatar"
                                    >
                                        Change Avatar
                                    </button>
                                </div>
                            </div>

                            {/* Form Fields */}
                            <div className="space-y-6">
                                {/* First Name and Last Name Row */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                            First Name
                                        </label>
                                        <input
                                            type="text"
                                            value={profileData.firstName}
                                            onChange={(e) => { setProfileData({ ...profileData, firstName: e.target.value }); if (errors.firstName) setErrors({ ...errors, firstName: undefined }); }}
                                            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-white"
                                            required
                                        />
                                        {errors.firstName && <p className="mt-1 text-sm text-red-600">{errors.firstName}</p>}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                            Last Name
                                        </label>
                                        <input
                                            type="text"
                                            value={profileData.lastName}
                                            onChange={(e) => { setProfileData({ ...profileData, lastName: e.target.value }); if (errors.lastName) setErrors({ ...errors, lastName: undefined }); }}
                                            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-white"
                                            required
                                        />
                                        {errors.lastName && <p className="mt-1 text-sm text-red-600">{errors.lastName}</p>}
                                    </div>
                                </div>

                                {/* Email Address */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                        Email Address
                                    </label>
                                    <input
                                        type="email"
                                        value={profileData.email}
                                        onChange={(e) => { setProfileData({ ...profileData, email: e.target.value }); if (errors.email) setErrors({ ...errors, email: undefined }); }}
                                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-white"
                                        required
                                    />
                                    {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
                                </div>

                                {/* Phone Number */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                        Phone Number
                                    </label>
                                    <input
                                        type="tel"
                                        value={profileData.phone}
                                        onChange={(e) => { setProfileData({ ...profileData, phone: e.target.value }); if (errors.phone) setErrors({ ...errors, phone: undefined }); }}
                                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-white"
                                        placeholder="9876543210"
                                    />
                                    {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone}</p>}
                                </div>

                                {/* Password Change Section */}
                                <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                            Change Password
                                        </h3>
                                        <button
                                            type="button"
                                            onClick={togglePasswordChange}
                                            className="text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-medium cursor-pointer"
                                        >
                                            {isChangingPassword ? 'Cancel Password Change' : 'Change Password'}
                                        </button>
                                    </div>

                                    {isChangingPassword && (
                                        <div className="space-y-6 bg-gray-50 dark:bg-gray-900/50 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
                                            {/* Current Password */}
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                                    Current Password
                                                </label>
                                                <div className="relative">
                                                    <input
                                                        type={showCurrentPassword ? "text" : "password"}
                                                        value={passwordData.currentPassword}
                                                        onChange={(e) => { 
                                                            setPasswordData({ ...passwordData, currentPassword: e.target.value }); 
                                                            if (errors.currentPassword) setErrors({ ...errors, currentPassword: undefined }); 
                                                        }}
                                                        className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-white pr-12"
                                                        placeholder="Enter current password"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                                        className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 cursor-pointer"
                                                    >
                                                        {showCurrentPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                                    </button>
                                                </div>
                                                {errors.currentPassword && <p className="mt-1 text-sm text-red-600">{errors.currentPassword}</p>}
                                            </div>

                                            {/* New Password */}
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                                    New Password
                                                </label>
                                                <div className="relative">
                                                    <input
                                                        type={showNewPassword ? "text" : "password"}
                                                        value={passwordData.newPassword}
                                                        onChange={(e) => { 
                                                            setPasswordData({ ...passwordData, newPassword: e.target.value }); 
                                                            if (errors.newPassword) setErrors({ ...errors, newPassword: undefined }); 
                                                        }}
                                                        className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-white pr-12"
                                                        placeholder="Enter new password (min. 6 characters)"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowNewPassword(!showNewPassword)}
                                                        className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 cursor-pointer"
                                                    >
                                                        {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                                    </button>
                                                </div>
                                                {errors.newPassword && <p className="mt-1 text-sm text-red-600">{errors.newPassword}</p>}
                                            </div>

                                            {/* Confirm Password */}
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                                    Confirm New Password
                                                </label>
                                                <div className="relative">
                                                    <input
                                                        type={showConfirmPassword ? "text" : "password"}
                                                        value={passwordData.confirmPassword}
                                                        onChange={(e) => { 
                                                            setPasswordData({ ...passwordData, confirmPassword: e.target.value }); 
                                                            if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: undefined }); 
                                                        }}
                                                        className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-white pr-12"
                                                        placeholder="Confirm new password"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                        className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 cursor-pointer"
                                                    >
                                                        {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                                    </button>
                                                </div>
                                                {errors.confirmPassword && <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-4 mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="flex-1 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl flex items-center justify-center gap-2 cursor-pointer"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        'Save Changes'
                                    )}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleCancel}
                                    className="px-6 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium transition-colors cursor-pointer"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </main>
    );
}