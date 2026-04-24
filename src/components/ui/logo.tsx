import React from 'react';
import { cn } from '@/lib/utils';
import { defaultValues } from '@/data/lang';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  variant?: 'default' | 'white';
}

export const Logo: React.FC<LogoProps> = ({ 
  className, 
  size = 'md', 
  showText = true,
  variant = 'default' 
}) => {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-10 w-10',
    lg: 'h-16 w-16',
    xl: 'h-24 w-24',
  };

  const textClasses = {
    sm: 'text-sm',
    md: 'text-xl',
    lg: 'text-3xl',
    xl: 'text-4xl',
  };

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className={cn(
        sizeClasses[size],
        "relative rounded-xl overflow-hidden shadow-lg shadow-primary/10 border border-primary/20 bg-white p-1"
      )}>
        <img 
          src="images/logo.png" 
          alt="Smartway POS Logo" 
          className="w-full h-full object-contain"
        />
      </div>
      
      {showText && (
        <div className="flex flex-col">
          <h1 className={cn(
            textClasses[size],
            "font-black italic uppercase tracking-tighter leading-none",
            variant === 'white' ? "text-white" : "text-primary"
          )}>
            Smartway<span className={variant === 'white' ? "text-white/80" : "text-primary/70"}>POS</span>
          </h1>
          {size !== 'sm' && (
            <span className={cn(
              "text-[8px] font-bold uppercase tracking-[0.2em] mt-1",
              variant === 'white' ? "text-white/60" : "text-muted-foreground"
            )}>
              Enterprise Solution
            </span>
          )}
        </div>
      )}
    </div>
  );
};
