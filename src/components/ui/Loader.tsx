'use client';

import React from 'react';

interface LoaderProps {
  size?: 'sm' | 'md' | 'lg';
  fullScreen?: boolean;
  text?: string;
  variant?: 'spinner' | 'dots' | 'pulse';
}

export default function Loader({ 
  size = 'md', 
  fullScreen = false, 
  text,
  variant = 'spinner' 
}: LoaderProps) {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  };

  const spinnerSizeClasses = {
    sm: 'w-6 h-6 border-2',
    md: 'w-12 h-12 border-3',
    lg: 'w-16 h-16 border-4'
  };

  const renderLoader = () => {
    switch (variant) {
      case 'dots':
        return (
          <div className="flex items-center justify-center gap-2">
            <div className={`${sizeClasses[size]} rounded-full bg-purple-600 dark:bg-purple-400 animate-bounce`} style={{ animationDelay: '0ms' }}></div>
            <div className={`${sizeClasses[size]} rounded-full bg-purple-600 dark:bg-purple-400 animate-bounce`} style={{ animationDelay: '150ms' }}></div>
            <div className={`${sizeClasses[size]} rounded-full bg-purple-600 dark:bg-purple-400 animate-bounce`} style={{ animationDelay: '300ms' }}></div>
          </div>
        );
      
      case 'pulse':
        return (
          <div className={`${sizeClasses[size]} rounded-full bg-purple-600 dark:bg-purple-400 animate-pulse`}></div>
        );
      
      default: // spinner
        return (
          <div className={`${spinnerSizeClasses[size]} border-purple-600 dark:border-purple-400 border-t-transparent rounded-full animate-spin`}></div>
        );
    }
  };

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-gray-50/80 dark:bg-gray-900/80 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="text-center">
          {renderLoader()}
          {text && (
            <p className="mt-4 text-gray-600 dark:text-gray-300 font-medium animate-pulse">
              {text}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center p-8">
      {renderLoader()}
      {text && (
        <p className="mt-4 text-sm text-gray-600 dark:text-gray-300 font-medium">
          {text}
        </p>
      )}
    </div>
  );
}

// Skeleton Loader Component
export function SkeletonLoader({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="animate-pulse">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Table Skeleton Loader
export function TableSkeletonLoader({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex gap-4 pb-3 border-b border-gray-200 dark:border-gray-700">
        {Array.from({ length: cols }).map((_, index) => (
          <div key={index} className="flex-1 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4 py-3">
          {Array.from({ length: cols }).map((_, colIndex) => (
            <div key={colIndex} className="flex-1 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" style={{ animationDelay: `${rowIndex * 50}ms` }}></div>
          ))}
        </div>
      ))}
    </div>
  );
}

// Stats Skeleton Loader
export function StatsSkeletonLoader() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 rounded-2xl p-6 animate-pulse">
          <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-24 mb-3"></div>
          <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded w-16 mb-2"></div>
          <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-32"></div>
        </div>
      ))}
    </div>
  );
}

