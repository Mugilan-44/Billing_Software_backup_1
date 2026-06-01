import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { useContext, useEffect } from 'react';
import { AuthContext } from './context/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import { ToastProvider, useToast } from './context/ToastContext';
import axios from './utils/api';
import './utils/api';

const AxiosInterceptor = ({ children }) => {
  const { showToast } = useToast();

  useEffect(() => {
    const responseInterceptor = axios.interceptors.response.use(
      response => response,
      error => {
        const msg = error.response?.data?.message || error.message || 'An unexpected error occurred';
        showToast(msg, 'error');
        return Promise.reject(error);
      }
    );
    return () => {
      axios.interceptors.response.eject(responseInterceptor);
    };
  }, [showToast]);

  return children;
};

// ─── Unified Auth Layout & Pages ───────────────────────────────────────────
import DashboardLayout from './layouts/DashboardLayout';
import Login from './pages/auth/Login';
import Register from './pages/Register';

// ─── Super Admin Specific Components ───────────────────────────────────────
import AdminUsers from './pages/superadmin/AdminUsers';
import ProlyncAdmins from './pages/superadmin/ProlyncAdmins';

// ─── Billing Admin Components ──────────────────────────────────────────────
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import CustomerForm from './pages/CustomerForm';
import Vendors from './pages/Vendors';
import VendorForm from './pages/VendorForm';
import Items from './pages/Items';
import ItemForm from './pages/ItemForm';
import GstSummary from './pages/GstSummary';
import Quotations from './pages/Quotations';
import QuotationForm from './pages/QuotationForm';
import SalesOrders from './pages/SalesOrders';
import SalesOrderForm from './pages/SalesOrderForm';
import PurchaseBills from './pages/PurchaseBills';
import PurchaseBillForm from './pages/PurchaseBillForm';
import Invoices from './pages/Invoices';
import InvoiceForm from './pages/InvoiceForm';
import InvoiceViewer from './pages/InvoiceViewer';
import QuotationViewer from './pages/QuotationViewer';
import SalesOrderViewer from './pages/SalesOrderViewer';
import ChallanViewer from './pages/ChallanViewer';
import PurchaseBillViewer from './pages/PurchaseBillViewer';
import Challans from './pages/Challans';
import ChallanForm from './pages/ChallanForm';
import Payments from './pages/Payments';
import PaymentForm from './pages/PaymentForm';
import Settings from './pages/Settings';
import Features from './pages/Features';
import Support from './pages/Support';
import SubscriptionPage from './pages/SubscriptionPage';
import CreditNotes from './pages/CreditNotes';
import CreditNoteForm from './pages/CreditNoteForm';
import CreditNoteViewer from './pages/CreditNoteViewer';
import Expenses from './pages/Expenses';
import ExpenseForm from './pages/ExpenseForm';
import Stock from './pages/Stock';
import Reports from './pages/Reports';


// ─── Customer Components ───────────────────────────────────────────────────
import CustomerDashboard from './pages/customer/CustomerDashboard';

// ─── Shared Components ─────────────────────────────────────────────────────
import PublicInvoice from './pages/PublicInvoice';
import PublicInvoiceViewer from './pages/PublicInvoiceViewer';

// ─── Dynamic Dashboard Resolver ──────────────────────────────────────────
const UnifiedDashboard = () => {
  const { user } = useContext(AuthContext);

  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'SUPER_ADMIN') return <Navigate to="/admin" replace />;
  if (user.role === 'CUSTOMER') return <CustomerDashboard />;

  // Both SUPER_ADMIN and ADMIN use the standard business Dashboard
  return <Dashboard />;
};

// ─── Super Admin Route Guard ──────────────────────────────────────────────
// Redirects non-SUPER_ADMIN users away from super-admin pages
const SuperAdminRoute = ({ children }) => {
  const { user } = useContext(AuthContext);
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'SUPER_ADMIN') return <Navigate to="/dashboard" replace />;
  return children;
};

