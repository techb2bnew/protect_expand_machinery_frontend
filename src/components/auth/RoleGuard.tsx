'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: string[];
  redirectTo?: string;
}

export default function RoleGuard({ children, allowedRoles, redirectTo = '/dashboard/customers' }: RoleGuardProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      // Check if user role is allowed
      if (!allowedRoles.includes(user.role)) {
        router.push(redirectTo);
      }
    }
  }, [user, loading, allowedRoles, redirectTo, router]);

  // Show loading while checking
  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50 dark:bg-gray-900 items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render if user doesn't have permission
  if (user && !allowedRoles.includes(user.role)) {
    return null;
  }

  return <>{children}</>;
}

