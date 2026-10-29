
import { useState } from 'react'
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom'
import {
  AppBar,
  Badge,
  Box,
  Button,
  Collapse,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Menu,
  MenuItem,
  Toolbar,
  Typography,
} from '@mui/material'

import MenuIcon from '@mui/icons-material/Menu'
import CloseIcon from '@mui/icons-material/Close'
import AccountCircleOutlinedIcon from '@mui/icons-material/AccountCircleOutlined'
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined'
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined'
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined'
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined'
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined'

import { useDispatch, useSelector } from 'react-redux'
import {
  api,
  useGetCategoriesQuery,
  useGetCartQuery,
  useGetMeQuery,
  useLogoutMutation,
} from '../services/api'
import { toggleTheme } from '../features/theme/themeSlice'

// Liquid-glass surface, aware of light/dark mode.
const glassBarSx = (theme) => {
  const dark = theme.palette.mode === 'dark'

  return {
    '--lg-blur': '20px',
    '--lg-saturate': 1.6,
    isolation: 'isolate',
    overflow: 'hidden',
    color: 'text.primary',

    backgroundColor: dark
      ? 'rgba(18, 25, 40, 0.55)'
      : 'rgba(255, 255, 255, 0.45)',

    backdropFilter: 'blur(var(--lg-blur)) saturate(var(--lg-saturate))',
    WebkitBackdropFilter: 'blur(var(--lg-blur)) saturate(var(--lg-saturate))',

    border: '1px solid',
    borderColor: dark
      ? 'rgba(255,255,255,0.14)'
      : 'rgba(255,255,255,0.55)',

    boxShadow: dark
      ? '0 10px 36px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -1px 0 rgba(255,255,255,0.05)'
      : '0 10px 36px rgba(30,40,60,0.12), inset 0 1px 0 rgba(255,255,255,0.8), inset 0 -1px 0 rgba(255,255,255,0.25)',

    transition: 'background-color .25s ease, box-shadow .25s ease',

    '&::before': {
      content: '""',
      position: 'absolute',
      inset: 0,
      borderRadius: 'inherit',
      background: dark
        ? 'linear-gradient(135deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.03) 35%, transparent 55%)'
        : 'linear-gradient(135deg, rgba(255,255,255,0.65) 0%, rgba(255,255,255,0.1) 35%, transparent 55%)',
      pointerEvents: 'none',
      zIndex: -1,
    },

    '&::after': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: '-40%',
      width: '25%',
      height: '100%',
      background: dark
        ? 'linear-gradient(100deg, transparent, rgba(255,255,255,0.10), transparent)'
        : 'linear-gradient(100deg, transparent, rgba(255,255,255,0.55), transparent)',
      transform: 'skewX(-20deg)',
      transition: 'left .9s ease',
      pointerEvents: 'none',
      zIndex: -1,
    },

    '&:hover::after': {
      left: '120%',
    },

    '@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px)))':
      {
        backgroundColor: dark
          ? 'rgba(18, 25, 40, 0.95)'
          : 'rgba(255, 255, 255, 0.95)',
      },

    '@media (prefers-reduced-motion: reduce)': {
      '&::after': {
        transition: 'none',
      },
    },
  }
}

