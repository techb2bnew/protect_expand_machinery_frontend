'use client';
import React, { useState, useRef, useEffect } from 'react';
import { Users, UserCheck, Menu, Moon, Sun, LogOut, UserCircle, User, Activity as ActivityIcon, ChevronLeft, Ticket, FileText, Shield } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import userService from '@/services/userService';
import NotificationDropdown from '../notifications/NotificationDropdown';
import { NotificationProvider } from '../../contexts/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';
import type { UserProfile } from '@/services/userService';
import { useTheme } from '../../contexts/ThemeContext';

type DashboardLayoutProps = { children: React.ReactNode };
export default function DashboardLayout({ children }: DashboardLayoutProps) {
    const [sidebarOpen, setSidebarOpen] = useState(true); // Default false for mobile
    const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
    const router = useRouter();
    const pathname = usePathname();
    const dropdownRef = useRef<HTMLDivElement>(null);
    const { user, logout, loading: authLoading, updateUser } = useAuth();
    const [navbarUser, setNavbarUser] = useState<UserProfile | null>(null);
    const { toggleTheme, isDark } = useTheme();

    

     const navItems = [
        {
            name: 'Customer Management',
            icon: Users,
            path: '/dashboard/customers',
            roles: ['manager', 'agent'], // All roles can access
        },
        {
            name: 'Tickets & Communication',
            icon: Ticket,
            path: '/dashboard/tickets',
            roles: ['manager', 'agent'], // All roles can access
        },
        // {
        //     name: 'Agent Management',
        //     icon: UserCheck,
        //     path: '/dashboard/agents',
        //     roles: ['manager'], // Only manager can access
        // },
        {
            name: 'Activity Logs',
            icon: ActivityIcon,
            path: '/dashboard/activity-logs',
            roles: ['manager'], // Only manager can access
        },
        {
            name: 'Terms & Conditions',
            icon: FileText,
            path: '/dashboard/terms',
            roles: ['manager'], // Only manager can access
        },
        {
            name: 'Privacy Policy',
            icon: Shield,
            path: '/dashboard/privacy-policy',
            roles: ['manager'], // Only manager can access
        },
    ];

    // Filter navigation items based on user role
    const filteredNavItems = navItems.filter(item =>
        item.roles.includes(user?.role || 'agent')
    );

    const isActive = (path: string) => pathname === path || pathname.startsWith(path + '/');

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setProfileDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Fetch fresh user on mount so navbar always shows latest profile
    useEffect(() => {
        (async () => {
            try {
                const fresh = await userService.getCurrentUser();
                setNavbarUser(fresh);
                updateUser({
                    id: fresh._id,
                    name: fresh.name,
                    email: fresh.email,
                    role: fresh.role,
                    profileImage: fresh.profileImage
                });
            } catch {
                // ignore
            }
        })();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (user) {
            setNavbarUser({
                _id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                profileImage: user.profileImage
            });
        }
    }, [user]);

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 1024 && sidebarOpen) {
            } else if (window.innerWidth < 1024) {
                // On mobile, sidebar should be closed by default
                // Don't auto-close if user manually opened it
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [sidebarOpen]);

    const handleLogout = async () => {
        try {
            const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
            if (token) {
                await fetch((process.env.NEXT_PUBLIC_API_URL) + '/auth/logout', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                });
            }
        } catch {
            // ignore network errors on logout
        } finally {
            logout();
            router.push('/');
        }
    };

    const handleProfile = () => {
        setProfileDropdownOpen(false);
        router.push('/dashboard/profile');
    };

    // Don't render notification provider until user is loaded
    if (authLoading) {
        return (
            <div className="flex h-screen bg-gray-50 dark:bg-gray-900 items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-300">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <NotificationProvider>
            <div className="flex h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200 overflow-x-hidden">
                {/* Mobile Overlay */}
                {sidebarOpen && (
                    <div
                        className="fixed inset-0 bg-white/20 dark:bg-gray-900/20 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300"
                        onClick={() => setSidebarOpen(false)}
                    />
                )}

                {/* Sidebar with animation */}
                <aside className={`
                    ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                    fixed lg:static inset-y-0 left-0 z-50
                    ${sidebarOpen ? 'w-72 sm:w-80 lg:w-80' : 'w-0 lg:w-16'}
                    flex flex-col relative z-10
                    transition-all duration-300 ease-in-out
                    overflow-hidden
                    bg-white dark:bg-gray-800
                    border-r border-gray-200 dark:border-gray-700 lg:border-r
                `}>
                    {/* Background gradient */}
                    <div className="absolute inset-0 bg-gradient-to-b from-blue-50 via-white to-purple-50 dark:from-gray-800 dark:via-gray-900 dark:to-gray-800 opacity-80 pointer-events-none"></div>
                    
                    {/* Logo Section */}
                    <div className={`relative ${sidebarOpen ? 'p-2 sm:p-2.5 pb-1' : 'p-1'}`}>
                        {sidebarOpen ? (
                            <div className="bg-gradient-to-r from-blue-100 to-purple-100 dark:from-gray-700 dark:to-gray-800 rounded-2xl p-1.5 sm:p-2 flex items-center justify-between shadow-sm border border-white/50 dark:border-gray-600">
                                <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg" style={{ backgroundColor: 'white' }}>
                                        <img src="/fav.png" alt="Expand Machinery" width={32} height={32} className="object-contain" />
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <h1 className="text-sm sm:text-base font-bold text-gray-800 dark:text-white leading-tight truncate">Expand Machinery</h1>
                                        <span className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 font-medium tracking-wide truncate">Management Dashboard</span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSidebarOpen(!sidebarOpen)}
                                    className="w-7 h-7 sm:w-8 sm:h-8 bg-white dark:bg-gray-600 rounded-lg flex items-center justify-center text-gray-600 dark:text-gray-200 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-500 transition-colors hover:scale-105 flex-shrink-0"
                                >
                                    <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform duration-300" />
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => setSidebarOpen(!sidebarOpen)}
                                className="w-full bg-gradient-to-r from-blue-100 to-purple-100 dark:from-gray-700 dark:to-gray-800 rounded-2xl p-1.5 flex items-center justify-center shadow-sm border border-white/50 dark:border-gray-600 hover:bg-blue-200 dark:hover:bg-gray-600 transition-colors"
                                title="Expand sidebar"
                            >
                                <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-200 rotate-180" />
                            </button>
                        )}
                    </div>

                    {/* Navigation */}
                    <nav className={`relative flex-1 overflow-y-auto ${sidebarOpen ? 'px-1.5 sm:px-2 py-1 sm:py-1.5' : 'px-1 py-1.5'} space-y-0.5 sm:space-y-1`}>
                        {filteredNavItems.map((item) => {
                            const Icon = item.icon;
                            const active = isActive(item.path);
                            return (
                                <button
                                    key={item.path}
                                    onClick={() => {
                                        router.push(item.path);
                                        if (window.innerWidth < 1024) { 
                                            setSidebarOpen(false);
                                        }
                                    }}
                                    className={`group relative flex items-center ${sidebarOpen ? 'w-full' : 'w-full justify-center'} ${sidebarOpen ? 'p-1 sm:p-1.5' : 'p-0.5'} rounded-xl sm:rounded-2xl transition-all duration-200 transform hover:scale-[1.02] cursor-pointer ${active
                                        ? ''
                                        : 'hover:bg-white dark:hover:bg-gray-800 hover:border-gray-100 dark:hover:border-gray-700 hover:shadow-sm'
                                        }`}
                                    title={!sidebarOpen ? item.name : undefined}
                                >
                                    {active && (
                                        <div className="absolute inset-0 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800/50 rounded-xl sm:rounded-2xl shadow-sm"></div>
                                    )}
                                    <div className={`relative z-10 flex-shrink-0 w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform ${
                                        active 
                                            ? `bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg text-white`
                                            : 'bg-white dark:bg-gray-700 shadow-sm text-gray-500 dark:text-gray-400 border border-gray-100 dark:border-gray-600 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 group-hover:border-indigo-100 dark:group-hover:border-indigo-900 transition-colors'
                                    }`}>
                                        <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                    </div>
                                    {sidebarOpen && (
                                        <span className={`relative z-10 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap ml-1 sm:ml-2 truncate ${active
                                            ? 'font-semibold text-indigo-600 dark:text-indigo-300'
                                            : 'text-gray-600 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white'
                                        }`}>
                                            {item.name}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </nav>

                    {/* Bottom gradient */}
                    <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-purple-50 dark:from-gray-900 to-transparent pointer-events-none"></div>
                </aside>

                {/* Main Content */}
                <div className="flex-1 flex flex-col overflow-hidden w-full min-w-0">
                    {/* Header */}
                    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 pl-2 pr-1.5 sm:pl-2.5 sm:pr-2 md:pl-4 md:pr-3 py-1.5 sm:py-2 md:py-2.5">
                        <div className="flex items-center justify-between">
                            <button 
                                onClick={() => setSidebarOpen(!sidebarOpen)} 
                                className="lg:hidden p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors hover:scale-105"
                            >
                                <Menu className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                            </button>
                            <div className="flex items-center gap-1.5 sm:gap-2 md:gap-4 ml-auto">
                                {/* Dark Mode Toggle */}
                                <button
                                    onClick={() => {
                                        toggleTheme();
                                    }}
                                    className="cursor-pointer p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg relative transition-colors hover:scale-105"
                                    title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                                >
                                    {isDark ? (
                                        <Sun className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500 dark:text-yellow-400" />
                                    ) : (
                                        <Moon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                                    )}
                                </button>
                                <NotificationDropdown />

                                {/* Profile Dropdown */}
                                <div className="relative" ref={dropdownRef}>
                                    <button
                                        onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                                        className="cursor-pointer flex items-center gap-1.5 sm:gap-2 hover:bg-gray-50 dark:hover:bg-gray-700 p-1 rounded-lg transition-colors hover:scale-105"
                                    >
                                        <span className="hidden md:block font-medium text-sm text-gray-900 dark:text-white">{navbarUser?.name || user?.name || 'Admin'}</span>
                                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full overflow-hidden bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center hover:from-indigo-600 hover:to-purple-700 transition-colors cursor-pointer shadow-md">
                                            {(navbarUser?.profileImage || user?.profileImage) ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img
                                                    src={`${process.env.NEXT_PUBLIC_FILE_BASE_URL}${navbarUser?.profileImage || user?.profileImage}`}
                                                    alt="Avatar"
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <User className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                                            )}
                                        </div>
                                    </button>

                                    {/* Dropdown Menu */}
                                    {profileDropdownOpen && (
                                        <div className="absolute right-0 mt-2 w-44 sm:w-48 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-50">
                                            <button
                                                onClick={handleProfile}
                                                className="cursor-pointer w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors rounded-lg mx-1"
                                            >
                                                <UserCircle className="w-4 h-4" />
                                                <span>Profile</span>
                                            </button>
                                            <div className="border-t border-gray-100 dark:border-gray-700 my-1"></div>
                                            <button
                                                onClick={handleLogout}
                                                className="cursor-pointer w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors rounded-lg mx-1"
                                            >
                                                <LogOut className="w-4 h-4" />
                                                <span>Log out</span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </header>

                    {/* Page Content */}
                    <main className="flex-1 overflow-auto pt-1.5 pb-1.5 pl-1.5 pr-1 sm:pt-2 sm:pb-2 sm:pl-2 sm:pr-1.5 md:pt-2.5 md:pb-2.5 md:pl-2.5 md:pr-2">
                        {children}
                    </main>
                </div>
            </div>
        </NotificationProvider>
    );
}