/**
 * Safe clipboard utility with fallbacks for browsers that block the Clipboard API
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    // Try the modern Clipboard API first
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    
    // Fallback for older browsers or insecure contexts
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      return successful;
    } catch (err) {
      document.body.removeChild(textArea);
      return false;
    }
  } catch (error) {
    console.warn('Failed to copy text to clipboard:', error);
    return false;
  }
};

/**
 * Check if clipboard API is available
 */
export const isClipboardAvailable = (): boolean => {
  return !!(navigator.clipboard && window.isSecureContext);
};