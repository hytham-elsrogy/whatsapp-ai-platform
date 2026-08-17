'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { Sidebar } from '@/components/layout/Sidebar';
import { useSocket } from '@/hooks/useSocket';

function DashboardContent({ children }: { children: React.ReactNode }) {
  useSocket();
  return (
    <div className="flex h-screen overflow-hidden bg-gray-100 dark:bg-[#0b141a]">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        {children}
      </main>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, isLoading, initialize } = useAuthStore();

  useEffect(() => {
    initialize().then(() => {
      const { isAuthenticated } = useAuthStore.getState();
      if (!isAuthenticated) router.replace('/login');
    });
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0b141a]">
        <div className="w-10 h-10 border-4 border-[#25D366] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return <DashboardContent>{children}</DashboardContent>;
}
