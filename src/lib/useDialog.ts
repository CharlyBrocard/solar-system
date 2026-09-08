import { useCallback, useEffect, useRef } from 'react';

/**
 * Accessibilité des overlays modaux : piège le focus dans la boîte de dialogue,
 * y place le focus à l'ouverture, le rend à l'élément déclencheur à la fermeture,
 * et ferme sur `Échap`. À poser sur le conteneur `role="dialog"`.
 *
 *   const ref = useDialog<HTMLDivElement>(onClose);
 *   <div ref={ref} role="dialog" aria-modal="true">…</div>
 */
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function useDialog<T extends HTMLElement>(onClose: () => void, active = true) {
  const ref = useRef<T | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const focusables = useCallback((): HTMLElement[] => {
    const root = ref.current;
    if (!root) return [];
    return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
      (el) => el.offsetParent !== null || el === document.activeElement,
    );
  }, []);

  useEffect(() => {
    if (!active) return;
    const restoreTo = document.activeElement as HTMLElement | null;
    const root = ref.current;

    // focus initial : le premier élément focusable, sinon le conteneur lui-même
    const first = focusables()[0];
    if (first) first.focus();
    else if (root) {
      root.setAttribute('tabindex', '-1');
      root.focus();
    }

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab') return;
      const items = focusables();
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const activeEl = document.activeElement as HTMLElement | null;
      const idx = activeEl ? items.indexOf(activeEl) : -1;
      let next = idx;
      if (e.shiftKey) next = idx <= 0 ? items.length - 1 : idx - 1;
      else next = idx === items.length - 1 ? 0 : idx + 1;
      e.preventDefault();
      items[next]?.focus();
    };

    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      restoreTo?.focus?.();
    };
  }, [focusables, active]);

  return ref;
}
