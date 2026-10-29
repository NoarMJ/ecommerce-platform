import { Badge, Fab, Typography } from '@mui/material'
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined'
import { Link, matchPath, useLocation } from 'react-router-dom'
import { useGetCartQuery } from '../services/api.js'

const VISIBLE_ROUTES = ['/', '/products', '/products/:slug']

const glassSx = {
  // glass surface
  '--lg-blur': '14px',
  '--lg-saturate': 1.3,
  isolation: 'isolate',
  overflow: 'hidden',
  color: 'text.primary',
  background: 'rgba(255,255,255,0.18)',
  WebkitBackdropFilter: 'blur(var(--lg-blur)) saturate(var(--lg-saturate))',
  backdropFilter: 'blur(var(--lg-blur)) saturate(var(--lg-saturate))',
  border: '1px solid rgba(255,255,255,0.45)',
  boxShadow:
    '0 10px 30px rgba(20,20,40,0.18), inset 0 1px 0 rgba(255,255,255,0.6), inset 0 -1px 0 rgba(255,255,255,0.15)',
  transition:
    'transform .25s ease, background .25s ease, box-shadow .25s ease',

  // diagonal shine
  '&::before': {
    content: '""',
    position: 'absolute',
    inset: 0,
    borderRadius: 'inherit',
    background:
      'linear-gradient(135deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.08) 40%, transparent 60%)',
    pointerEvents: 'none',
    zIndex: -1,
  },

  // glint that sweeps across on hover
  '&::after': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: '-60%',
    width: '40%',
    height: '100%',
    background:
      'linear-gradient(100deg, transparent, rgba(255,255,255,0.5), transparent)',
    transform: 'skewX(-20deg)',
    transition: 'left .6s ease',
    pointerEvents: 'none',
    zIndex: -1,
  },

  '&:hover': {
    background: 'rgba(255,255,255,0.28)',
    transform: 'translateY(-2px) scale(1.04)',
    boxShadow:
      '0 14px 36px rgba(20,20,40,0.22), inset 0 1px 0 rgba(255,255,255,0.7), inset 0 -1px 0 rgba(255,255,255,0.2)',
  },
  '&:hover::after': { left: '130%' },
  '&:active': { transform: 'scale(0.97)' },

  // fallback when backdrop-filter isn't supported
  '@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px)))':
    {
      background: 'rgba(18, 25, 40, 0.76))',
    },

  '@media (prefers-reduced-motion: reduce)': {
    transition: 'none',
    '&::after': { transition: 'none' },
    '&:hover': { transform: 'none' },
  },
}

export default function FloatingCart() {
  const { pathname } = useLocation()

  const show = VISIBLE_ROUTES.some((path) =>
    matchPath({ path, end: true }, pathname),
  )

  const { data: cartResponse } = useGetCartQuery(undefined, {
    skip: !show,
  })

  const cart = cartResponse?.data ?? cartResponse
  const items = cart?.items ?? []

  const count = items.reduce(
    (total, item) => total + (Number(item.quantity) || 0),
    0,
  )

  // Don't display the floating shortcut when the cart is empty
  if (!show || count === 0) return null

  return (
    <Fab
      component={Link}
      to="/cart"
      variant="extended"
      aria-label={`View cart with ${count} items`}
      sx={{
        position: 'fixed',
        right: { xs: 16, md: 24 },
        bottom: { xs: 16, md: 24 },
        zIndex: (theme) => theme.zIndex.speedDial,
        gap: 1,
        px: 2,
        ...glassSx,
      }}
    >
      <Badge badgeContent={count} color="error" max={99}>
        <ShoppingCartOutlinedIcon />
      </Badge>

      <Typography component="span" fontWeight={700}>
        View cart
      </Typography>
    </Fab>
  )
}