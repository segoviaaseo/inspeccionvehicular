import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { Navigation } from "@/components/layout/navigation";
import { useAuth } from "@/hooks/use-auth";
import Inspections from "@/pages/inspections";
import Vehicles from "@/pages/vehicles";
import Documents from "@/pages/documents";
import InspectionForm from "@/pages/inspection-form";
import InspectionDetail from "@/pages/inspection-detail";
import Login from "@/pages/login";
import NotFound from "@/pages/not-found";
import type { Vehicle } from "@shared/schema";

function ProtectedApp() {
  const [, setLocation] = useLocation();
  const { data: vehicles = [] } = useQuery<Vehicle[]>({ queryKey: ["/api/vehicles"] });
  const { logout, user } = useAuth();

  const getDocumentStatus = (expiryDate?: string | null) => {
    if (!expiryDate) return { status: "missing" };
    const today = new Date();
    const expiry = new Date(expiryDate);
    const daysLeft = Math.ceil((expiry.getTime() - today.getTime()) / 86400000);
    if (daysLeft < 0) return { status: "expired" };
    if (daysLeft <= 30) return { status: "expiring" };
    return { status: "valid" };
  };

  const hasDocumentAlerts = vehicles.some(v => {
    const soat = getDocumentStatus(v.soatExpiry);
    const rtm = getDocumentStatus(v.rtmExpiry);
    return soat.status === "expired" || soat.status === "expiring" ||
           rtm.status === "expired" || rtm.status === "expiring";
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        hasDocumentAlerts={hasDocumentAlerts}
        onDocumentAlertsClick={() => setLocation("/documents")}
        username={user?.username}
        onLogout={logout}
      />
      <Navigation />
      <main>
        <Switch>
          <Route path="/" component={Inspections} />
          <Route path="/vehicles" component={Vehicles} />
          <Route path="/documents" component={Documents} />
          <Route path="/inspection/:id/edit" component={InspectionForm} />
          <Route path="/inspection/:id" component={InspectionDetail} />
          <Route component={NotFound} />
        </Switch>
      </main>
    </div>
  );
}

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();
  const [location] = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  return <ProtectedApp />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <AppContent />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
