import { useMemo } from 'react';
import { useSettings } from './useSettings';
import { formatCurrency, getCurrencySymbol } from '@/lib/utils';

/**
 * Hook to access currency settings and formatting functions
 */
export const useCurrency = () => {
  const { settings } = useSettings();
  const currency = useMemo(() => {
    return settings?.general?.defaultCurrency || 'GHS';
  }, [settings]);

  const format = (value: number) => formatCurrency(value, currency);
  const symbol = getCurrencySymbol(currency);

  return {
    currency,
    format,
    symbol,
  };
};

