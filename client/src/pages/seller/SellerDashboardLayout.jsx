
import {
  Alert,
  Avatar,
  Box,
  Button,
  CircularProgress,
  Divider,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Paper,
  Stack,
  Typography,
  Chip,
  Tooltip,
} from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import { toggleTheme } from '../../features/theme/themeSlice';

import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined';
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';
import ArrowBackOutlinedIcon from '@mui/icons-material/ArrowBackOutlined';
import RefreshOutlinedIcon from '@mui/icons-material/RefreshOutlined';
import StoreMallDirectoryOutlinedIcon from '@mui/icons-material/StoreMallDirectoryOutlined';

import {
  NavLink,
  Outlet,
  Link as RouterLink,
  useLocation,
} from 'react-router-dom';

import { useGetMySellerApplicationQuery } from '../../services/sellerApi';

const navigationItems = [
  {
    label: 'Overview',
    path: '/seller/overview',
    icon: <DashboardOutlinedIcon />,
  },
  {
    label: 'Products',
    path: '/seller/products',
    icon: <Inventory2OutlinedIcon />,
  },
  {
    label: 'Orders',
    path: '/seller/orders',
    icon: <ShoppingBagOutlinedIcon />,
  },
  {
    label: 'Shop profile',
    path: '/seller/profile',
    icon: <StorefrontOutlinedIcon />,
  },
];

