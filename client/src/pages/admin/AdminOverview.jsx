
import {
  Alert,
  Avatar,
  Box,
  Card,
  CardContent,
  CircularProgress,
  Grid,
  Paper,
  Stack,
  Typography,
} from '@mui/material'
import DashboardCustomizeOutlinedIcon from '@mui/icons-material/DashboardCustomizeOutlined'
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined'
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined'
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined'

import {
  useGetProductsQuery,
  useGetCategoriesQuery,
} from '../../services/api'

function StatCard({ title, value, description, icon: Icon, accent }) {
  return (
    <Card
      variant="outlined"
      sx={{
        height: '100%',
        borderColor: '#E7EAF0',
        borderRadius: 3,
        bgcolor: '#FFFFFF',
        transition: 'border-color 180ms ease, box-shadow 180ms ease, transform 180ms ease',
        '&:hover': {
          borderColor: '#CBD5E1',
          boxShadow: '0 8px 24px rgba(15, 23, 42, 0.06)',
          transform: 'translateY(-2px)',
        },
      }}
    >
      <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" spacing={2}>
          <Box sx={{ minWidth: 0 }}>
            <Typography fontSize={13} color="text.secondary" fontWeight={600}>
              {title}
            </Typography>
            <Typography
              sx={{
                mt: 1.5,
                fontSize: { xs: 25, sm: 29 },
                fontWeight: 800,
                letterSpacing: '-0.8px',
                lineHeight: 1.2,
                color: '#111827',
                overflowWrap: 'anywhere',
              }}
            >
              {value}
            </Typography>
            <Typography
              sx={{ mt: 1, fontSize: 12, color: 'text.secondary', lineHeight: 1.6 }}
            >
              {description}
            </Typography>
          </Box>

          <Avatar
            variant="rounded"
            sx={{
              width: 44,
              height: 44,
              bgcolor: accent.bg,
              color: accent.color,
              borderRadius: 2.5,
            }}
          >
            <Icon fontSize="small" />
          </Avatar>
        </Stack>
      </CardContent>
    </Card>
  )
}

export default function AdminOverview({ user }) {
  const {
    data: productsResponse,
    isLoading: productsLoading,
    error: productsError,
  } = useGetProductsQuery()

  const {
    data: categoriesResponse,
    isLoading: categoriesLoading,
    error: categoriesError,
  } = useGetCategoriesQuery()

  const products = productsResponse?.data ?? []
  const categories = categoriesResponse?.data ?? []

  const productCount =
    productsResponse?.pagination?.total ??
    productsResponse?.total ??
    products.length

  const categoryCount =
    categoriesResponse?.pagination?.total ??
    categoriesResponse?.total ??
    categories.length

  const statsLoading = productsLoading || categoriesLoading
  const statsError = productsError || categoriesError

  const displayName =
    user?.firstName?.trim() || 'Administrator'

  return (
    <Stack spacing={3}>
      <Box>
        <Typography
          sx={{
            color: '#64748B',
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: 1,
            textTransform: 'uppercase',
          }}
        >
          Dashboard
        </Typography>

        <Typography
          sx={{
            mt: 0.75,
            fontSize: { xs: 25, sm: 30 },
            fontWeight: 800,
            letterSpacing: '-0.8px',
            color: '#111827',
          }}
        >
          Welcome back, {displayName}
        </Typography>

        <Typography sx={{ mt: 1, color: 'text.secondary', fontSize: 14 }}>
          Here’s an overview of your marketplace administration workspace.
        </Typography>
      </Box>

      {statsError && (
        <Alert severity="warning">
          Some marketplace statistics could not be loaded. You can still use the available sections.
        </Alert>
      )}

      {statsLoading && (
        <Stack direction="row" spacing={1.5} alignItems="center">
          <CircularProgress size={18} />
          <Typography fontSize={13} color="text.secondary">
            Loading marketplace statistics…
          </Typography>
        </Stack>
      )}

      <Grid container spacing={2.5}>
        <Grid item xs={12} sm={6} xl={4}>
          <StatCard
            title="Products"
            value={statsLoading ? '—' : productCount}
            description="Products reported by the catalogue API"
            icon={Inventory2OutlinedIcon}
            accent={{ bg: '#DBEAFE', color: '#1D4ED8' }}
          />
        </Grid>

        <Grid item xs={12} sm={6} xl={4}>
          <StatCard
            title="Categories"
            value={statsLoading ? '—' : categoryCount}
            description="Categories reported by the catalogue API"
            icon={CategoryOutlinedIcon}
            accent={{ bg: '#D1FAE5', color: '#047857' }}
          />
        </Grid>

        <Grid item xs={12} sm={6} xl={4}>
          <StatCard
            title="Account role"
            value={user?.isPrimaryAdmin ? 'Primary admin' : 'Administrator'}
            description={
              user?.isPrimaryAdmin
                ? 'Full administrative access'
                : `${user?.permissions?.length ?? 0} assigned permissions`
            }
            icon={ShieldOutlinedIcon}
            accent={{ bg: '#EDE9FE', color: '#6D28D9' }}
          />
        </Grid>
      </Grid>

      <Paper
        variant="outlined"
        sx={{
          p: { xs: 2.5, md: 3 },
          borderColor: '#E7EAF0',
          borderRadius: 3,
          bgcolor: '#FFFFFF',
        }}
      >
        <Stack direction="row" alignItems="flex-start" spacing={2}>
          <Avatar
            variant="rounded"
            sx={{
              bgcolor: '#EFF6FF',
              color: '#2563EB',
              width: 44,
              height: 44,
              borderRadius: 2.5,
            }}
          >
            <DashboardCustomizeOutlinedIcon />
          </Avatar>

          <Box sx={{ minWidth: 0 }}>
            <Typography fontSize={16} fontWeight={800} color="#111827">
              Your administration workspace
            </Typography>
            <Typography
              sx={{
                mt: 1,
                color: 'text.secondary',
                fontSize: 13,
                lineHeight: 1.8,
              }}
            >
              Use the sidebar to manage the catalogue, review categories, and
              access the administrative tools available to your account.
              Sections that require permissions you do not have will remain
              hidden.
            </Typography>
          </Box>
        </Stack>
      </Paper>

      <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
        Order statistics and recent activity will be added when the order API is ready.
      </Typography>
    </Stack>
  )
}
