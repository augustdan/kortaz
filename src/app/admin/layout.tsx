import { AdminShell } from '@/components/admin/AdminShell';

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
