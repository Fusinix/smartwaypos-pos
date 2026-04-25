import { useEffect } from 'react';
import { useSettingsStore } from '../stores/useSettingsStore';

/**
 * Global hook that listens for focus events on all input fields
 * and triggers the Windows On-Screen Keyboard if the setting is enabled.
 * Mount this once in App.tsx.
 */
export function useOnScreenKeyboard() {
  const settings = useSettingsStore((state) => state.settings);
  const autoOpenKeyboard = settings?.pos?.autoOpenKeyboard ?? false;

  useEffect(() => {
    if (!window.electron) return; // Only in Electron

    const isTextInput = (el: HTMLElement) => {
      if (el.isContentEditable) return true;
      if (el.tagName === 'TEXTAREA') return true;
      if (el.tagName === 'INPUT') {
        const type = (el as HTMLInputElement).type;
        return !['checkbox', 'radio', 'file', 'range', 'color', 'submit', 'image', 'button', 'reset'].includes(type);
      }
      return false;
    };

    const handleTrigger = (e: Event) => {
      if (!autoOpenKeyboard) return;
      
      const target = e.target as HTMLElement;
      const isInput = isTextInput(target);
      
      // Log the event for debugging, but only if it's potentially an input
      if (isInput) {
        console.log(`[Keyboard] Triggered by ${e.type} on <${target.tagName.toLowerCase()}> (ID: ${target.id || 'none'}, Class: ${target.className.substring(0, 20)}...)`);
        window.electron.invoke('open-keyboard');
      }
    };

    const handleBlur = (e: FocusEvent) => {
      if (!autoOpenKeyboard) return;
      const target = e.target as HTMLElement;
      
      if (isTextInput(target)) {
        // Small delay to check if focus moved to another input
        setTimeout(() => {
          const activeEl = document.activeElement as HTMLElement;
          if (!activeEl || !isTextInput(activeEl)) {
            window.electron.invoke('close-keyboard');
          }
        }, 150);
      }
    };

    document.addEventListener('focusin', handleTrigger, true);
    document.addEventListener('click', handleTrigger, true);
    document.addEventListener('focusout', handleBlur, true);

    return () => {
      document.removeEventListener('focusin', handleTrigger, true);
      document.removeEventListener('click', handleTrigger, true);
      document.removeEventListener('focusout', handleBlur, true);
    };
  }, [autoOpenKeyboard]);
}
