
import { useEffect, useState } from 'react'
import {
  Alert,
  Avatar,
  Box,
  CircularProgress,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material'

import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined'
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined'
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined'
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined'
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined'
import MenuOutlinedIcon from '@mui/icons-material/MenuOutlined'
import AccountCircleOutlinedIcon from '@mui/icons-material/AccountCircleOutlined'
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined'
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined'
import ChevronRightOutlinedIcon from '@mui/icons-material/ChevronRightOutlined'

import { useGetMeQuery } from '../../services/api'

import AdminOverview from './AdminOverview'
import AdminProducts from './AdminProducts'
import AdminManagement from './AdminManagement'
import AdminCategories from './AdminCategories'
import AdminOrders from './AdminOrders'

const drawerWidth = 260

const sections = [
  {
    id: 'overview',
    label: 'Overview',
    permission: null,
    icon: DashboardOutlinedIcon,
    group: 'MAIN',
  },
  {
    id: 'products',
    label: 'Products',
    permission: [
      'products.create',
      'products.update',
      'products.deactivate',
    ],
    icon: Inventory2OutlinedIcon,
    group: 'CATALOGUE',
  },
  {
    id: 'categories',
    label: 'Categories',
    permission: [
      'categories.create',
      'categories.update',
      'categories.deactivate',
    ],
    icon: CategoryOutlinedIcon,
    group: 'CATALOGUE',
  },
  {
    id: 'orders',
    label: 'Orders',
    permission: ['orders.read', 'orders.update'],
    icon: ShoppingBagOutlinedIcon,
    group: 'SALES',
  },
  {
    id: 'admins',
    label: 'Administrator accounts',
    permission: ['admins.create'],
    icon: PeopleAltOutlinedIcon,
    group: 'SYSTEM',
  },
]

function getInitials(user) {
  const first = user?.firstName?.trim()?.[0] || ''
  const last = user?.lastName?.trim()?.[0] || ''

  return `${first}${last}`.toUpperCase() || 'AD'
}

function getDisplayName(user) {
  const name = [user?.firstName, user?.lastName]
    .filter(Boolean)
    .join(' ')
    .trim()

  return name || 'Administrator'
}

function AdminNavigation({
  sections: visibleSections,
  activeSection,
  onNavigate,
  onNavigateComplete,
}) {
  let previousGroup = ''

  return (
    <List disablePadding sx={{ px: 1.5, py: 2 }}>
      {visibleSections.map((section) => {
        const Icon = section.icon
        const showGroup = section.group !== previousGroup

        previousGroup = section.group

        return (
          <Box key={section.id}>
            {showGroup && (
              <Typography
                variant="overline"
                sx={{
                  display: 'block',
                  px: 1.5,
                  pt: section.group === 'MAIN' ? 0 : 2.5,
                  pb: 1,
                  color: 'rgba(255,255,255,0.48)',
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: 1.4,
                }}
              >
                {section.group}
              </Typography>
            )}

            <ListItemButton
              selected={activeSection === section.id}
              onClick={() => {
                onNavigate(section.id)
                onNavigateComplete?.()
              }}
              sx={{
                minHeight: 46,
                mb: 0.5,
                px: 1.5,
                borderRadius: 2,
                color:
                  activeSection === section.id
                    ? '#FFFFFF'
                    : 'rgba(255,255,255,0.70)',
                '& .MuiListItemIcon-root': {
                  color: 'inherit',
                  minWidth: 38,
                },
                '&:hover': {
                  bgcolor: 'rgba(255,255,255,0.07)',
                  color: '#FFFFFF',
                },
                '&.Mui-selected': {
                  bgcolor: '#2563EB',
                  color: '#FFFFFF',
                },
                '&.Mui-selected:hover': {
                  bgcolor: '#1D4ED8',
                },
              }}
            >
              <ListItemIcon>
                <Icon fontSize="small" />
              </ListItemIcon>

              <ListItemText
                primary={section.label}
                primaryTypographyProps={{
                  fontSize: 13,
                  fontWeight:
                    activeSection === section.id ? 700 : 500,
                }}
              />

              {activeSection === section.id && (
                <ChevronRightOutlinedIcon
                  sx={{ fontSize: 18, opacity: 0.9 }}
                />
              )}
            </ListItemButton>
          </Box>
        )
      })}
    </List>
  )
}

function SidebarContent({
  user,
  visibleSections,
  activeSection,
  onNavigate,
  onNavigateComplete,
}) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        bgcolor: '#111827',
        color: '#FFFFFF',
      }}
    >
      <Box
        sx={{
          minHeight: 76,
          px: 2.5,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
        }}
      >
        <Box
          sx={{
            width: 40,
            height: 40,
            flexShrink: 0,
            display: 'grid',
            placeItems: 'center',
            borderRadius: 2,
            bgcolor: '#2563EB',
          }}
        >
          <StorefrontOutlinedIcon />
        </Box>

        <Box sx={{ minWidth: 0 }}>
          <Typography fontWeight={800} fontSize={15}>
                2 Valid 
          </Typography>
          <Typography
            sx={{
              fontSize: 11,
              color: 'rgba(255,255,255,0.55)',
            }}
          >
            Administration
          </Typography>
        </Box>
      </Box>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.09)' }} />

      <Box sx={{ flex: 1, overflowY: 'auto' }}>
        <AdminNavigation
          sections={visibleSections}
          activeSection={activeSection}
          onNavigate={onNavigate}
          onNavigateComplete={onNavigateComplete}
        />
      </Box>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.09)' }} />

      <Box
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
        }}
      >
        <Avatar
          sx={{
            width: 38,
            height: 38,
            bgcolor: '#374151',
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          {getInitials(user)}
        </Avatar>

        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            fontSize={12}
            fontWeight={700}
            noWrap
          >
            {getDisplayName(user)}
          </Typography>
          <Typography
            fontSize={11}
            sx={{ color: 'rgba(255,255,255,0.55)' }}
            noWrap
          >
            {user?.isPrimaryAdmin
              ? 'Primary administrator'
              : 'Administrator'}
          </Typography>
        </Box>
      </Box>
    </Box>
  )
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
        <CircularProgress size={32} />
        <Typography color="text.secondary" variant="body2">
          Verifying administrator session…
        </Typography>
      </Stack>
    </Box>
  )
}

