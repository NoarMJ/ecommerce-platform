
import { Box } from '@mui/material'
import { Route, Routes } from 'react-router-dom'

import Navbar from './components/Navbar'
import FloatingCart from './components/FloatingCart'
import RequireAuth from './components/RequireAuth'
import RequireAdmin from './components/RequireAdmin'

import HomePage from './pages/HomePage'
import ProductsPage from './pages/ProductsPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ProductDetailsPage from './pages/ProductDetailsPage'
import CartPage from './pages/CartPage'
import AdminDashboard from './pages/admin/AdminDashboard'

import CheckoutPage from './pages/CheckoutPage'
import OrderConfirmationPage from './pages/OrderConfirmationPage'
import MyOrdersPage from './pages/MyOrdersPage'
import OrderPaymentPage from './pages/OrderPaymentPage'
import SellerOverview from './pages/seller/SellerOverview'
import SellerDashboardLayout from './pages/seller/SellerDashboardLayout'
import { Navigate } from 'react-router-dom'
import SellerApplicationPage from './pages/seller/SellerApplicationPage'
import SellerLandingPage from './pages/seller/SellerLandingPage'
import SellerApplicationStatus from './pages/seller/SellerApplicationStatus'
import SellerProducts from './pages/seller/SellerProducts'
import SellerProductForm from './pages/seller/SellerProductForm'
import SellerOrders from './pages/seller/SellerOrders'
import SellerProfile from './pages/seller/SellerProfile'


function CustomerLayout({ children }) {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Navbar />
      {children}
      <FloatingCart />
    </Box>
  )
}

export default function App() {
  return (
    <Routes>
      {/* Customer-facing pages */}
      <Route
        path="/"
        element={
          <CustomerLayout>
            <HomePage />
          </CustomerLayout>
        }
      />

      <Route
        path="/products"
        element={
          <CustomerLayout>
            <ProductsPage />
          </CustomerLayout>
        }
      />

      <Route
        path="/products/:slug"
        element={
          <CustomerLayout>
            <ProductDetailsPage />
          </CustomerLayout>
        }
      />

      <Route
        path="/cart"
        element={
          <CustomerLayout>
            <CartPage />
          </CustomerLayout>
        }
      />

      <Route
        path="/login"
        element={
          <CustomerLayout>
            <LoginPage />
          </CustomerLayout>
        }
      />

      <Route
        path="/register"
        element={
          <CustomerLayout>
            <RegisterPage />
          </CustomerLayout>
        }
      />
      <Route
        path="/checkout"
        element={
          <RequireAuth>
            <CustomerLayout>
              <CheckoutPage />
            </CustomerLayout>
          </RequireAuth>
        }
      />

      <Route
        path="/orders/:orderId/confirmation"
        element={
          <RequireAuth>
            <CustomerLayout>
              <OrderConfirmationPage />
            </CustomerLayout>
          </RequireAuth>
        }
      />

      <Route
        path="/my-orders"
        element={
          <RequireAuth>
            <CustomerLayout>
              <MyOrdersPage />
            </CustomerLayout>
          </RequireAuth>
        }
      />

      <Route
        path="/orders/:orderId/payment"
        element={
          <RequireAuth>
            <CustomerLayout>
              <OrderPaymentPage />
            </CustomerLayout>
          </RequireAuth>
        }
      />

      {/* Separate admin experience */}
      <Route
        path="/admin/*"
        element={
          <RequireAuth>
            <RequireAdmin>
              <AdminDashboard />
            </RequireAdmin>
          </RequireAuth>
        }
      />
{/*seller experience  */}

      <Route
        path="/seller"
        element={
          <RequireAuth>
            <SellerDashboardLayout />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="overview" replace />} />
        <Route path="overview" element={<SellerOverview />} />
        <Route path="products" element={<SellerProducts />} />
        <Route path="products/new" element={<SellerProductForm />} />
        <Route path="products/:id/edit" element={<SellerProductForm />} />
        <Route path="orders" element={<SellerOrders />} />
        <Route path="profile" element={<SellerProfile />} />
      </Route>

      <Route
        path="/seller/dashboard"
        element={
          <RequireAuth>
            <Navigate to="/seller" replace />
          </RequireAuth>
        }
      />

      <Route
        path="/seller/apply"
        element={
          <RequireAuth>
            <CustomerLayout>
              <SellerApplicationPage />
            </CustomerLayout>
          </RequireAuth>
        }
      />

      <Route path="/seller/lp" element={<SellerLandingPage />} />

      <Route
        path="/sellers/products"
        element={<Navigate to="/seller/products" replace />}
      />

      <Route
        path="/seller/application-status"
        element={
          <RequireAuth>
            <SellerApplicationStatus />
          </RequireAuth>
        }
      />
      
    </Routes>

    
  )
}
