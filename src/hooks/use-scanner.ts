import { useEffect, useRef } from 'react';

export function useScanner(onScan: (barcode: string) => void) {
  const bufferRef = useRef("");
  const onScanRef = useRef(onScan);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        if (bufferRef.current.length > 2) {
          onScanRef.current(bufferRef.current);
          bufferRef.current = "";
        }
      } else if (e.key.length === 1) {
        bufferRef.current += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []); // bo'sh dependency — faqat bir marta
}
