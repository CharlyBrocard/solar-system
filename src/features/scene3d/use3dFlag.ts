import { useSearchParams } from 'react-router-dom';

const KEY = 'orbites:scene3d';

/**
 * Flag « scène 3D » pendant la mise au point.
 * `?r3d=1` l'active (et le retient), `?r3d=0` le coupe. Sinon on lit le réglage
 * retenu. À la bascule définitive, on supprimera ce hook.
 */
export function use3dScene(): boolean {
  const [params] = useSearchParams();
  const q = params.get('r3d');

  if (typeof window !== 'undefined') {
    try {
      if (q === '1') window.localStorage.setItem(KEY, '1');
      else if (q === '0') window.localStorage.removeItem(KEY);
    } catch {
      /* stockage indisponible */
    }
  }

  if (q === '1') return true;
  if (q === '0') return false;
  try {
    return window.localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}
