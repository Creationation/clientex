import { useCallback, useEffect, useState } from "react";

/**
 * Mode Tagesplan.
 *
 * Quand il est actif, le salon qui ouvre le site tombe directement sur le plan
 * du jour au lieu de la vitrine. Le reglage vit dans le navigateur de
 * l'appareil, pas en base : la tablette posee au salon peut rester en mode
 * Tagesplan pendant que le telephone du patron ouvre le site normalement.
 *
 * Il ne touche jamais a la session. Basculer d'un mode a l'autre ne deconnecte
 * personne : c'est un simple aiguillage d'affichage.
 */

const KEY = "delherren_tagesplan_mode";
const EVENT = "delherren:tagesplan-mode";

function read(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    // Navigation privee ou stockage refuse : on reste en mode normal.
    return false;
  }
}

export function useTagesplanMode() {
  const [enabled, setEnabledState] = useState(read);

  useEffect(() => {
    const sync = () => setEnabledState(read());
    // "storage" ne se declenche que dans les AUTRES onglets. L'evenement
    // maison previent les composants de cet onglet-ci.
    window.addEventListener("storage", sync);
    window.addEventListener(EVENT, sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(EVENT, sync);
    };
  }, []);

  const setEnabled = useCallback((value: boolean) => {
    try {
      if (value) localStorage.setItem(KEY, "1");
      else localStorage.removeItem(KEY);
    } catch {
      // Le mode ne survivra pas au rechargement, mais il marche pour la session.
    }
    setEnabledState(value);
    window.dispatchEvent(new Event(EVENT));
  }, []);

  return { enabled, setEnabled };
}
