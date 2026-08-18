import { HTMLAttributes } from 'react';

export function Card({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-xl border border-gray-200 bg-white shadow-card dark:border-gray-800 dark:bg-gray-900 ${className}`}
      {...props}
    />
  );
}
