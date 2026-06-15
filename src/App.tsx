import { Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { EntityCrudPage } from "./components/EntityCrudPage";
import { ImportPage } from "./pages/ImportPage";
import {
  sourceConfig,
  claimConfig,
  evidenceConfig,
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
        <Route index element={<Navigate to="/sources" replace />} />
        <Route path="sources" element={<EntityCrudPage config={sourceConfig} />} />
        <Route path="claims" element={<EntityCrudPage config={claimConfig} />} />
        <Route path="evidence-links" element={<EntityCrudPage config={evidenceConfig} />} />
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