export default function Navbar() {
  const location = useLocation()
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const mode = useSelector((state) => state.theme.mode)

  const {
    data: user,
    isLoading: isAuthLoading,
  } = useGetMeQuery()

  const [logout, { isLoading: isLoggingOut }] = useLogoutMutation()

  const { data: categoryResponse, isLoading: isCategoriesLoading } =
    useGetCategoriesQuery()

  const { data: cartResponse } = useGetCartQuery()

  const [categoryAnchor, setCategoryAnchor] = useState(null)
  const [profileAnchor, setProfileAnchor] = useState(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [mobileCategoriesOpen, setMobileCategoriesOpen] = useState(false)
  const [logoutError, setLogoutError] = useState('')

  const categories = categoryResponse?.data ?? []
  const cart = cartResponse?.data ?? cartResponse
  const cartItems = cart?.items ?? []

  const cartCount = cartItems.reduce(
    (total, item) => total + (Number(item.quantity) || 0),
    0,
  )

  const isHomePage = location.pathname === '/'
  const isProductsPage = location.pathname === '/products'
  const isCartPage = location.pathname === '/cart'
  const isOrdersPage = location.pathname ==='/orders'
  const isCheckoutPage =location.pathname === "/checkout"

  const closeMobile = () => setMobileOpen(false)

  const navButtonSx = (active) => ({
    borderRadius: 3,
    textTransform: 'none',
    fontWeight: active ? 700 : 500,
    color: 'text.primary',
    px: 2,
    backgroundColor: active ? 'rgba(255,255,255,0.35)' : 'transparent',
    boxShadow: active ? 'inset 0 1px 0 rgba(255,255,255,0.6)' : 'none',
    transition: 'background-color .2s ease',
    '&:hover': {
      backgroundColor: 'rgba(255,255,255,0.3)',
    },
  })

  const handleLogout = async () => {
    setLogoutError('')

    try {
      await logout().unwrap()

      // Remove cached user and cart information after the server logs out.
      dispatch(api.util.resetApiState())

      setProfileAnchor(null)
      setCategoryAnchor(null)
      setMobileOpen(false)
      setMobileCategoriesOpen(false)

      navigate('/', { replace: true })
    } catch (error) {
      setLogoutError(
        error?.data?.message || 'Sign out failed. Please try again.',
      )
    }
  }

  const categoryLinks = (
    <>
      <MenuItem
        component={RouterLink}
        to="/products"
        onClick={() => setCategoryAnchor(null)}
      >
        All products
      </MenuItem>

      <Divider />

      {categories.map((category) => (
        <MenuItem
          key={category._id}
          component={RouterLink}
          to={`/products?category=${encodeURIComponent(category.slug)}`}
          onClick={() => setCategoryAnchor(null)}
        >
          {category.name}
        </MenuItem>
      ))}

      {!isCategoriesLoading && categories.length === 0 && (
        <MenuItem disabled>No categories available</MenuItem>
      )}
    </>
  )

  const accountControls = (
    <>
      {isAuthLoading ? null : user ? (
        <>
          <Button
            onClick={(event) => setProfileAnchor(event.currentTarget)}
            startIcon={<AccountCircleOutlinedIcon />}
            endIcon={<KeyboardArrowDownIcon />}
            sx={navButtonSx(Boolean(profileAnchor))}
            aria-haspopup="menu"
            aria-expanded={Boolean(profileAnchor)}
          >
            {user.name || user.firstName || 'My account'}
          </Button>

          <Menu
            anchorEl={profileAnchor}
            open={Boolean(profileAnchor)}
            onClose={() => setProfileAnchor(null)}
            slotProps={{
              paper: {
                sx: {
                  minWidth: 210,
                  mt: 1,
                  borderRadius: 3,
                },
              },
            }}
          >
            {user.role === 'admin' && (
              <MenuItem
                component={RouterLink}
                to="/admin"
                onClick={() => setProfileAnchor(null)}
              >
                <AdminPanelSettingsOutlinedIcon sx={{ mr: 1.5 }} />
                Admin dashboard
              </MenuItem>
            )}

            <MenuItem
              onClick={handleLogout}
              disabled={isLoggingOut}
            >
              <LogoutOutlinedIcon sx={{ mr: 1.5 }} />
              {isLoggingOut ? 'Signing out…' : 'Sign out'}
            </MenuItem>
          </Menu>
        </>
      ) : (
        <>
          <Button
            component={RouterLink}
            to="/login"
            sx={navButtonSx(location.pathname === '/login')}
          >
            Sign in
          </Button>
        </>
      )}
    </>
  )

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={[
        {
          top: '8px',
          mx: 'auto',
          width: { xs: 'calc(100% - 16px)', md: 'calc(100% - 40px)' },
          maxWidth: '1400px',
          borderRadius: '24px',
        },
        glassBarSx,
      ]}
    >
      <Toolbar
        sx={{
          minHeight: { xs: 60, md: 68 },
          px: { xs: 1.5, md: 3 },
          maxWidth: 1440,
          width: '100%',
          mx: 'auto',
          gap: 2,
        }}
      >
        {/* Brand */}
        <Box
          component={RouterLink}
          to="/"
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            color: 'text.primary',
            textDecoration: 'none',
            mr: { xs: 'auto', md: 2 },
          }}
        >
          <StorefrontOutlinedIcon color="primary" fontSize="large" />
          <Typography variant="h6" fontWeight={800}>
            2 Valid
          </Typography>
        </Box>

        {/* Desktop navigation */}
        <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 1 }}>
          <Button
            component={RouterLink}
            to="/"
            sx={navButtonSx(isHomePage)}
          >
            Home
          </Button>

          <Button
            onClick={(event) => setCategoryAnchor(event.currentTarget)}
            endIcon={<KeyboardArrowDownIcon />}
            sx={navButtonSx(Boolean(categoryAnchor))}
          >
            Categories
          </Button>

          <Menu
            anchorEl={categoryAnchor}
            open={Boolean(categoryAnchor)}
            onClose={() => setCategoryAnchor(null)}
            slotProps={{
              paper: {
                sx: {
                  minWidth: 220,
                  maxHeight: 'min(65vh, 420px)',
                  overflowY: 'auto',
                  mt: 1,
                  borderRadius: 3,
                },
              },
            }}
          >
            {categoryLinks}
          </Menu>

          <Button
            component={RouterLink}
            to="/products"
            sx={navButtonSx(isProductsPage)}
          >
            Products
          </Button>


           <Button
            component={RouterLink}
            to="/checkout"
            sx={navButtonSx(isCheckoutPage)}
          >
            Checkout
          </Button>

          
          <Button
            component={RouterLink}
            to="/my-orders"
            sx={navButtonSx(isOrdersPage)}
          >
            Orders
          </Button>
        </Box>

        {/* Desktop cart, account and theme controls */}
        <Box
          sx={{
            display: { xs: 'none', md: 'flex' },
            alignItems: 'center',
            gap: 1,
            ml: 'auto',
          }}
        >
          <Button
            component={RouterLink}
            to="/cart"
            startIcon={
              <Badge
                badgeContent={cartCount}
                color="error"
                max={99}
                overlap="circular"
              >
                <ShoppingCartOutlinedIcon />
              </Badge>
            }
            sx={navButtonSx(isCartPage)}
          >
            Cart
          </Button>

          {accountControls}

          <IconButton
            onClick={() => dispatch(toggleTheme())}
            color="inherit"
            aria-label={`Switch to ${mode === 'light' ? 'dark' : 'light'} mode`}
          >
            {mode === 'light' ? (
              <DarkModeOutlinedIcon />
            ) : (
              <LightModeOutlinedIcon />
            )}
          </IconButton>
        </Box>

        {/* Mobile controls */}
        <Box
          sx={{
            display: { xs: 'flex', md: 'none' },
            alignItems: 'center',
            gap: 0.5,
          }}
        >
          <IconButton
            component={RouterLink}
            to="/cart"
            color="inherit"
            aria-label={`Open cart with ${cartCount} items`}
          >
            <Badge badgeContent={cartCount} color="error" max={99}>
              <ShoppingCartOutlinedIcon />
            </Badge>
          </IconButton>

          <IconButton
            onClick={() => dispatch(toggleTheme())}
            color="inherit"
            aria-label="Toggle theme"
          >
            {mode === 'light' ? (
              <DarkModeOutlinedIcon />
            ) : (
              <LightModeOutlinedIcon />
            )}
          </IconButton>

          <IconButton
            onClick={() => setMobileOpen(true)}
            color="inherit"
            aria-label="Open navigation menu"
          >
            <MenuIcon />
          </IconButton>
        </Box>
      </Toolbar>

      {/* Mobile navigation drawer */}
      <Drawer
        anchor="right"
        open={mobileOpen}
        onClose={closeMobile}
        slotProps={{
          paper: {
            sx: {
              width: { xs: '85vw', sm: 340 },
              maxWidth: '100%',
              backgroundColor: 'background.paper',
            },
          },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', p: 2 }}>
          <Typography variant="h6" fontWeight={800} sx={{ flexGrow: 1 }}>
            2 Valid
          </Typography>

          <IconButton
            onClick={closeMobile}
            aria-label="Close navigation menu"
          >
            <CloseIcon />
          </IconButton>
        </Box>

        <Divider />

        <List sx={{ overflowY: 'auto', flex: 1 }}>
          <ListItemButton
            component={RouterLink}
            to="/"
            selected={isHomePage}
            onClick={closeMobile}
          >
            <ListItemText primary="Home" />
          </ListItemButton>

          <ListItemButton
            component={RouterLink}
            to="/products"
            selected={isProductsPage}
            onClick={closeMobile}
          >
            <ListItemText primary="All products" />
          </ListItemButton>

          <ListItemButton
            component={RouterLink}
            to="/cart"
            selected={isCartPage}
            onClick={closeMobile}
          >
            <ShoppingCartOutlinedIcon sx={{ mr: 2 }} />
            <ListItemText primary="Cart" />

            {cartCount > 0 && (
              <Badge
                badgeContent={cartCount}
                color="error"
                max={99}
                sx={{ mr: 2 }}
              />
            )}
          </ListItemButton>

          <ListItemButton
            onClick={() => setMobileCategoriesOpen((open) => !open)}
          >
            <ListItemText primary="Shop by category" />

            <KeyboardArrowDownIcon
              sx={{
                transform: mobileCategoriesOpen ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.2s',
              }}
            />
          </ListItemButton>

          <Collapse in={mobileCategoriesOpen} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {categories.map((category) => (
                <ListItemButton
                  key={category._id}
                  component={RouterLink}
                  to={`/products?category=${encodeURIComponent(category.slug)}`}
                  onClick={closeMobile}
                  sx={{ pl: 4 }}
                >
                  <ListItemText primary={category.name} />
                </ListItemButton>
              ))}

              {!isCategoriesLoading && categories.length === 0 && (
                <ListItemButton disabled sx={{ pl: 4 }}>
                  <ListItemText primary="No categories available" />
                </ListItemButton>
              )}
            </List>
          </Collapse>

          <Divider sx={{ my: 1 }} />

          {isAuthLoading ? null : user ? (
            <>
              <ListItemButton disabled>
                <AccountCircleOutlinedIcon sx={{ mr: 2 }} />
                <ListItemText
                  primary={user.name || user.firstName || 'My account'}
                  secondary="Signed in"
                />
              </ListItemButton>

              {user.role === 'admin' && (
                <ListItemButton
                  component={RouterLink}
                  to="/admin"
                  onClick={closeMobile}
                >
                  <AdminPanelSettingsOutlinedIcon sx={{ mr: 2 }} />
                  <ListItemText primary="Admin dashboard" />
                </ListItemButton>
              )}

              <ListItemButton
                onClick={handleLogout}
                disabled={isLoggingOut}
              >
                <LogoutOutlinedIcon sx={{ mr: 2 }} />
                <ListItemText
                  primary={isLoggingOut ? 'Signing out…' : 'Sign out'}
                />
              </ListItemButton>
            </>
          ) : (
            <>
              <ListItemButton
                component={RouterLink}
                to="/login"
                selected={location.pathname === '/login'}
                onClick={closeMobile}
              >
                <ListItemText primary="Sign in" />
              </ListItemButton>

              <ListItemButton
                component={RouterLink}
                to="/register"
                onClick={closeMobile}
              >
                <ListItemText primary="Create an account" />
              </ListItemButton>
            </>
          )}
        </List>

        {logoutError && (
          <Box sx={{ p: 2 }}>
            <Typography color="error" variant="body2">
              {logoutError}
            </Typography>
          </Box>
        )}
      </Drawer>
    </AppBar>
  )
}
