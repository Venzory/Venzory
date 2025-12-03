import { ContextPageWrapper } from '@/components/layout/ContextPageWrapper';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <ContextPageWrapper context="admin">
      {children}
    </ContextPageWrapper>
  );
}

