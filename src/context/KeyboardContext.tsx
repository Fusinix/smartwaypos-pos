/** @format */

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';

export type KeyboardMode = 'numeric' | 'text' | 'symbols' | 'all';

interface KeyboardContextType {
  isOpen: boolean;
  mode: KeyboardMode;
  openKeyboard: (input: HTMLInputElement | HTMLTextAreaElement, mode?: KeyboardMode) => void;
  closeKeyboard: () => void;
  setCurrentInput: (input: HTMLInputElement | HTMLTextAreaElement | null) => void;
  currentInput: HTMLInputElement | HTMLTextAreaElement | null;
  portalContainer: React.RefObject<HTMLDivElement>;
}

const KeyboardContext = createContext<KeyboardContextType | undefined>(undefined);

export const KeyboardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<KeyboardMode>('all');
  const [currentInput, setCurrentInput] = useState<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const portalContainer = useRef<HTMLDivElement>(null);

  const openKeyboard = useCallback((input: HTMLInputElement | HTMLTextAreaElement, requestedMode: KeyboardMode = 'all') => {
    // Determine mode automatically if not specified
    let finalMode = requestedMode;
    if (!requestedMode) {
      if (input.type === 'number' || input.inputMode === 'numeric') {
        finalMode = 'numeric';
      } else {
        finalMode = 'all';
      }
    }

    setCurrentInput(input);
    setMode(finalMode);
    setIsOpen(true);
  }, []);

  const closeKeyboard = useCallback(() => {
    setIsOpen(false);
    setCurrentInput(null);
  }, []);

  return (
    <KeyboardContext.Provider value={{ isOpen, mode, openKeyboard, closeKeyboard, setCurrentInput, currentInput, portalContainer }}>
      {children}
    </KeyboardContext.Provider>
  );
};

export const useKeyboard = () => {
  const context = useContext(KeyboardContext);
  if (context === undefined) {
    throw new Error('useKeyboard must be used within a KeyboardProvider');
  }
  return context;
};
