// src/hooks/use-scanner.ts
import { useEffect, useState } from 'react';

export function useScanner(onScan: (barcode: string) => void) {
  const [buffer, setBuffer] = useState("");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        if (buffer.length > 2) {
          onScan(buffer);
          setBuffer("");
        }
      } else {
        setBuffer((prev) => prev + e.key);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [buffer, onScan]);
}
