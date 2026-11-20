
import { Link as RouterLink, useOutletContext } from 'react-router-dom';

import {
  Alert,
  Box,
  Button,
  Grid,
  Paper,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';

import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined';
import PendingActionsOutlinedIcon from '@mui/icons-material/PendingActionsOutlined';
import AddBoxOutlinedIcon from '@mui/icons-material/AddBoxOutlined';
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

import {
  useGetSellerOrdersQuery,
  useGetSellerProductsQuery,
} from '../../services/sellerApi';

// Reusable statistics card
function StatCard({
  label,
  value,
  description,
  icon,
  loading,
  accent,
}) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2.5,
        height: '100%',
        borderRadius: 3,
        transition: 'all 0.2s ease',
        '&:hover': {
          boxShadow: 2,
          transform: 'translateY(-3px)',
        },
      }}
    >
      <Stack spacing={2}>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
        >
          <Typography variant="body2" color="text.secondary" fontWeight={600}>
            {label}
          </Typography>

          <Box
            sx={{
              width: 42,
              height: 42,
              borderRadius: 2,
              display: 'grid',
              placeItems: 'center',
              bgcolor: 'action.hover',
              color: `${accent}.main`,
            }}
          >
            {icon}
          </Box>
        </Stack>

        {loading ? (
          <Skeleton variant="text" width="45%" height={48} />
        ) : (
          <Typography variant="h4" fontWeight={800}>
            {value ?? '—'}
          </Typography>
        )}

        <Typography variant="caption" color="text.secondary">
          {description}
        </Typography>
      </Stack>
    </Paper>
  );
}

// Reusable quick action card
function QuickAction({ title, description, icon, to }) {
  return (
    <Paper
      component={RouterLink}
      to={to}
      variant="outlined"
      sx={{
        p: 2.5,
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        textDecoration: 'none',
        color: 'inherit',
        borderRadius: 3,
        transition: 'all 0.2s ease',
        '&:hover': {
          borderColor: 'primary.main',
          bgcolor: 'action.hover',
        },
      }}
    >
      <Box
        sx={{
          width: 46,
          height: 46,
          flexShrink: 0,
          borderRadius: 2,
          display: 'grid',
          placeItems: 'center',
          bgcolor: 'action.hover',
          color: 'primary.main',
        }}
      >
        {icon}
      </Box>

      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <Typography fontWeight={700}>{title}</Typography>

        <Typography variant="body2" color="text.secondary">
          {description}
        </Typography>
      </Box>

      <ArrowForwardIcon color="action" fontSize="small" />
    </Paper>
  );
}

export default function SellerOverview() {
  const { seller } = useOutletContext();

  const approved = seller?.status === 'approved';

  // Fetch dashboard data only for approved sellers
  const products = useGetSellerProductsQuery(
    { limit: 1 },
    { skip: !approved }
  );

  const activeProducts = useGetSellerProductsQuery(
    { limit: 1, isActive: 'true' },
    { skip: !approved }
  );

  const orders = useGetSellerOrdersQuery(
    { limit: 1 },
    { skip: !approved }
  );

  const pendingOrders = useGetSellerOrdersQuery(
    { limit: 1, status: 'pending' },
    { skip: !approved }
  );

  const shopName =
    seller?.shopName || seller?.companyName || 'Your store';

  const queryError =
    products.isError ||
    activeProducts.isError ||
    orders.isError ||
    pendingOrders.isError;

  const initialLoading =
    products.isLoading ||
    activeProducts.isLoading ||
    orders.isLoading ||
    pendingOrders.isLoading;

  const stats = [
    {
      label: 'Total products',
      value: products.data?.total,
      description: 'Products in your catalogue',
      icon: <Inventory2OutlinedIcon />,
      accent: 'primary',
      loading: products.isLoading,
    },
    {
      label: 'Active products',
      value: activeProducts.data?.total,
      description: 'Products currently available',
      icon: <CheckCircleIcon />,
      accent: 'success',
      loading: activeProducts.isLoading,
    },
    {
      label: 'Total orders',
      value: orders.data?.total,
      description: 'Orders received by your store',
      icon: <ShoppingBagOutlinedIcon />,
      accent: 'info',
      loading: orders.isLoading,
    },
    {
      label: 'Pending orders',
      value: pendingOrders.data?.total,
      description: 'Orders awaiting processing',
      icon: <PendingActionsOutlinedIcon />,
      accent: 'warning',
      loading: pendingOrders.isLoading,
    },
  ];

  const handleRefresh = () => {
    products.refetch();
    activeProducts.refetch();
    orders.refetch();
    pendingOrders.refetch();
  };

  return (
    <Stack spacing={4}>
      {/* Welcome section */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          alignItems: { xs: 'flex-start', sm: 'center' },
          justifyContent: 'space-between',
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="h4" fontWeight={800} gutterBottom>
            Welcome back!
          </Typography>

          <Typography color="text.secondary">
            Here's an overview of {shopName} and your store activity.
          </Typography>
        </Box>

        {approved && (
          <Button
            component={RouterLink}
            to="/seller/products/new"
            variant="contained"
            startIcon={<AddBoxOutlinedIcon />}
            sx={{
              borderRadius: 2,
              px: 2.5,
              py: 1.2,
            }}
          >
            Add product
          </Button>
        )}
      </Box>

      {/* Approval status */}
      {!approved ? (
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          Your seller account must be approved before you can manage products
          and orders.
        </Alert>
      ) : (
        <>
          {/* Store statistics */}
          <Box>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              sx={{ mb: 2 }}
            >
              <Box>
                <Typography variant="h6" fontWeight={750}>
                  Store performance
                </Typography>

                <Typography variant="body2" color="text.secondary">
                  A snapshot of your current store activity.
                </Typography>
              </Box>

              <Button
                size="small"
                onClick={handleRefresh}
                disabled={initialLoading}
              >
                Refresh
              </Button>
            </Stack>

            {queryError && (
              <Alert
                severity="error"
                sx={{ mb: 2, borderRadius: 2 }}
                action={
                  <Button
                    color="inherit"
                    size="small"
                    onClick={handleRefresh}
                  >
                    Retry
                  </Button>
                }
              >
                Some dashboard information could not be loaded. Try refreshing.
              </Alert>
            )}

            <Grid container spacing={2}>
              {stats.map((stat) => (
                <Grid key={stat.label} size={{ xs: 12, sm: 6, lg: 3 }}>
                  <StatCard {...stat} />
                </Grid>
              ))}
            </Grid>
          </Box>

          {/* Quick actions */}
          <Box>
            <Typography variant="h6" fontWeight={750} gutterBottom>
              Quick actions
            </Typography>

            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mb: 2 }}
            >
              Manage your store using these shortcuts.
            </Typography>

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, md: 6 }}>
                <QuickAction
                  title="Manage products"
                  description="Add, edit and manage your product catalogue."
                  icon={<Inventory2OutlinedIcon />}
                  to="/seller/products"
                />
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <QuickAction
                  title="Manage orders"
                  description="Review customer orders and update their status."
                  icon={<ShoppingBagOutlinedIcon />}
                  to="/seller/orders"
                />
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <QuickAction
                  title="Add a product"
                  description="List a new product in your store."
                  icon={<AddBoxOutlinedIcon />}
                  to="/seller/products/new"
                />
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <QuickAction
                  title="Seller landing page"
                  description="Visit the 2 Valid seller information page."
                  icon={<StorefrontOutlinedIcon />}
                  to="/seller/lp"
                />
              </Grid>
            </Grid>
          </Box>
        </>
      )}
    </Stack>
  );
}
