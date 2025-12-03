import { ContextPageWrapper } from '@/components/layout/ContextPageWrapper';

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  return (
    <ContextPageWrapper context="owner">
      {children}
    </ContextPageWrapper>
  );
}

