'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

const PUBLIC_ROUTES = ['/login', '/register', '/guest'];
const ADMIN_ROUTES = ['/admin'];
const PPJ_ROUTES = ['/inspeksi'];

const ADMIN_LIKE_ROLES = ['admin', 'qc', 'kupt'];

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    const role = userStr ? (JSON.parse(userStr)?.role ?? 'ppj') : null;

    const isPublic = PUBLIC_ROUTES.some(r => pathname === r || pathname.startsWith(r + '/'));
    const isAdminRoute = ADMIN_ROUTES.some(r => pathname.startsWith(r));
    const isPpjRoute = PPJ_ROUTES.some(r => pathname.startsWith(r));
    const isGuestRoute = pathname === '/guest' || pathname.startsWith('/guest/');

    // Guest route is public — always allow without token
    if (isGuestRoute) {
      setReady(true);
      return;
    }

    if (!token) {
      // Not logged in — redirect to login unless on a public route
      if (!isPublic) {
        router.replace('/login');
        return;
      }
    } else if (pathname === '/login' || pathname === '/register') {
      // Already logged in — redirect away from login/register
      router.replace(ADMIN_LIKE_ROLES.includes(role) ? '/admin' : '/inspeksi');
      return;
    } else if (isAdminRoute && !ADMIN_LIKE_ROLES.includes(role)) {
      // PPJ trying to access admin → redirect to inspeksi
      router.replace('/inspeksi');
      return;
    } else if (isPpjRoute && ADMIN_LIKE_ROLES.includes(role)) {
      // Admin-like trying to access PPJ routes → redirect to admin
      router.replace('/admin');
      return;
    }

    setReady(true);
  }, [pathname, router]);

  if (!ready && !PUBLIC_ROUTES.some(r => pathname === r || pathname.startsWith(r + '/'))) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-surface">
        <div className="flex flex-col items-center gap-md text-on-surface-variant">
          <span className="material-symbols-outlined text-primary text-[40px] animate-spin">refresh</span>
          <p className="font-body-md">Memverifikasi sesi...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
