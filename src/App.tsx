import { useEffect } from "react";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AdminAuthProvider } from "@/hooks/useAdminAuth";
import Landing from "@/pages/Landing";
import Booking from "@/pages/Booking";
import Confirmation from "@/pages/Confirmation";
import Legal from "@/pages/Legal";
import Admin from "@/pages/Admin";
import NotFound from "@/pages/NotFound";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <LanguageProvider>
      <AdminAuthProvider>
        <BrowserRouter>
          <ScrollToTop />
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/termin" element={<Booking />} />
            <Route path="/termin/bestaetigt" element={<Confirmation />} />
            <Route path="/impressum" element={<Legal kind="impressum" />} />
            <Route path="/datenschutz" element={<Legal kind="datenschutz" />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AdminAuthProvider>
    </LanguageProvider>
  );
}
