import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import RequireAdmin from './components/admin/RequireAdmin'
import AdminLayout from './components/admin/AdminLayout'
import RequireStaff from './components/staff/RequireStaff'
import StaffLayout from './components/staff/StaffLayout'
import RequireChef from './components/chef/RequireChef'
import ChefLayout from './components/chef/ChefLayout'
import Home from './pages/Home'
import AdminLogin from './pages/admin/AdminLogin'
import AdminDashboard from './pages/admin/AdminDashboard'
import Calendar from './pages/admin/Calendar'
import BookingsList from './pages/admin/BookingsList'
import BookingNew from './pages/admin/BookingNew'
import BookingEdit from './pages/admin/BookingEdit'
import BookingDetail from './pages/admin/BookingDetail'
import UpcomingMenus from './pages/admin/UpcomingMenus'
import MenuManager from './pages/admin/MenuManager'
import ClientsList from './pages/admin/ClientsList'
import ClientDetail from './pages/admin/ClientDetail'
import StaffManagement from './pages/admin/StaffManagement'
import AdminPayroll from './pages/admin/AdminPayroll'
import AdminPayrollDetail from './pages/admin/AdminPayrollDetail'
import Reports from './pages/admin/Reports'
import Settings from './pages/admin/Settings'
import AccountingLayout from './components/admin/accounting/AccountingLayout'
import AccountingDashboard from './pages/admin/accounting/AccountingDashboard'
import AccountingIncome from './pages/admin/accounting/Income'
import AccountingIncomeNew from './pages/admin/accounting/IncomeNew'
import AccountingExpenses from './pages/admin/accounting/Expenses'
import AccountingExpenseNew from './pages/admin/accounting/ExpenseNew'
import AccountingPayables from './pages/admin/accounting/Payables'
import AccountingPayableNew from './pages/admin/accounting/PayableNew'
import AccountingPayableDetail from './pages/admin/accounting/PayableDetail'
import AccountingReports from './pages/admin/accounting/Reports'
import StaffLogin from './pages/staff/StaffLogin'
import StaffRegister from './pages/staff/StaffRegister'
import StaffDashboard from './pages/staff/StaffDashboard'
import StaffEventDetail from './pages/staff/StaffEventDetail'
import Payroll from './pages/staff/Payroll'
import PayrollSubmit from './pages/staff/PayrollSubmit'
import PayrollReport from './pages/staff/PayrollReport'
import ChefLogin from './pages/chef/ChefLogin'
import ChefDashboard from './pages/chef/ChefDashboard'
import ChefEventDetail from './pages/chef/ChefEventDetail'
import KitchenOrderSheet from './pages/chef/KitchenOrderSheet'
import ClientPortal from './pages/ClientPortal'

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />

            <Route path="/admin/login" element={<AdminLogin />} />

            <Route element={<RequireAdmin />}>
              <Route element={<AdminLayout />}>
                <Route path="/admin/dashboard" element={<AdminDashboard />} />
                <Route path="/admin/calendar" element={<Calendar />} />
                <Route path="/admin/bookings" element={<BookingsList />} />
                <Route path="/admin/bookings/new" element={<BookingNew />} />
                <Route path="/admin/bookings/:id" element={<BookingDetail />} />
                <Route path="/admin/bookings/:id/edit" element={<BookingEdit />} />
                <Route path="/admin/upcoming-menus" element={<UpcomingMenus />} />
                <Route path="/admin/menu" element={<MenuManager />} />
                <Route path="/admin/clients" element={<ClientsList />} />
                <Route path="/admin/clients/:id" element={<ClientDetail />} />
                <Route path="/admin/staff" element={<StaffManagement />} />
                <Route path="/admin/payroll" element={<AdminPayroll />} />
                <Route path="/admin/payroll/:reportId" element={<AdminPayrollDetail />} />
                <Route path="/admin/reports" element={<Reports />} />
                <Route path="/admin/settings" element={<Settings />} />
                <Route path="/admin/accounting" element={<AccountingLayout />}>
                  <Route index element={<AccountingDashboard />} />
                  <Route path="income" element={<AccountingIncome />} />
                  <Route path="income/new" element={<AccountingIncomeNew />} />
                  <Route path="expenses" element={<AccountingExpenses />} />
                  <Route path="expenses/new" element={<AccountingExpenseNew />} />
                  <Route path="payables" element={<AccountingPayables />} />
                  <Route path="payables/new" element={<AccountingPayableNew />} />
                  <Route path="payables/:id" element={<AccountingPayableDetail />} />
                  <Route path="reports" element={<AccountingReports />} />
                </Route>
              </Route>
            </Route>

            <Route path="/staff/login" element={<StaffLogin />} />
            <Route path="/staff/register" element={<StaffRegister />} />

            <Route element={<RequireStaff />}>
              <Route element={<StaffLayout />}>
                <Route path="/staff/dashboard" element={<StaffDashboard />} />
                <Route path="/staff/event/:id" element={<StaffEventDetail />} />
                <Route path="/staff/payroll" element={<Payroll />} />
                <Route path="/staff/payroll/submit/:eventId" element={<PayrollSubmit />} />
                <Route path="/staff/payroll/report/:reportId" element={<PayrollReport />} />
              </Route>
            </Route>

            <Route path="/chef" element={<Navigate to="/chef/login" replace />} />
            <Route path="/chef/login" element={<ChefLogin />} />

            <Route element={<RequireChef />}>
              <Route path="/chef/print/:id" element={<KitchenOrderSheet />} />
              <Route element={<ChefLayout />}>
                <Route path="/chef/dashboard" element={<ChefDashboard />} />
                <Route path="/chef/event/:id" element={<ChefEventDetail />} />
              </Route>
            </Route>

            <Route path="/booking/:access_token" element={<ClientPortal />} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  )
}

export default App
