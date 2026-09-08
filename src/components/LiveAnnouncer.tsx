import { useEffect, useRef, useState } from 'react';
import { bodyById } from '@/data/bodies';
import { useProgress } from '@/store/progress';

/**
 * Région ARIA « live » discrète : annonce chaque découverte aux lecteurs
 * d'écran, même quand aucun overlay ne s'affiche (objets non notables).
 */
export function LiveAnnouncer() {
  const discovered = useProgress((s) => s.discovered);
  const [message, setMessage] = useState('');
  const prevLen = useRef(discovered.length);

  useEffect(() => {
    if (discovered.length > prevLen.current) {
      const lastId = discovered[discovered.length - 1];
      const body = bodyById(lastId);
      if (body) setMessage(`${body.name} ajouté à ton carnet.`);
    }
    prevLen.current = discovered.length;
  }, [discovered]);

  return (
    <div className="srOnly" role="status" aria-live="polite" aria-atomic="true">
      {message}
    </div>
  );
}
