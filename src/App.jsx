import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import RequireAdmin from './components/admin/RequireAdmin'
import AdminLayout from './components/admin/AdminLayout'
import RequireStaff from './components/staff/RequireStaff'
import StaffLayout from './components/staff/StaffLayout'
import Home from './pages/Home'
import AdminLogin from './pages/admin/AdminLogin'
import AdminDashboard from './pages/admin/AdminDashboard'
import BookingsList from './pages/admin/BookingsList'
import BookingNew from './pages/admin/BookingNew'
import BookingEdit from './pages/admin/BookingEdit'
import BookingDetail from './pages/admin/BookingDetail'
import MenuManager from './pages/admin/MenuManager'
import ClientsList from './pages/admin/ClientsList'
import ClientDetail from './pages/admin/ClientDetail'
import StaffManagement from './pages/admin/StaffManagement'
import Reports from './pages/admin/Reports'
import Settings from './pages/admin/Settings'
import StaffLogin from './pages/staff/StaffLogin'
import StaffDashboard from './pages/staff/StaffDashboard'
import StaffEventDetail from './pages/staff/StaffEventDetail'
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
                <Route path="/admin/bookings" element={<BookingsList />} />
                <Route path="/admin/bookings/new" element={<BookingNew />} />
                <Route path="/admin/bookings/:id" element={<BookingDetail />} />
                <Route path="/admin/bookings/:id/edit" element={<BookingEdit />} />
                <Route path="/admin/menu" element={<MenuManager />} />
                <Route path="/admin/clients" element={<ClientsList />} />
                <Route path="/admin/clients/:id" element={<ClientDetail />} />
                <Route path="/admin/staff" element={<StaffManagement />} />
                <Route path="/admin/reports" element={<Reports />} />
                <Route path="/admin/settings" element={<Settings />} />
              </Route>
            </Route>

            <Route path="/staff/login" element={<StaffLogin />} />

            <Route element={<RequireStaff />}>
              <Route element={<StaffLayout />}>
                <Route path="/staff/dashboard" element={<StaffDashboard />} />
                <Route path="/staff/event/:id" element={<StaffEventDetail />} />
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