function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AxiosInterceptor>
          <AuthProvider>
            <Router>
        <Routes>
          {/* ─── Public Routes ────────────── */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/public/invoice/:id" element={<PublicInvoice />} />
          <Route path="/invoice/view/:token" element={<PublicInvoiceViewer />} />

          {/* Legacy login redirects */}
          <Route path="/admin/login" element={<Navigate to="/login" replace />} />
          <Route path="/super-admin/login" element={<Navigate to="/login" replace />} />
          <Route path="/customer/login" element={<Navigate to="/login" replace />} />

          {/* ─── Unified Protected Layout ─── */}
          <Route element={<DashboardLayout />}>
            {/* Main Dashboard - dynamically renders based on role */}
            <Route path="/dashboard" element={<UnifiedDashboard />} />

            {/* General Administrative & Business Routes */}
            <Route path="/customers" element={<Customers />} />
            <Route path="/customers/new" element={<CustomerForm />} />
            <Route path="/customers/:id/edit" element={<CustomerForm />} />

            <Route path="/vendors" element={<Vendors />} />
            <Route path="/vendors/new" element={<VendorForm />} />
            <Route path="/vendors/:id/edit" element={<VendorForm />} />

            <Route path="/items" element={<Items />} />
            <Route path="/items/new" element={<ItemForm />} />
            <Route path="/items/:id/edit" element={<ItemForm />} />

            <Route path="/quotations" element={<Quotations />} />
            <Route path="/quotations/new" element={<QuotationForm />} />
            <Route path="/quotations/:id" element={<QuotationViewer />} />
            <Route path="/quotations/:id/edit" element={<QuotationForm />} />

            <Route path="/orders" element={<SalesOrders />} />
            <Route path="/orders/new" element={<SalesOrderForm />} />
            <Route path="/orders/:id" element={<SalesOrderViewer />} />
            <Route path="/orders/:id/edit" element={<SalesOrderForm />} />

            <Route path="/purchase-bills" element={<PurchaseBills />} />
            <Route path="/purchase-bills/new" element={<PurchaseBillForm />} />
            <Route path="/purchase-bills/:id" element={<PurchaseBillViewer />} />
            <Route path="/purchase-bills/:id/edit" element={<PurchaseBillForm />} />

            <Route path="/invoices" element={<Invoices />} />
            <Route path="/invoices/new" element={<InvoiceForm />} />
            <Route path="/invoices/:id" element={<InvoiceViewer />} />
            <Route path="/invoices/:id/edit" element={<InvoiceForm />} />

            <Route path="/challans" element={<Challans />} />
            <Route path="/challans/new" element={<ChallanForm />} />
            <Route path="/challans/:id" element={<ChallanViewer />} />
            <Route path="/challans/:id/edit" element={<ChallanForm />} />

            <Route path="/payments" element={<Payments />} />
            <Route path="/payments/new" element={<PaymentForm />} />
            <Route path="/payments/:id/edit" element={<PaymentForm />} />

            <Route path="/credit-notes" element={<CreditNotes />} />
            <Route path="/credit-notes/new" element={<CreditNoteForm />} />
            <Route path="/credit-notes/:id" element={<CreditNoteViewer />} />
            <Route path="/credit-notes/:id/edit" element={<CreditNoteForm />} />

            <Route path="/expenses" element={<Expenses />} />
            <Route path="/expenses/new" element={<ExpenseForm />} />
            <Route path="/expenses/:id/edit" element={<ExpenseForm />} />
            <Route path="/stock" element={<Stock />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/gst-summary" element={<GstSummary />} />

            {/* System / Super Admin Settings */}
            <Route path="/settings" element={<Settings />} />
            <Route path="/features" element={<Features />} />
            <Route path="/support" element={<Support />} />
            <Route path="/settings/subscription" element={<SubscriptionPage />} />
            <Route path="/admin" element={<SuperAdminRoute><AdminUsers /></SuperAdminRoute>} />
            <Route path="/super-admin/dashboard" element={<Navigate to="/admin" replace />} />
            <Route path="/super-admin/admins" element={<SuperAdminRoute><AdminUsers /></SuperAdminRoute>} />
            <Route path="/super-admin/prolync-admins" element={<SuperAdminRoute><ProlyncAdmins /></SuperAdminRoute>} />
            {/* Removed redundant /admin/dashboard wrapper */}
            <Route path="/customer/dashboard" element={<Navigate to="/dashboard" replace />} />

            {/* Note: In a production app you may want `<RoleProtectedRoute>` wrappers around specific sensitive views */}
          </Route>

          {/* ─── Catch-all ────────────────── */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
            </Router>
          </AuthProvider>
        </AxiosInterceptor>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;
