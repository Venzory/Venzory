'use client';

import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import { quickCreateOrderFromTemplateAction } from '../templates/actions';

interface QuickOrderButtonProps {
  templateId: string;
  templateName: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary';
  className?: string;
}

function SubmitButton({
  size,
  variant,
  className,
}: {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary';
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant={variant}
      size={size}
      disabled={pending}
      className={className}
    >
      {pending ? 'Creating...' : 'Quick order'}
    </Button>
  );
}

export function QuickOrderButton({
  templateId,
  templateName,
  size = 'sm',
  variant = 'primary',
  className,
}: QuickOrderButtonProps) {
  const actionWithId = quickCreateOrderFromTemplateAction.bind(null, templateId);

  return (
    <form action={actionWithId}>
      <SubmitButton size={size} variant={variant} className={className} />
    </form>
  );
}

