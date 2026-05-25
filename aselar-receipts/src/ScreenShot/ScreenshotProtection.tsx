import React, { useState, useEffect } from 'react';

// CSS Modules styles (inline for demonstration)
const styles = {
  container: {
    position: 'relative' as const,
    width: '100%',
    height: '100vh',
    backgroundColor: '#f0f0f0',
    padding: '20px',
    boxSizing: 'border-box' as const,
  },
  content: {
    maxWidth: '800px',
    margin: '0 auto',
    backgroundColor: 'white',
    padding: '30px',
    borderRadius: '8px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
  },
  overlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    backdropFilter: 'blur(5px)',
  },
  warningBox: {
    backgroundColor: 'white',
    padding: '40px',
    borderRadius: '12px',
    textAlign: 'center' as const,
    maxWidth: '500px',
    margin: '20px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
  },
  warningTitle: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#dc2626',
    marginBottom: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
  },
  warningText: {
    fontSize: '16px',
    color: '#374151',
    marginBottom: '24px',
    lineHeight: '1.5',
  },
  stopButton: {
    backgroundColor: '#dc2626',
    color: 'white',
    border: 'none',
    padding: '12px 24px',
    fontSize: '16px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '500',
    transition: 'background-color 0.2s',
  },
  stopButtonHover: {
    backgroundColor: '#b91c1c',
  },
  keyboardShortcuts: {
    fontSize: '14px',
    color: '#6b7280',
    marginTop: '16px',
    fontFamily: 'monospace',
  }
};

const ScreenshotProtection: React.FC = () => {
  const [showOverlay, setShowOverlay] = useState(false);
  const [detectedAction, setDetectedAction] = useState('');

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Common screenshot shortcuts
      const isScreenshot = 
        // Windows: Print Screen, Alt+Print Screen
        event.key === 'PrintScreen' ||
        // Mac: Cmd+Shift+3, Cmd+Shift+4, Cmd+Shift+5
        ((event.metaKey || event.ctrlKey) && event.shiftKey && ['3', '4', '5'].includes(event.key)) ||
        // Additional Windows shortcuts
        (event.altKey && event.key === 'PrintScreen') ||
        // Some Linux shortcuts
        ((event.ctrlKey && event.altKey) && event.key === 'PrintScreen');

      if (isScreenshot) {
        event.preventDefault();
        setDetectedAction(getActionDescription(event));
        setShowOverlay(true);
      }
    };

    const handleVisibilityChange = () => {
      // Detect when page becomes hidden (might indicate screenshot app)
      if (document.hidden) {
        setDetectedAction('Suspicious activity detected');
        setShowOverlay(true);
      }
    };

    const handleBlur = () => {
      // Detect when window loses focus (might indicate screenshot app)
      setDetectedAction('Window focus lost - potential screenshot attempt');
      setShowOverlay(true);
    };

    // Add event listeners
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);

    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  const getActionDescription = (event: KeyboardEvent): string => {
    if (event.key === 'PrintScreen') {
      return event.altKey ? 'Alt + Print Screen detected' : 'Print Screen detected';
    }
    if (event.metaKey && event.shiftKey) {
      return `Cmd + Shift + ${event.key} detected`;
    }
    if (event.ctrlKey && event.shiftKey) {
      return `Ctrl + Shift + ${event.key} detected`;
    }
    return 'Screenshot shortcut detected';
  };

  const handleStopClick = () => {
    setShowOverlay(false);
    setDetectedAction('');
  };

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <h1>Protected Content Area</h1>
        <p>This is a demonstration of screenshot protection. The system monitors for:</p>
        <ul>
          <li><strong>Windows:</strong> Print Screen, Alt + Print Screen</li>
          <li><strong>macOS:</strong> Cmd + Shift + 3/4/5</li>
          <li><strong>Linux:</strong> Ctrl + Alt + Print Screen</li>
        </ul>
        <p>Try pressing any of these shortcuts to see the protection overlay.</p>
        
        <h2>Important Note</h2>
        <p style={{ color: '#dc2626', fontWeight: '500' }}>
          This is a browser-based deterrent only. True screenshot prevention requires 
          desktop applications with system-level permissions.
        </p>

        <h2>Sample Content</h2>
        <p>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod 
          tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim 
          veniam, quis nostrud exercitation ullamco laboris.
        </p>
      </div>

      {/* Dark Overlay */}
      {showOverlay && (
        <div style={styles.overlay}>
          <div style={styles.warningBox}>
            <div style={styles.warningTitle}>
              ⚠️ Screenshot Blocked
            </div>
            <div style={styles.warningText}>
              {detectedAction}
              <br />
              <br />
              Screenshots are not allowed on this content. 
              This action has been logged for security purposes.
            </div>
            <button 
              style={styles.stopButton}
              onClick={handleStopClick}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = styles.stopButtonHover.backgroundColor;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = styles.stopButton.backgroundColor;
              }}
            >
              Stop & Continue
            </button>
            <div style={styles.keyboardShortcuts}>
              Detected keyboard shortcuts are blocked while this overlay is active
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScreenshotProtection;