'use client';

import { Sidebar } from '@/components/layouts/Sidebar';
import { Header } from '@/components/layouts/Header';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { RealtimeProvider } from '@/components/providers/RealtimeProvider';
import { useSidebar } from '@/stores/ui';
import { cn } from '@/lib/utils';

export default function TenantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { sidebarCollapsed } = useSidebar();

  return (
    <AuthGuard>
      <RealtimeProvider>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
          {/* Sidebar */}
          <Sidebar />

          {/* Main content area */}
          <div
            className={cn(
              'transition-all duration-300',
              'lg:ml-64',
              sidebarCollapsed && 'lg:ml-20'
            )}
          >
            {/* Header */}
            <Header />

            {/* Page content */}
            <main className="p-4 lg:p-6">
              {children}
            </main>
          </div>
        </div>
      </RealtimeProvider>
    </AuthGuard>
  );
}