function SessionError() {
  return (
    <Box
      sx={{
        maxWidth: 600,
        mx: 'auto',
        mt: 8,
        px: 2,
      }}
    >
      <Alert severity="error">
        Your administrator session could not be verified. Please sign in
        again before accessing the admin workspace.
      </Alert>
    </Box>
  )
}

export default function AdminDashboard() {
  const [activeSection, setActiveSection] = useState('overview')
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)
  const [accountAnchor, setAccountAnchor] = useState(null)

  const {
    data: user,
    isLoading: userLoading,
    error: userError,
  } = useGetMeQuery()

  const isAllowed = (section) => {
    if (!section.permission) return true
    if (user?.isPrimaryAdmin) return true

    return section.permission.some((permission) =>
      (user?.permissions || []).includes(permission),
    )
  }

  const visibleSections = user
    ? sections.filter(isAllowed)
    : []

  const activePage = visibleSections.find(
    (section) => section.id === activeSection,
  )

  useEffect(() => {
    if (!user || user.role !== 'admin') return

    const allowed = sections.filter((section) => {
      if (!section.permission) return true
      if (user.isPrimaryAdmin) return true

      return section.permission.some((permission) =>
        (user.permissions || []).includes(permission),
      )
    })

    if (!allowed.some((section) => section.id === activeSection)) {
      setActiveSection(allowed[0]?.id || 'overview')
    }
  }, [user, activeSection])

  if (userLoading) {
    return <LoadingScreen />
  }

  if (userError || !user || user.role !== 'admin') {
    return <SessionError />
  }

  const handleNavigate = (sectionId) => {
    setActiveSection(sectionId)
  }

  const renderPage = () => {
    switch (activePage?.id) {
      case 'overview':
        return <AdminOverview user={user} />

      case 'products':
        return <AdminProducts user={user} />

      case 'categories':
        return <AdminCategories user={user} />

      case 'orders':
        return <AdminOrders user={user} />

      case 'admins':
        return <AdminManagement user={user} />

      default:
        return (
          <Alert severity="info">
            Select an available section from the navigation.
          </Alert>
        )
    }
  }

  return (
    <Box
      sx={{
        display: 'flex',
        minHeight: '100vh',
        bgcolor: '#F5F7FB',
      }}
    >
      {/* Desktop sidebar */}
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          display: { xs: 'none', md: 'block' },
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            border: 0,
            bgcolor: '#111827',
          },
        }}
      >
        <SidebarContent
          user={user}
          visibleSections={visibleSections}
          activeSection={activeSection}
          onNavigate={handleNavigate}
        />
      </Drawer>

      {/* Mobile sidebar */}
      <Drawer
        variant="temporary"
        open={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            maxWidth: '85vw',
            border: 0,
            bgcolor: '#111827',
          },
        }}
      >
        <SidebarContent
          user={user}
          visibleSections={visibleSections}
          activeSection={activeSection}
          onNavigate={handleNavigate}
          onNavigateComplete={() => setMobileDrawerOpen(false)}
        />
      </Drawer>

      {/* Main workspace */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <Box
          component="header"
          sx={{
            minHeight: 76,
            px: { xs: 2, md: 3.5 },
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
            bgcolor: '#FFFFFF',
            borderBottom: '1px solid #E5E7EB',
            position: 'sticky',
            top: 0,
            zIndex: 10,
          }}
        >
          <Stack
            direction="row"
            alignItems="center"
            spacing={1.5}
            sx={{ minWidth: 0 }}
          >
            <IconButton
              onClick={() => setMobileDrawerOpen(true)}
              aria-label="Open navigation"
              sx={{
                display: { xs: 'inline-flex', md: 'none' },
                color: '#374151',
              }}
            >
              <MenuOutlinedIcon />
            </IconButton>

            <Box sx={{ minWidth: 0 }}>
              <Typography
                variant="h6"
                fontWeight={800}
                noWrap
                sx={{
                  fontSize: { xs: 16, sm: 19 },
                  color: '#111827',
                }}
              >
                {activePage?.label || 'Admin workspace'}
              </Typography>

              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: { xs: 'none', sm: 'block' } }}
              >
                Marketplace / {activePage?.label || 'Overview'}
              </Typography>
            </Box>
          </Stack>

          <Stack direction="row" alignItems="center" spacing={1}>
            <Box
              sx={{
                display: { xs: 'none', sm: 'block' },
                textAlign: 'right',
                mr: 0.5,
              }}
            >
              <Typography
                fontSize={12}
                fontWeight={700}
                color="#111827"
              >
                {getDisplayName(user)}
              </Typography>
              <Typography
                fontSize={11}
                color="text.secondary"
              >
                {user.isPrimaryAdmin ? 'Primary admin' : 'Administrator'}
              </Typography>
            </Box>

            <Tooltip title="Account options">
              <IconButton
                onClick={(event) => setAccountAnchor(event.currentTarget)}
                aria-label="Open account menu"
                aria-controls={accountAnchor ? 'admin-account-menu' : undefined}
                aria-haspopup="true"
                aria-expanded={Boolean(accountAnchor)}
              >
                <Avatar
                  sx={{
                    width: 38,
                    height: 38,
                    bgcolor: '#DBEAFE',
                    color: '#1D4ED8',
                    fontWeight: 800,
                    fontSize: 13,
                  }}
                >
                  {getInitials(user)}
                </Avatar>
              </IconButton>
            </Tooltip>

            <Menu
              id="admin-account-menu"
              anchorEl={accountAnchor}
              open={Boolean(accountAnchor)}
              onClose={() => setAccountAnchor(null)}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'right',
              }}
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              slotProps={{
                paper: {
                  sx: {
                    mt: 1,
                    minWidth: 240,
                    borderRadius: 2.5,
                    border: '1px solid #E5E7EB',
                    boxShadow: '0 12px 35px rgba(15, 23, 42, 0.12)',
                  },
                },
              }}
            >
              <Box sx={{ px: 2, py: 1.5 }}>
                <Typography fontWeight={800} fontSize={13}>
                  {getDisplayName(user)}
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ overflowWrap: 'anywhere' }}
                >
                  {user.email}
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: 'block', mt: 0.5 }}
                >
                  {user.isPrimaryAdmin
                    ? 'Primary administrator'
                    : 'Administrator'}
                </Typography>
              </Box>

              <Divider />

              <MenuItem
                onClick={() => {
                  setAccountAnchor(null)
                  setActiveSection('overview')
                }}
                sx={{ py: 1.25, gap: 1.5 }}
              >
                <AccountCircleOutlinedIcon
                  fontSize="small"
                  color="action"
                />
                Return to overview
              </MenuItem>

              <Divider />

              <MenuItem
                onClick={() => setAccountAnchor(null)}
                sx={{ py: 1.25, gap: 1.5 }}
              >
                <LogoutOutlinedIcon fontSize="small" color="action" />
                Close account menu
              </MenuItem>
            </Menu>
          </Stack>
        </Box>

        {/* Page content */}
        <Box
          sx={{
            width: '100%',
            maxWidth: 1600,
            mx: 'auto',
            p: { xs: 2, sm: 3, lg: 4 },
            flex: 1,
          }}
        >
          {renderPage()}
        </Box>

        {/* Footer */}
        <Box
          component="footer"
          sx={{
            px: { xs: 2, md: 3.5 },
            py: 2,
            borderTop: '1px solid #E5E7EB',
            bgcolor: '#FFFFFF',
          }}
        >
          <Typography
            variant="caption"
            color="text.secondary"
          >
            Marketplace Administration
          </Typography>
        </Box>
      </Box>
    </Box>
  )
}
