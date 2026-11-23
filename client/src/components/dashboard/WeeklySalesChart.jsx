import { Box, Chip, Stack, Typography } from '@mui/material'
import TrendingUpOutlinedIcon from '@mui/icons-material/TrendingUpOutlined'

// Shared by the admin and seller overviews.
// points: [{ date: 'YYYY-MM-DD', salesMinor }] for the last 7 days.

function dateLabel(value) {
  const date = new Date(`${value}T00:00:00`)
  return new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(date)
}

export default function WeeklySalesChart({ points, theme }) {
  const max = Math.max(...points.map((point) => point.salesMinor), 1)
  const coords = points.map((point, index) => `${34 + index * 86},${142 - (point.salesMinor / max) * 102}`).join(' ')
  const fillPoints = `34,146 ${coords} 550,146`
  const currency = (minor) => `KSh ${Math.round(minor / 100).toLocaleString('en-KE')}`
  return (
    <Box sx={{ mt: 1.5 }}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <Typography sx={{ fontSize: 28, fontWeight: 800, color: 'text.primary', letterSpacing: '-.7px' }}>{currency(points.reduce((sum, point) => sum + point.salesMinor, 0))}</Typography>
        <Chip size="small" icon={<TrendingUpOutlinedIcon sx={{ '&.MuiChip-icon': { color: 'inherit' } }} />} label="Paid sales" sx={{ height: 24, bgcolor: theme.palette.mode === 'dark' ? 'rgba(37,99,235,.16)' : '#EFF6FF', color: '#2563EB', fontSize: 10, fontWeight: 700 }} />
      </Stack>
      <Typography fontSize={11} color="text.secondary">Last 7 days · completed payments</Typography>
      <Box sx={{ mt: 1.5, width: '100%', overflow: 'hidden' }}>
        <svg viewBox="0 0 584 182" width="100%" role="img" aria-label="Paid sales by day for the last seven days">
          <defs><linearGradient id="sales-area" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#2563EB" stopOpacity=".23" /><stop offset="1" stopColor="#2563EB" stopOpacity=".015" /></linearGradient></defs>
          {[40, 90, 140].map((y) => <line key={y} x1="30" x2="558" y1={y} y2={y} stroke={theme.palette.divider} strokeDasharray="3 5" />)}
          <polygon points={fillPoints} fill="url(#sales-area)" />
          <polyline points={coords} fill="none" stroke="#2563EB" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          {points.map((point, index) => {
            const x = 34 + index * 86
            const y = 142 - (point.salesMinor / max) * 102
            return <g key={point.date}><circle cx={x} cy={y} r="4" fill="#fff" stroke="#2563EB" strokeWidth="2.5" /><text x={x} y="170" textAnchor="middle" fill={theme.palette.text.secondary} fontSize="10">{dateLabel(point.date)}</text></g>
          })}
        </svg>
      </Box>
    </Box>
  )
}
