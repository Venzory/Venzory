import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { OnboardingHeader } from '@/components/onboarding/onboarding-header';

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  
  if (!session) {
    redirect('/login');
  }
  
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 dark:bg-slate-950">
      <div className="mx-auto max-w-2xl">
        <OnboardingHeader />
        
        <main>
            {children}
        </main>
      </div>
    </div>
  );
}
