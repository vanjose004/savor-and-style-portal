import { lazy, Suspense } from 'react'
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
import SoftReserves from './pages/admin/SoftReserves'
import AdminGallery from './pages/admin/Gallery'
import ChatbotSettings from './pages/admin/ChatbotSettings'
import MessengerBot from './pages/admin/MessengerBot'
import Attendance from './pages/admin/Attendance'
import AdminPayroll from './pages/admin/AdminPayroll'
import AdminPayrollDetail from './pages/admin/AdminPayrollDetail'
import Reports from './pages/admin/Reports'
import Settings from './pages/admin/Settings'
import AddonCatalog from './pages/admin/AddonCatalog'
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
import DriverSchedule from './pages/staff/DriverSchedule'
import StaffEventDetail from './pages/staff/StaffEventDetail'
import Payroll from './pages/staff/Payroll'
import PayrollSubmit from './pages/staff/PayrollSubmit'
import PayrollReport from './pages/staff/PayrollReport'
import ChefLogin from './pages/chef/ChefLogin'
import ChefDashboard from './pages/chef/ChefDashboard'
import ChefEventDetail from './pages/chef/ChefEventDetail'
import KitchenOrderSheet from './pages/chef/KitchenOrderSheet'
import ClientPortal from './pages/ClientPortal'
import RequireClientMember from './components/client-portal/RequireClientMember'
import ClientPortalLayout from './components/client-portal/ClientPortalLayout'
import ClientPortalLogin from './pages/client-portal/ClientPortalLogin'
import ClientDashboard from './pages/client-portal/Dashboard'
import ClientGuests from './pages/client-portal/Guests'
import ClientPayments from './pages/client-portal/Payments'
import ClientDocuments from './pages/client-portal/Documents'
import ClientMessages from './pages/client-portal/Messages'
import ClientChecklist from './pages/client-portal/Checklist'
import ClientBudget from './pages/client-portal/Budget'
import ClientVendors from './pages/client-portal/Vendors'
import ClientEntourage from './pages/client-portal/Entourage'
import ClientProgram from './pages/client-portal/Program'
import ClientMenu from './pages/client-portal/Menu'
import ClientMoodBoard from './pages/client-portal/MoodBoard'
import ClientSeating from './pages/client-portal/Seating'
import ClientRequirements from './pages/client-portal/Requirements'
import ClientSongs from './pages/client-portal/Songs'
import ClientAddOns from './pages/client-portal/AddOns'
import ClientGifts from './pages/client-portal/Gifts'
import ClientEventGallery from './pages/client-portal/EventGallery'
import ClientFeedback from './pages/client-portal/Feedback'
import RsvpPublic from './pages/RsvpPublic'
import BookingRequest from './pages/BookingRequest'
import HomeCheckin from './pages/HomeCheckin'
import EventCheckin from './pages/EventCheckin'

// Lazy-loaded: pulls in framer-motion and the gallery/hero images, none of
// which any other role (admin/staff/chef) needs in their initial bundle.
const Landing = lazy(() => import('./pages/Landing'))
const PublicGallery = lazy(() => import('./pages/Gallery'))
const MakeYourOwnPackage = lazy(() => import('./pages/MakeYourOwnPackage'))

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/book" element={<BookingRequest />} />
            <Route
              path="/landing"
              element={
                <Suspense fallback={null}>
                  <Landing />
                </Suspense>
              }
            />
            <Route
              path="/gallery"
              element={
                <Suspense fallback={null}>
                  <PublicGallery />
                </Suspense>
              }
            />
            <Route
              path="/wedding-quote"
              element={
                <Suspense fallback={null}>
                  <MakeYourOwnPackage eventCategory="wedding" />
                </Suspense>
              }
            />
            <Route
              path="/debut-quote"
              element={
                <Suspense fallback={null}>
                  <MakeYourOwnPackage eventCategory="debut" />
                </Suspense>
              }
            />

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
                <Route path="/admin/soft-reserves" element={<SoftReserves />} />
                <Route path="/admin/gallery" element={<AdminGallery />} />
                <Route path="/admin/chatbot-settings" element={<ChatbotSettings />} />
                <Route path="/admin/messenger-bot" element={<MessengerBot />} />
                <Route path="/admin/staff" element={<StaffManagement />} />
                <Route path="/admin/attendance" element={<Attendance />} />
                <Route path="/admin/payroll" element={<AdminPayroll />} />
                <Route path="/admin/payroll/:reportId" element={<AdminPayrollDetail />} />
                <Route path="/admin/reports" element={<Reports />} />
                <Route path="/admin/settings" element={<Settings />} />
                <Route path="/admin/addon-catalog" element={<AddonCatalog />} />
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
                <Route path="/staff/driver-schedule" element={<DriverSchedule />} />
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
            <Route path="/rsvp/:slug" element={<RsvpPublic />} />

            <Route path="/my-event/login" element={<ClientPortalLogin />} />

            <Route element={<RequireClientMember />}>
              <Route element={<ClientPortalLayout />}>
                <Route path="/my-event" element={<ClientDashboard />} />
                <Route path="/my-event/checklist" element={<ClientChecklist />} />
                <Route path="/my-event/guests" element={<ClientGuests />} />
                <Route path="/my-event/budget" element={<ClientBudget />} />
                <Route path="/my-event/payments" element={<ClientPayments />} />
                <Route path="/my-event/vendors" element={<ClientVendors />} />
                <Route path="/my-event/entourage" element={<ClientEntourage />} />
                <Route path="/my-event/program" element={<ClientProgram />} />
                <Route path="/my-event/menu" element={<ClientMenu />} />
                <Route path="/my-event/styling" element={<ClientMoodBoard />} />
                <Route path="/my-event/seating" element={<ClientSeating />} />
                <Route path="/my-event/requirements" element={<ClientRequirements />} />
                <Route path="/my-event/songs" element={<ClientSongs />} />
                <Route path="/my-event/add-ons" element={<ClientAddOns />} />
                <Route path="/my-event/gifts" element={<ClientGifts />} />
                <Route path="/my-event/documents" element={<ClientDocuments />} />
                <Route path="/my-event/messages" element={<ClientMessages />} />
                <Route path="/my-event/gallery" element={<ClientEventGallery />} />
                <Route path="/my-event/feedback" element={<ClientFeedback />} />
              </Route>
            </Route>

            <Route path="/attendance/home" element={<HomeCheckin />} />
            <Route path="/attendance/event/:qr_token" element={<EventCheckin />} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  )
}

export default App
