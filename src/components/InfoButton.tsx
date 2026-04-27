import React from 'react';
import { Info } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface InfoButtonProps {
  onClick: () => void;
}

export const InfoButton = ({ onClick }: InfoButtonProps) => {
  return (
    <Button
      variant="outline"
      size="icon"
      className="border-white/10"
      type="button"
      onClick={onClick}
    >
      <Info className="h-4 w-4" />
    </Button>
  );
};