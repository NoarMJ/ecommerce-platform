
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
    </Routes>
  )
}
