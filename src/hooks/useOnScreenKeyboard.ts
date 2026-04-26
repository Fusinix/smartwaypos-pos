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
        
        // Determine mode
        let mode: KeyboardMode = (input.getAttribute('data-keyboard-mode') as KeyboardMode) || 'all';
        
        if (mode === 'all') {
          const isNumeric = 
            input.type === 'number' || 
            input.type === 'tel' ||
            input.inputMode === 'numeric' || 
            input.inputMode === 'decimal' ||
            input.id.toLowerCase().includes('price') || 
            input.id.toLowerCase().includes('amount') ||
            input.id.toLowerCase().includes('quantity') ||
            input.id.toLowerCase().includes('qty') ||
            input.id.toLowerCase().includes('total') ||
            input.id.toLowerCase().includes('tax') ||
            input.id.toLowerCase().includes('discount') ||
            input.name.toLowerCase().includes('price') ||
            input.name.toLowerCase().includes('amount') ||
            input.placeholder.toLowerCase().includes('price') ||
            input.placeholder.toLowerCase().includes('amount');

          if (isNumeric) mode = 'numeric';
        }
        
        openKeyboard(input, mode);
      }
    };

    const handleBlur = (e: FocusEvent) => {
      // Optional: Close keyboard on blur, but often better to keep it open until explicit close or focus change
      // const target = e.target as HTMLElement;
      // if (isTextInput(target)) {
      //   setTimeout(() => {
      //     const activeEl = document.activeElement as HTMLElement;
      //     if (!activeEl || !isTextInput(activeEl)) {
      //       closeKeyboard();
      //     }
      //   }, 150);
      // }
    };

    document.addEventListener('focusin', handleTrigger, true);
    document.addEventListener('click', handleTrigger, true);
    // document.addEventListener('focusout', handleBlur, true);

    return () => {
      document.removeEventListener('focusin', handleTrigger, true);
      document.removeEventListener('click', handleTrigger, true);
      // document.removeEventListener('focusout', handleBlur, true);
    };
  }, [autoOpenKeyboard, openKeyboard, closeKeyboard]);
}