function SellerMessage({ title, subtitle, children }) {
  return (
    <Box
      sx={{
        minHeight: '75vh',
        display: 'grid',
        placeItems: 'center',
        p: { xs: 2, md: 4 },
        bgcolor: 'background.default',
      }}
    >
      <Paper
        variant="outlined"
        sx={{
          width: '100%',
          maxWidth: 520,
          p: { xs: 3, md: 4 },
          borderRadius: 4,
        }}
      >
        <Stack spacing={2.5}>
          <Box
            sx={{
              width: 54,
              height: 54,
              display: 'grid',
              placeItems: 'center',
              borderRadius: 3,
              bgcolor: 'action.hover',
              color: 'primary.main',
            }}
          >
            <StoreMallDirectoryOutlinedIcon fontSize="large" />
          </Box>

          <Box>
            <Typography
              variant="h5"
              component="h1"
              fontWeight={800}
              gutterBottom
            >
              {title}
            </Typography>

            {subtitle && (
              <Typography color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>

          {children}
        </Stack>
      </Paper>
    </Box>
  );
}

function LoadingScreen() {
  return (
    <Box
      sx={{
        minHeight: '70vh',
        display: 'grid',
        placeItems: 'center',
      }}
    >
      <Stack alignItems="center" spacing={2}>
        <CircularProgress size={38} />
        <Typography color="text.secondary">
          Loading your seller dashboard...
        </Typography>
      </Stack>
    </Box>
  );
}

function SellerNavigation({ mobile = false }) {
  const location = useLocation();

  return (
    <List
      disablePadding
      sx={{
        display: mobile ? 'flex' : 'block',
        gap: 0.75,
        overflowX: mobile ? 'auto' : 'visible',
        pb: mobile ? 0.5 : 0,
      }}
    >
      {navigationItems.map((item) => {
        const active =
          location.pathname === item.path ||
          (item.path !== '/seller/overview' &&
            location.pathname.startsWith(`${item.path}/`));

        return (
          <ListItemButton
            key={item.path}
            component={NavLink}
            to={item.path}
            selected={active}
            sx={{
              borderRadius: 2,
              px: 1.5,
              py: 1.2,
              minWidth: mobile ? 'max-content' : 'auto',
              color: active ? 'primary.main' : 'text.secondary',
              bgcolor: active ? 'action.selected' : 'transparent',
              '&:hover': {
                bgcolor: 'action.hover',
              },
              '&.active': {
                bgcolor: 'action.selected',
                color: 'primary.main',
              },
            }}
          >
            <ListItemIcon
              sx={{
                minWidth: 38,
                color: 'inherit',
              }}
            >
              {item.icon}
            </ListItemIcon>

            <ListItemText
              primary={item.label}
              primaryTypographyProps={{
                fontWeight: active ? 700 : 500,
                fontSize: 14,
                whiteSpace: 'nowrap',
              }}
            />
          </ListItemButton>
        );
      })}
    </List>
  );
}

export default function SellerDashboardLayout() {
  const dispatch = useDispatch();
  const themeMode = useSelector((state) => state.theme.mode);
  const nextMode = themeMode === 'light' ? 'dark' : 'light';

  const {
    data: seller,
    isLoading,
    isError,
    error,
    refetch,
  } = useGetMySellerApplicationQuery();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (isError) {
    const message =
      error?.data?.message ||
      'We could not load your seller account. Please try again.';

    return (
      <SellerMessage
        title="Seller account unavailable"
        subtitle="We encountered a problem retrieving your seller information."
      >
        <Alert severity="error">{message}</Alert>

        <Stack direction="row" spacing={1} flexWrap="wrap">
          <Button
            variant="contained"
            onClick={refetch}
            startIcon={<RefreshOutlinedIcon />}
          >
            Try again
          </Button>

          {error?.status === 401 && (
            <Button component={RouterLink} to="/login">
              Sign in
            </Button>
          )}
        </Stack>
      </SellerMessage>
    );
  }

  if (!seller) {
    return (
      <SellerMessage
        title="Start selling on 2 Valid"
        subtitle="Create a seller account to manage products, orders and your shop."
      >
        <Button
          component={RouterLink}
          to="/seller/apply"
          variant="contained"
          sx={{ alignSelf: 'flex-start' }}
        >
          Apply to become a seller
        </Button>
      </SellerMessage>
    );
  }

  if (seller.status === 'pending') {
    return (
      <SellerMessage
        title="Application under review"
        subtitle="Your seller application has been submitted successfully."
      >
        <Alert severity="info">
          Our team is reviewing your application. You'll be able to manage
          products and orders once your account is approved.
        </Alert>

        <Stack direction="row" spacing={1} flexWrap="wrap">
          <Button onClick={refetch} startIcon={<RefreshOutlinedIcon />}>
            Refresh status
          </Button>

          <Button
            component={RouterLink}
            to="/seller/application-status"
          >
            View application
          </Button>
        </Stack>
      </SellerMessage>
    );
  }

  if (seller.status === 'rejected') {
    return (
      <SellerMessage
        title="Your application needs attention"
        subtitle="Review the feedback and update your application."
      >
        <Alert severity="warning">
          {seller.rejectionReason ||
            'Your application was not approved. Review your details and resubmit.'}
        </Alert>

        <Button
          component={RouterLink}
          to="/seller/apply"
          variant="contained"
          sx={{ alignSelf: 'flex-start' }}
        >
          Review and resubmit
        </Button>
      </SellerMessage>
    );
  }

  if (seller.status === 'suspended') {
    return (
      <SellerMessage
        title="Seller access suspended"
        subtitle="Your seller dashboard is currently unavailable."
      >
        <Alert severity="warning">
          You cannot manage products or orders while your seller account is
          suspended. Please contact the marketplace support team.
        </Alert>

        <Button
          component={RouterLink}
          to="/seller/application-status"
        >
          View account status
        </Button>
      </SellerMessage>
    );
  }

  if (seller.status !== 'approved') {
    return (
      <SellerMessage
        title="Seller status unavailable"
        subtitle="We could not identify the current status of your seller account."
      >
        <Alert severity="warning">
          Refresh your account information or contact support if the problem
          continues.
        </Alert>

        <Button onClick={refetch} startIcon={<RefreshOutlinedIcon />}>
          Refresh status
        </Button>
      </SellerMessage>
    );
  }

  const shopName = seller.shopName || seller.companyName || 'My Store';

  const initials = shopName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
      }}
    >
      {/* Dashboard header */}
      <Box
        component="header"
        sx={{
          position: 'sticky',
          top: 0,
          zIndex: 1100,
          bgcolor: 'background.paper',
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Box
          sx={{
            maxWidth: 1600,
            mx: 'auto',
            px: { xs: 2, md: 4 },
            py: 1.75,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Avatar
              sx={{
                width: 44,
                height: 44,
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                fontWeight: 800,
              }}
            >
              {initials}
            </Avatar>

            <Box>
              <Typography variant="subtitle1" fontWeight={800}>
                {shopName}
              </Typography>

              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="caption" color="text.secondary">
                  2 Valid Seller Centre
                </Typography>

                <Chip
                  label="Approved"
                  size="small"
                  color="success"
                  variant="outlined"
                  sx={{ height: 21, fontWeight: 700 }}
                />
              </Stack>
            </Box>
          </Stack>

          <Stack direction="row" spacing={1} alignItems="center">
          <Tooltip title={`Switch to ${nextMode} mode`}>
            <IconButton
              onClick={() => dispatch(toggleTheme())}
              aria-label={`Switch to ${nextMode} mode`}
              sx={{ border: 1, borderColor: 'divider', borderRadius: 2 }}
            >
              {themeMode === 'light' ? (
                <DarkModeOutlinedIcon fontSize="small" />
              ) : (
                <LightModeOutlinedIcon fontSize="small" />
              )}
            </IconButton>
          </Tooltip>

          <Button
            component={RouterLink}
            to="/"
            variant="outlined"
            size="small"
            startIcon={<ArrowBackOutlinedIcon />}
            sx={{ borderRadius: 2 }}
          >
            <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>
              Back to shop
            </Box>
            <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>
              Shop
            </Box>
          </Button>
          </Stack>
        </Box>
      </Box>

      {/* Dashboard body */}
      <Box
        sx={{
          maxWidth: 1600,
          mx: 'auto',
          px: { xs: 2, md: 4 },
          py: { xs: 2.5, md: 4 },
          display: 'grid',
          gridTemplateColumns: {
            xs: '1fr',
            md: '230px minmax(0, 1fr)',
          },
          gap: { xs: 2, md: 3 },
          alignItems: 'start',
        }}
      >
        {/* Desktop sidebar */}
        <Paper
          component="aside"
          variant="outlined"
          sx={{
            display: { xs: 'none', md: 'block' },
            p: 1.5,
            borderRadius: 3,
            position: 'sticky',
            top: 100,
          }}
        >
          <Typography
            variant="overline"
            color="text.secondary"
            fontWeight={700}
            sx={{ px: 1.5, display: 'block', mb: 1 }}
          >
            SELLER MENU
          </Typography>

          <SellerNavigation />
        </Paper>

        {/* Main content */}
        <Box component="main" sx={{ minWidth: 0 }}>
          {/* Mobile navigation */}
          <Paper
            component="nav"
            aria-label="Seller navigation"
            variant="outlined"
            sx={{
              display: { xs: 'block', md: 'none' },
              p: 1,
              mb: 2.5,
              borderRadius: 3,
            }}
          >
            <SellerNavigation mobile />
          </Paper>

          {/* Page heading */}
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            alignItems={{ xs: 'flex-start', sm: 'center' }}
            justifyContent="space-between"
            spacing={1}
            sx={{ mb: 3 }}
          >
            <Box>
              <Typography variant="h5" fontWeight={800}>
                Seller workspace
              </Typography>

              <Typography variant="body2" color="text.secondary">
                Manage your store and marketplace activity.
              </Typography>
            </Box>
          </Stack>

          <Divider sx={{ mb: 3 }} />

          <Outlet context={{ seller }} />
        </Box>
      </Box>
    </Box>
  );
}
