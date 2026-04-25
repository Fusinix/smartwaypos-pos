import { useEffect } from 'react';
import { useSettings } from './useSettings';

/**
 * Global hook that listens for focus events on all input fields
 * and triggers the Windows On-Screen Keyboard if the setting is enabled.
 * Mount this once in App.tsx.
 */
export function useOnScreenKeyboard() {
  const { settings } = useSettings();
  const autoOpenKeyboard = settings?.pos?.autoOpenKeyboard ?? false;

  useEffect(() => {
    if (!window.electron) return; // Only in Electron

    const handleFocus = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      if (isInput && autoOpenKeyboard) {
        window.electron.invoke('open-keyboard');
      }
    };

    const handleBlur = (e: FocusEvent) => {
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      // Close keyboard when focus leaves an input entirely
      if (isInput && autoOpenKeyboard) {
        // Small delay to check if focus moved to another input
        setTimeout(() => {
          const activeEl = document.activeElement as HTMLElement;
          const stillOnInput =
            activeEl?.tagName === 'INPUT' ||
            activeEl?.tagName === 'TEXTAREA' ||
            activeEl?.isContentEditable;

          if (!stillOnInput) {
            window.electron.invoke('close-keyboard');
          }
        }, 100);
      }
    };

    document.addEventListener('focusin', handleFocus, true);
    document.addEventListener('focusout', handleBlur, true);

    return () => {
      document.removeEventListener('focusin', handleFocus, true);
      document.removeEventListener('focusout', handleBlur, true);
    };
  }, [autoOpenKeyboard]);
}
