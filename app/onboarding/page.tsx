import { redirect } from 'next/navigation';

import { auth } from '@/auth';
import { OnboardingWizard } from '@/components/onboarding/onboarding-wizard';

export const metadata = {
  title: 'Welcome to Remcura',
};

export default async function OnboardingPage() {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  // Extract initial data for prefilling
  const membership = session.user?.memberships?.[0];
  const initialPracticeName = membership?.practice?.name || '';
  const initialEmail = session.user?.email || '';

  return (
    <OnboardingWizard 
      initialPracticeName={initialPracticeName}
      initialEmail={initialEmail}
    />
  );
}
