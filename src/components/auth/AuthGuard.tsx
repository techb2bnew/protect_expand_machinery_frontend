'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type AuthGuardProps = { children: React.ReactNode };

export default function AuthGuard({ children }: AuthGuardProps) {
    const router = useRouter();
    const [checked, setChecked] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
        if (!token) {
            router.replace('/');
        } else {
            setChecked(true);
        }
    }, [router]);

    if (!checked) {
        return (
            <div className="w-full h-screen flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 rounded-full border-4 border-purple-200 border-t-purple-600 animate-spin" />
                    <span className="text-sm text-gray-500">Verifying session…</span>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}


