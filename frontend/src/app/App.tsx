import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import { Dashboard } from "./components/dashboard";
import { Transactions } from "./pages/Transactions";
import { Analytics } from "./pages/Analytics";
import { Budgets } from "./pages/Budgets";
import { Invoices } from "./pages/Invoices";
import { MonthlySummary } from "./pages/MonthlySummary";
import { Settings } from "./pages/Settings";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />}>
          <Route path="transactions" element={<Transactions />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="budgets" element={<Budgets />} />
          <Route path="invoices" element={<Invoices />} />
          <Route path="monthly-summary" element={<MonthlySummary />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
