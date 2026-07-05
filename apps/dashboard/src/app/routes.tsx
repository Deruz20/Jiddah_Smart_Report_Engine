import { createBrowserRouter, Navigate } from "react-router";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Layout } from "./components/Layout";
import LoginPage from "./pages/LoginPage";
import Dashboard from "./pages/Dashboard";
import StudentsPage from "./pages/StudentsPage";
import TeachersPage from "./pages/TeachersPage";
import MarksEntryPage from "./pages/MarksEntryPage";
import ReportsPage from "./pages/ReportsPage";
import SignaturesPage from "./pages/SignaturesPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import NotificationsPage from "./pages/NotificationsPage";
import SettingsPage from "./pages/SettingsPage";
import AccountPage from "./pages/AccountPage";
import UploadPage from "./pages/UploadPage";
import ClassesPage from "./pages/ClassesPage";
import SubjectsPage from "./pages/SubjectsPage";
import ActivityPage from "./pages/ActivityPage";
import TermsPage from "./pages/TermsPage";
import CircularPage from "./pages/CircularPage";
import TheologyPage from "./pages/TheologyPage";

export const router = createBrowserRouter([
  {
    path: "/login",
    Component: LoginPage,
  },
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: "dashboard", Component: Dashboard },
      { path: "students", Component: StudentsPage },
      { path: "teachers", Component: TeachersPage },
      { path: "classes", Component: ClassesPage },
      { path: "subjects", Component: SubjectsPage },
      { path: "circular", Component: CircularPage },
      { path: "theology", Component: TheologyPage },
      { path: "marks", Component: MarksEntryPage },
      { path: "reports", Component: ReportsPage },
      { path: "signatures", Component: SignaturesPage },
      { path: "analytics", Component: AnalyticsPage },
      { path: "upload", Component: UploadPage },
      { path: "notifications", Component: NotificationsPage },
      { path: "settings", Component: SettingsPage },
      { path: "terms", Component: TermsPage },
      { path: "account", Component: AccountPage },
      { path: "activity", Component: ActivityPage },
    ],
  },
]);
