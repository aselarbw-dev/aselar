// src/Vat/VatRoutes.tsx
// Mounts the whole VAT module. In your router, add ONE route:
//
//   <Route path="/vat/*" element={<VatRoutes />} />
//
// If you mount it somewhere else, pass the same path so the links inside the module work:
//
//   <Route path="/tax/*" element={<VatRoutes basePath="/tax" />} />
//
// Then add a link to "/vat" in your menu.

import { Navigate, Route, Routes } from "react-router-dom";
import s from "./Vat.module.css";
import { VatBasePathProvider } from "./Ui";
import VatPeriodsPage from "./VatPeriodsPage";
import VatPeriodPage from "./VatPeriodPage";
import VatSettingsPage from "./VatSettingsPage";

export default function VatRoutes({ basePath = "/vat" }: { basePath?: string }) {
  return (
    <VatBasePathProvider value={basePath}>
      <div className={s.root}>
        <Routes>
          <Route index element={<VatPeriodsPage />} />
          <Route path="settings" element={<VatSettingsPage />} />
          <Route path="periods/:periodId" element={<VatPeriodPage />} />
          <Route path="*" element={<Navigate to={basePath} replace />} />
        </Routes>
      </div>
    </VatBasePathProvider>
  );
}