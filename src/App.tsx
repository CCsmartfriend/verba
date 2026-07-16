import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Layout } from "@/components/Layout";
import Workbench from "@/pages/Workbench";
import Profiles from "@/pages/Profiles";
import History from "@/pages/History";
import { I18nProvider } from "@/i18n";

export default function App() {
  return (
    <I18nProvider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Workbench />} />
            <Route path="/profiles" element={<Profiles />} />
            <Route path="/history" element={<History />} />
          </Routes>
        </Layout>
      </Router>
    </I18nProvider>
  );
}
