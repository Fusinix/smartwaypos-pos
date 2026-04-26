/** @format */

import React, { useState, useEffect } from 'react';
import { useKeyboard } from '@/context/KeyboardContext';
import { Button } from '@/components/ui/button';
import { X, Delete, Type, Hash, Globe, ChevronRight, CornerDownLeft, Space } from 'lucide-react';
import { cn } from '@/lib/utils';

export const SideKeyboard: React.FC = () => {
  const { isOpen, mode, currentInput, closeKeyboard, setCurrentInput } = useKeyboard();
  const [layout, setLayout] = useState<'lowercase' | 'uppercase' | 'symbols'>('lowercase');

  const handleKeyPress = (key: string) => {
    // Magnet Connection: Always try to find the tagged active input first
    const taggedInput = document.querySelector('[data-keyboard-active="true"]') as HTMLInputElement | HTMLTextAreaElement;
    if (taggedInput && taggedInput !== currentInput) {
       (currentInput as any) = taggedInput;
       setCurrentInput(taggedInput);
    }

    if (!currentInput) return;
    
    // Self-healing: if the input was replaced in the DOM during a re-render
    if (!document.body.contains(currentInput)) {
      let replacement: HTMLInputElement | HTMLTextAreaElement | null = null;
      
      // Try finding by ID
      if (currentInput.id) {
        replacement = document.getElementById(currentInput.id) as any;
      }
      
      // Try finding by name if no ID or ID not found
      if (!replacement && currentInput.name) {
        replacement = document.querySelector(`input[name="${currentInput.name}"], textarea[name="${currentInput.name}"]`) as any;
      }
      
      // Try finding by placeholder as a last resort
      if (!replacement && currentInput.placeholder) {
        const escapedPlaceholder = currentInput.placeholder.replace(/"/g, '\\"');
        replacement = document.querySelector(`input[placeholder="${escapedPlaceholder}"], textarea[placeholder="${escapedPlaceholder}"]`) as any;
      }

      if (replacement && replacement !== currentInput) {
        // Update both local and global state
        (currentInput as any) = replacement;
        setCurrentInput(replacement);
        
        // Ensure the new one is tagged
        replacement.setAttribute('data-keyboard-active', 'true');
      } else {
        return;
      }
    }
    
    // Force focus if we lost it (e.g. due to clicking a label or Radix focus trap)
    if (document.activeElement !== currentInput) {
      currentInput.focus();
    }

    let start = 0;
    let end = 0;
    
    try {
      // Some input types like 'number' don't support selectionStart
      start = currentInput.selectionStart ?? currentInput.value.length;
      end = currentInput.selectionEnd ?? currentInput.value.length;
    } catch (e) {
      // Fallback for number inputs
      start = currentInput.value.length;
      end = currentInput.value.length;
    }
    const value = currentInput.value;
    let newPos = start;

    const updateInputValue = (newValue: string) => {
      if (!currentInput) return;
      
      // The "magic" setter that triggers React's internal state update
      const prototype = currentInput instanceof HTMLTextAreaElement 
        ? window.HTMLTextAreaElement.prototype 
        : window.HTMLInputElement.prototype;
      
      const descriptor = Object.getOwnPropertyDescriptor(prototype, "value");
      
      if (descriptor && descriptor.set) {
        descriptor.set.call(currentInput, newValue);
      } else {
        currentInput.value = newValue;
      }

      // Dispatch the input event
      const event = new Event('input', { bubbles: true });
      currentInput.dispatchEvent(event);
    };

    // Ensure focus before we do anything
    currentInput.focus();

    if (key === 'BACKSPACE') {
      if (start === end && start > 0) {
        const newValue = value.substring(0, start - 1) + value.substring(end);
        updateInputValue(newValue);
        newPos = start - 1;
      } else {
        const newValue = value.substring(0, start) + value.substring(end);
        updateInputValue(newValue);
        newPos = start;
      }
    } else if (key === 'ENTER') {
      const event = new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true });
      currentInput.dispatchEvent(event);
      closeKeyboard();
      return;
    } else {
      // For normal characters and SPACE, use execCommand if possible for better React compatibility
      const char = key === 'SPACE' ? ' ' : key;
      
      try {
        // Try execCommand first as it's best for React state sync
        const worked = document.execCommand('insertText', false, char);
        if (!worked) {
           throw new Error("execCommand failed");
        }
        // If it worked, browser updated value and triggered events
        newPos = start + 1;
      } catch (e) {
        // Fallback to manual update if execCommand is not supported or fails
        const newValue = value.substring(0, start) + char + value.substring(end);
        updateInputValue(newValue);
        newPos = start + 1;
      }
    }

    // Re-focus and restore selection after React has had a chance to re-render
    requestAnimationFrame(() => {
      if (!currentInput || !document.body.contains(currentInput)) return;
      currentInput.focus();
      try { 
        currentInput.setSelectionRange(newPos, newPos); 
      } catch (e) {}
    });
  };

  const Key = ({ value, label, className, variant = 'outline' }: any) => (
    <Button
      variant={variant}
      tabIndex={-1}
      className={cn(
        "h-16 sm:h-20 text-xl sm:text-2xl font-black rounded-2xl transition-all active:scale-90 shadow-md border-2 border-border/40",
        className
      )}
      onPointerDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        e.nativeEvent.stopImmediatePropagation();
      }}
      onMouseDown={(e) => {
        e.preventDefault();
      }}
      onClick={(e) => {
        e.stopPropagation();
        e.nativeEvent.stopImmediatePropagation();
        handleKeyPress(value);
      }}
    >
      {label || value}
    </Button>
  );

  const numericKeys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'BACKSPACE'];
  const alphabet = [
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
    ['SHIFT', 'z', 'x', 'c', 'v', 'b', 'n', 'm', 'BACKSPACE'],
    ['123', 'SPACE', 'ENTER']
  ];

  const symbolKeys = [
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
    ['-', '/', ':', ';', '(', ')', '$', '&', '@', '"'],
    ['#+=', '.', ',', '?', '!', "'", 'BACKSPACE'],
    ['ABC', 'SPACE', 'ENTER']
  ];

  return (
    <div
      tabIndex={-1}
      onPointerDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        e.nativeEvent.stopImmediatePropagation();
      }}
      onPointerUp={(e) => {
        e.stopPropagation();
        e.nativeEvent.stopImmediatePropagation();
      }}
      onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        e.nativeEvent.stopImmediatePropagation();
      }}
      onMouseUp={(e) => {
        e.stopPropagation();
        e.nativeEvent.stopImmediatePropagation();
      }}
      onClick={(e) => {
        e.stopPropagation();
        e.nativeEvent.stopImmediatePropagation();
      }}
      className={cn(
        "h-screen bg-card border-l-2 border-border z-[1000] transition-all duration-300 ease-in-out shadow-none overflow-hidden flex flex-col keyboard-container flex-shrink-0",
        isOpen ? "w-[400px] sm:w-[500px]" : "w-0 border-l-0 shadow-none"
      )}
    >
      <div className="flex items-center justify-between px-6 py-2 border-b-2 border-border/30 bg-muted/20">
        <div className="flex items-center gap-3">
           <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
              {mode === 'numeric' ? <Hash className="size-5" /> : <Type className="size-5" />}
           </div>
           <span className="text-sm font-black uppercase tracking-[0.2em] italic text-primary">
             {mode === 'numeric' ? 'Smart-Num' : 'Smart-Alpha'}
           </span>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          tabIndex={-1}
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            e.nativeEvent.stopImmediatePropagation();
          }} 
          onMouseDown={(e) => {
            e.preventDefault();
          }}
          onClick={(e) => {
            e.stopPropagation();
            e.nativeEvent.stopImmediatePropagation();
            closeKeyboard();
          }} 
          className="rounded-full size-12 hover:bg-destructive/10 hover:text-destructive"
        >
          <X className="size-6" />
        </Button>
      </div>

      <div className="flex-1 p-5 overflow-y-auto bg-gradient-to-b from-card via-card to-muted/10">
        {mode === 'numeric' ? (
          <div className="grid grid-cols-3 gap-4 h-full max-h-[600px]">
            {numericKeys.map((key) => (
              <Key 
                key={key} 
                value={key} 
                label={key === 'BACKSPACE' ? <Delete className="size-8" /> : key}
                className={key === 'BACKSPACE' ? "bg-muted/50 text-destructive border-destructive/20" : "bg-card hover:bg-muted/50"}
              />
            ))}
            <Button 
                variant="default"
                tabIndex={-1}
                className="col-span-3 h-20 rounded-2xl text-xl font-black uppercase italic tracking-widest shadow-xl shadow-primary/30 mt-2"
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  e.nativeEvent.stopImmediatePropagation();
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  e.nativeEvent.stopImmediatePropagation();
                  closeKeyboard();
                }}
            >
                Confirm Entry
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
             {(layout === 'symbols' ? symbolKeys : alphabet).map((row, i) => (
               <div key={i} className="flex justify-center gap-2">
                  {row.map((key) => {
                    if (key === 'SHIFT') {
                      return (
                        <Button 
                          key="shift"
                          variant="outline" 
                          tabIndex={-1}
                          className={cn("h-16 sm:h-20 flex-1 rounded-2xl border-2", layout === 'uppercase' && "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20")}
                          onPointerDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            e.nativeEvent.stopImmediatePropagation();
                          }}
                          onMouseDown={(e) => {
                            e.preventDefault();
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            e.nativeEvent.stopImmediatePropagation();
                            setLayout(prev => prev === 'lowercase' ? 'uppercase' : 'lowercase');
                          }}
                        >
                          <ChevronRight className={cn("size-6 transition-transform", layout === 'uppercase' ? "-rotate-90" : "")} />
                        </Button>
                      );
                    }
                    if (key === '123' || key === 'ABC') {
                      return (
                        <Button 
                          key="mode"
                          variant="outline" 
                          tabIndex={-1}
                          className="h-16 sm:h-20 flex-1 rounded-2xl border-2 text-sm font-black"
                          onPointerDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            e.nativeEvent.stopImmediatePropagation();
                          }}
                          onMouseDown={(e) => {
                            e.preventDefault();
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            e.nativeEvent.stopImmediatePropagation();
                            setLayout(prev => prev === 'symbols' ? 'lowercase' : 'symbols');
                          }}
                        >
                          {key}
                        </Button>
                      );
                    }
                    if (key === 'SPACE') {
                      return <Key key="space" value="SPACE" label={<Space className="size-6" />} className="flex-[3]" />;
                    }
                    if (key === 'ENTER') {
                      return <Key key="enter" value="ENTER" label={<CornerDownLeft className="size-6" />} variant="default" className="flex-1 shadow-xl shadow-primary/30" />;
                    }
                    if (key === 'BACKSPACE') {
                      return <Key key="back" value="BACKSPACE" label={<Delete className="size-6" />} className="flex-1 bg-muted/50 text-destructive border-destructive/20" />;
                    }
                    
                    const char = layout === 'uppercase' ? key.toUpperCase() : key;
                    return <Key key={key} value={char} className="flex-1 min-w-0 px-0 shadow-sm" />;
                  })}
               </div>
             ))}
          </div>
        )}
      </div>

      <div className="p-4 border-t border-border/30 bg-muted/20">
         <p className="text-[10px] text-center font-bold text-muted-foreground uppercase tracking-tighter">
            Smartway POS Keyboard v1.0
         </p>
      </div>
    </div>
  );
};
