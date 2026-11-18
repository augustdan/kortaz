import { TenantWorkspaceProvider } from '@/components/app/TenantWorkspaceContext';
import { AppShell } from '@/components/app/AppShell';

export default function AppAreaLayout({ children }: { children: React.ReactNode }) {
  return (
    <TenantWorkspaceProvider>
      <AppShell>{children}</AppShell>
    </TenantWorkspaceProvider>
  );
}
