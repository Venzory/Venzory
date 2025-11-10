'use client';

import { useFormStatus } from 'react-dom';
import { Button, type ButtonProps } from './button';

export interface SubmitButtonProps extends Omit<ButtonProps, 'type' | 'disabled'> {
  loadingText?: string;
}

export function SubmitButton({ children, loadingText = 'Submitting...', ...props }: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending} {...props}>
      {pending ? loadingText : children}
    </Button>
  );
}

