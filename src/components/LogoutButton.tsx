'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRightStartOnRectangleIcon } from '@heroicons/react/24/outline';
import { createClient } from '@/lib/supabase-client';

type LogoutVariant = 'default' | 'primary';

interface LogoutButtonProps {
  variant?: LogoutVariant;
  className?: string;
  label?: string;
}

export function LogoutButton({ variant = 'default', className = '', label }: LogoutButtonProps) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);

    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error('Logout error:', error);
      }

      router.push('/login');
      router.refresh();
    } catch (error) {
      console.error('Unexpected logout error:', error);
    } finally {
      setLoading(false);
    }
  };

  const sharedStyles = 'flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed transition-colors';
  const defaultStyles = 'px-4 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md';
  const primaryStyles = 'inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700';
  const buttonClasses = `${sharedStyles} ${variant === 'primary' ? primaryStyles : defaultStyles} ${className}`.trim();
  const buttonLabel = label ?? (loading ? 'Signing out...' : 'Logout');

  return (
    <button onClick={handleLogout} disabled={loading} className={buttonClasses} title="Sign out">
      {loading ? (
        <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : (
        variant === 'primary' && <ArrowRightStartOnRectangleIcon className="h-4 w-4" />
      )}
      <span>{buttonLabel}</span>
    </button>
  );
}

