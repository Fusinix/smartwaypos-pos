import { useEffect } from 'react';
import { useSettingsStore } from '../stores/useSettingsStore';
import { useKeyboard, type KeyboardMode } from '../context/KeyboardContext';

/**
 * Global hook that listens for focus events on all input fields
 * and triggers our custom virtual keyboard if the setting is enabled.
 */
export function useOnScreenKeyboard() {
  const settings = useSettingsStore((state) => state.settings);
  const autoOpenKeyboard = settings?.pos?.autoOpenKeyboard ?? true; // Default to true if not set
  const { openKeyboard, closeKeyboard } = useKeyboard();

  useEffect(() => {
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
      if (isTextInput(target)) {
        const input = target as HTMLInputElement | HTMLTextAreaElement;
        
        // Remove active tag from all other inputs
        document.querySelectorAll('[data-keyboard-active="true"]').forEach(el => {
          el.removeAttribute('data-keyboard-active');
        });
        
        // Tag this as the active one
        input.setAttribute('data-keyboard-active', 'true');
        
        // Determine mode — use safe guards since in packaged Electron these
        // properties can be undefined and .toLowerCase() would throw silently.
        let mode: KeyboardMode = (input.getAttribute('data-keyboard-mode') as KeyboardMode) || 'all';
        
        if (mode === 'all') {
          const id          = (input.id          || '').toLowerCase();
          const name        = (input.name        || '').toLowerCase();
          const placeholder = (input.placeholder || '').toLowerCase();
          // getAttribute is more reliable than the .inputMode DOM property in packaged Electron
          const inputMode   = (input.getAttribute('inputmode') || input.inputMode || '').toLowerCase();

          const isNumeric =
            input.type === 'number' ||
            input.type === 'tel' ||
            inputMode === 'numeric' ||
            inputMode === 'decimal' ||
            id.includes('price') ||
            id.includes('amount') ||
            id.includes('quantity') ||
            id.includes('qty') ||
            id.includes('total') ||
            id.includes('tax') ||
            id.includes('discount') ||
            name.includes('price') ||
            name.includes('amount') ||
            placeholder.includes('price') ||
            placeholder.includes('amount');

          if (isNumeric) mode = 'numeric';
        }
        
        openKeyboard(input, mode);
      }
    };

    document.addEventListener('focusin', handleTrigger, true);
    document.addEventListener('click', handleTrigger, true);

    return () => {
      document.removeEventListener('focusin', handleTrigger, true);
      document.removeEventListener('click', handleTrigger, true);
    };
  }, [autoOpenKeyboard, openKeyboard, closeKeyboard]);
}
