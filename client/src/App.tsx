import { Switch, Route, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import LoadingAnimation from "@/components/LoadingAnimation";
import LoginPage from "@/pages/LoginPage";
import SchoolLevelPage from "@/pages/SchoolLevelPage";
import VotingPage from "@/pages/VotingPage";
import AdminDashboard from "@/pages/AdminDashboard";
import AdminPartylists from "@/pages/AdminPartylists";
import AdminPositions from "@/pages/AdminPositions";
import AdminCandidates from "@/pages/AdminCandidates";
import AdminStudents from "@/pages/AdminStudents";
import AdminSettings from "@/pages/AdminSettings";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";

function Router() {
  const [location, setLocation] = useLocation();
  const { user, isLoading, isAdmin } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (!user && !location.startsWith("/admin") && location !== "/") {
        setLocation("/");
      } else if (user && !user.schoolLevel && !user.gradeLevel && !isAdmin && location !== "/school-level") {
        setLocation("/school-level");
      } else if (user && user.schoolLevel && user.gradeLevel && !isAdmin && location !== "/voting") {
        setLocation("/voting");
      } else if (isAdmin && location === "/") {
        setLocation("/admin");
      }
    }
  }, [user, isLoading, location, isAdmin, setLocation]);

  // Admin route guard
  const AdminRoute = ({ component: Component, ...rest }: any) => {
    if (isLoading) return <LoadingAnimation />;
    return isAdmin ? <Component {...rest} /> : <NotFound />;
  };

  // Student route guard
  const StudentRoute = ({ component: Component, ...rest }: any) => {
    if (isLoading) return <LoadingAnimation />;
    return user && !isAdmin ? <Component {...rest} /> : <NotFound />;
  };

  // School level route guard
  const SchoolLevelRoute = ({ component: Component, ...rest }: any) => {
    if (isLoading) return <LoadingAnimation />;
    return user && !isAdmin && !user.schoolLevel && !user.gradeLevel ? <Component {...rest} /> : <NotFound />;
  };

  return (
    <Switch>
      {/* Public route */}
      <Route path="/" component={LoginPage} />

      {/* Student routes */}
      <Route path="/school-level">
        <SchoolLevelRoute component={SchoolLevelPage} />
      </Route>
      <Route path="/voting">
        <StudentRoute component={VotingPage} />
      </Route>

      {/* Admin routes */}
      <Route path="/admin">
        <AdminRoute component={AdminDashboard} />
      </Route>
      <Route path="/admin/partylists">
        <AdminRoute component={AdminPartylists} />
      </Route>
      <Route path="/admin/positions">
        <AdminRoute component={AdminPositions} />
      </Route>
      <Route path="/admin/candidates">
        <AdminRoute component={AdminCandidates} />
      </Route>
      <Route path="/admin/students">
        <AdminRoute component={AdminStudents} />
      </Route>
      <Route path="/admin/settings">
        <AdminRoute component={AdminSettings} />
      </Route>

      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    // Simulate initial loading for 3 seconds
    const timer = setTimeout(() => {
      setInitialLoading(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {initialLoading ? (
        <LoadingAnimation />
      ) : (
        <>
          <Router />
          <Toaster />
        </>
      )}
    </QueryClientProvider>
  );
}

export default App;
