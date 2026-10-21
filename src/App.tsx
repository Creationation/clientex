import { useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AdminAuthProvider, useAdminAuth } from "@/hooks/useAdminAuth";
import { useTagesplanMode } from "@/hooks/useTagesplanMode";
import Landing from "@/pages/Landing";
import Booking from "@/pages/Booking";
import Confirmation from "@/pages/Confirmation";
import ManageBooking from "@/pages/ManageBooking";
import Legal from "@/pages/Legal";
import Admin from "@/pages/Admin";
import Tagesplan from "@/pages/Tagesplan";
import NotFound from "@/pages/NotFound";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname]);
  return null;
}

/**
 * Accueil. Sur l'appareil du salon, quand le mode Tagesplan est actif, ouvrir
 * le site mene directement au plan du jour plutot qu'a la vitrine.
 *
 * Le drapeau est local a l'appareil et se lit tout de suite : un visiteur
 * ordinaire ne voit donc jamais d'ecran d'attente, on ne retarde l'affichage
 * que la ou le mode a ete active.
 */
function Home() {
  const { enabled } = useTagesplanMode();
  const { ready, isAdmin } = useAdminAuth();

  if (!enabled) return <Landing />;
  if (!ready) return <div className="min-h-screen bg-paper" />;
  return isAdmin ? <Navigate to="/tagesplan" replace /> : <Landing />;
}

export default function App() {
  return (
    <LanguageProvider>
      <AdminAuthProvider>
        <BrowserRouter>
          <ScrollToTop />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/termin" element={<Booking />} />
            <Route path="/termin/bestaetigt" element={<Confirmation />} />
            <Route path="/termin/verwalten/:token" element={<ManageBooking />} />
            <Route path="/impressum" element={<Legal kind="impressum" />} />
            <Route path="/datenschutz" element={<Legal kind="datenschutz" />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/tagesplan" element={<Tagesplan />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AdminAuthProvider>
    </LanguageProvider>
  );
}
