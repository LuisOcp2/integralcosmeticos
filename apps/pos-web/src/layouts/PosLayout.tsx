import { Outlet } from 'react-router-dom';
import type { AuthUser } from '@/hooks/useAuth';
import SideNav from '@/components/SideNav';

type PosLayoutProps = {
  user: AuthUser;
  onLogout: () => void;
};

export default function PosLayout({ user, onLogout }: PosLayoutProps) {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background font-sans">
      <SideNav user={user} onLogout={onLogout} />
      <div className="flex-1 min-w-0 h-full overflow-y-auto">
        <Outlet />
      </div>
    </div>
  );
}
