
import React, { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';

type AnnouncePriority = 'polite' | 'assertive';

type AnnouncerContextType = {
  announce: (message: string, priority?: AnnouncePriority) => void;
};

const AccessibilityAnnouncerContext = createContext<AnnouncerContextType | undefined>(undefined);

export const useAccessibilityAnnouncer = () => {
  const context = useContext(AccessibilityAnnouncerContext);
  if (!context) {
    throw new Error('useAccessibilityAnnouncer must be used within an AccessibilityAnnouncerProvider');
  }
  return context;
};

interface AccessibilityAnnouncerProviderProps {
  children: ReactNode;
}

export const AccessibilityAnnouncerProvider: React.FC<AccessibilityAnnouncerProviderProps> = ({ children }) => {
  const [politeMessage, setPoliteMessage] = useState('');
  const [assertiveMessage, setAssertiveMessage] = useState('');

  useEffect(() => {
    if (politeMessage) {
      const timer = setTimeout(() => setPoliteMessage(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [politeMessage]);

  useEffect(() => {
    if (assertiveMessage) {
      const timer = setTimeout(() => setAssertiveMessage(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [assertiveMessage]);

  const announce = useCallback((message: string, priority: AnnouncePriority = 'polite') => {
    if (priority === 'assertive') {
      setAssertiveMessage(message);
    } else {
      setPoliteMessage(message);
    }
  }, []);

  const visuallyHiddenStyle: React.CSSProperties = {
    position: 'absolute',
    width: '1px',
    height: '1px',
    margin: '-1px',
    padding: '0',
    overflow: 'hidden',
    clip: 'rect(0, 0, 0, 0)',
    border: '0',
  };

  return (
    <AccessibilityAnnouncerContext.Provider value={{ announce }}>
      {children}
      <div style={visuallyHiddenStyle} aria-live="polite" aria-atomic="true">
        {politeMessage}
      </div>
      <div style={visuallyHiddenStyle} aria-live="assertive" aria-atomic="true">
        {assertiveMessage}
      </div>
    </AccessibilityAnnouncerContext.Provider>
  );
};
