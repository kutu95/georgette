import { Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { EntityCrudPage } from "./components/EntityCrudPage";
import { DashboardPage } from "./pages/DashboardPage";
import { ImportPage } from "./pages/ImportPage";
import { SourcesPage } from "./pages/SourcesPage";
import { SourceDetailPage } from "./pages/SourceDetailPage";
import { ClaimsPage } from "./pages/ClaimsPage";
import { ClaimDetailPage } from "./pages/ClaimDetailPage";
import { ObservationsPage } from "./pages/ObservationsPage";
import { ObservationDetailPage } from "./pages/ObservationDetailPage";
import { ShipFeaturesPage } from "./pages/ShipFeaturesPage";
import { ShipFeatureDetailPage } from "./pages/ShipFeatureDetailPage";
import { EvidenceLinksPage } from "./pages/EvidenceLinksPage";
import {
  peopleConfig,
  placesConfig,
  eventsConfig,
  contradictionsConfig,
  manuscriptConfig,
  tagsConfig,
  relationshipsConfig,
} from "./lib/entities";

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<DashboardPage />} />
        <Route path="sources" element={<SourcesPage />} />
        <Route path="sources/:id" element={<SourceDetailPage />} />
        <Route path="claims" element={<ClaimsPage />} />
        <Route path="claims/:id" element={<ClaimDetailPage />} />
        <Route path="observations" element={<ObservationsPage />} />
        <Route path="observations/:id" element={<ObservationDetailPage />} />
        <Route path="ship-features" element={<ShipFeaturesPage />} />
        <Route path="ship-features/:id" element={<ShipFeatureDetailPage />} />
        <Route path="evidence" element={<EvidenceLinksPage />} />
        <Route path="evidence-links" element={<Navigate to="/evidence" replace />} />
        <Route path="people" element={<EntityCrudPage config={peopleConfig} />} />
        <Route path="places" element={<EntityCrudPage config={placesConfig} />} />
        <Route path="events" element={<EntityCrudPage config={eventsConfig} />} />
        <Route
          path="contradictions"
          element={<EntityCrudPage config={contradictionsConfig} />}
        />
        <Route
          path="manuscript-references"
          element={<EntityCrudPage config={manuscriptConfig} />}
        />
        <Route path="tags" element={<EntityCrudPage config={tagsConfig} />} />
        <Route
          path="relationships"
          element={<EntityCrudPage config={relationshipsConfig} />}
        />
        <Route path="import" element={<ImportPage />} />
      </Route>
    </Routes>
  );
}

export default App;
