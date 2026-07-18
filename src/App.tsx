import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Layout } from "@/components/Layout";
import Workbench from "@/pages/Workbench";
import Profiles from "@/pages/Profiles";
import { I18nProvider } from "@/i18n";

export default function App() {
  return (
    <I18nProvider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Workbench />} />
            <Route path="/profiles" element={<Profiles />} />
          </Routes>
        </Layout>
      </Router>
    </I18nProvider>
  );
}
