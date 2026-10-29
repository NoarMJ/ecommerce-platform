import {
  Alert,
  Box,
  Button,
  Container,
  Divider,
  IconButton,
  Paper,
  Stack,
  Typography,
} from '@mui/material'
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined'
import RemoveIcon from '@mui/icons-material/Remove'
import AddIcon from '@mui/icons-material/Add'
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined'
import { Link } from 'react-router-dom'
import {
  useGetCartQuery,
  useUpdateCartItemQuantityMutation,
  useRemoveCartItemMutation,
} from '../services/api.js'

function formatPrice(priceMinor = 0) {
  return `KSh ${(priceMinor / 100).toLocaleString('en-KE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

export default function CartPage() {
  const { data: cart, isLoading, isError } = useGetCartQuery()
  const [updateQuantity, { isLoading: isUpdating }] =
    useUpdateCartItemQuantityMutation()
  const [removeItem, { isLoading: isRemoving }] =
    useRemoveCartItemMutation()

  // Adjust this mapping if your backend returns a different cart structure.
  const items = cart?.items ?? cart?.data?.items ?? []

  const subtotal = items.reduce((total, item) => {
    const product = item.product
    return total + (product?.priceMinor ?? 0) * item.quantity
  }, 0)

  const hasUnavailableItem = items.some(
  (item) =>
    !item.product ||
    !item.product.isActive ||
    item.product.stock < item.quantity
)

  const handleQuantityChange = async (item, quantity) => {
    if (quantity < 1) return

    try {
      await updateQuantity({
        productId: item.product?._id ?? item.product,
        quantity,
      }).unwrap()
    } catch (error) {
      console.error('Unable to update cart quantity:', error)
    }
  }

  const handleRemove = async (item) => {
    try {
      await removeItem(item.product?._id ?? item.product).unwrap()
    } catch (error) {
      console.error('Unable to remove cart item:', error)
    }
  }

  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 6 }}>
        <Typography>Loading your cart…</Typography>
      </Container>
    )
  }

  if (isError) {
    return (
      <Container maxWidth="lg" sx={{ py: 6 }}>
        <Alert severity="error">
          We couldn’t load your cart. Please refresh and try again.
        </Alert>
      </Container>
    )
  }

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 } }}>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h4" fontWeight={700}>
            Your Cart
          </Typography>
          <Typography color="text.secondary">
            Review your items before checkout.
          </Typography>
        </Box>

        {items.length === 0 ? (
          <Paper variant="outlined" sx={{ p: { xs: 3, md: 5 }, textAlign: 'center' }}>
            <ShoppingBagOutlinedIcon
              sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }}
            />
            <Typography variant="h6">Your cart is empty</Typography>
            <Typography color="text.secondary" sx={{ mt: 1, mb: 3 }}>
              Find something you love and add it to your cart.
            </Typography>
            <Button component={Link} to="/products" variant="contained">
              Browse Products
            </Button>
          </Paper>
        ) : (
          <Stack spacing={2}>
            {items.map((item) => {
              const product = item.product
              const productId = product?._id ?? item.product
              const image = product?.images?.[0]
              const unavailable =
                !product || product.stock < 1 || !product.isActive

              return (
                <Paper key={productId} variant="outlined" sx={{ p: 2 }}>
                  <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={2}
                    alignItems={{ xs: 'stretch', sm: 'center' }}
                  >
                    {image ? (
                      <Box
                        component="img"
                        src={image}
                        alt={product?.name ?? 'Product'}
                        sx={{
                          width: { xs: '100%', sm: 112 },
                          height: 112,
                          objectFit: 'contain',
                          borderRadius: 1,
                          bgcolor: 'action.hover',
                        }}
                      />
                    ) : (
                      <Box
                        sx={{
                          width: { xs: '100%', sm: 112 },
                          height: 112,
                          display: 'grid',
                          placeItems: 'center',
                          bgcolor: 'action.hover',
                          borderRadius: 1,
                        }}
                      >
                        <ShoppingBagOutlinedIcon />
                      </Box>
                    )}

                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography fontWeight={600}>
                        {product?.name ?? 'Unavailable product'}
                      </Typography>
                      <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                        {formatPrice(product?.priceMinor ?? 0)}
                      </Typography>

                      {unavailable && (
                        <Alert severity="warning" sx={{ mt: 1 }}>
                          This product is currently unavailable.
                        </Alert>
                      )}
                    </Box>

                    <Stack
                      direction="row"
                      alignItems="center"
                      spacing={1}
                    >
                      <IconButton
                        aria-label="Decrease quantity"
                        onClick={() => handleQuantityChange(item, item.quantity - 1)}
                        disabled={item.quantity <= 1 || isUpdating}
                      >
                        <RemoveIcon />
                      </IconButton>

                      <Typography sx={{ minWidth: 20, textAlign: 'center' }}>
                        {item.quantity}
                      </Typography>

                      <IconButton
                        aria-label="Increase quantity"
                        onClick={() => handleQuantityChange(item, item.quantity + 1)}
                        disabled={
                          isUpdating ||
                          unavailable ||
                          item.quantity >= product.stock
                        }
                      >
                        <AddIcon />
                      </IconButton>
                    </Stack>

                    <Typography fontWeight={700} sx={{ minWidth: 110, textAlign: { xs: 'left', sm: 'right' } }}>
                      {formatPrice((product?.priceMinor ?? 0) * item.quantity)}
                    </Typography>

                    <IconButton
                      aria-label="Remove item"
                      color="error"
                      onClick={() => handleRemove(item)}
                      disabled={isRemoving}
                    >
                      <DeleteOutlinedIcon />
                    </IconButton>
                  </Stack>
                </Paper>
              )
            })}

            <Paper variant="outlined" sx={{ p: 3 }}>
              <Stack spacing={2}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography color="text.secondary">Subtotal</Typography>
                  <Typography fontWeight={600}>{formatPrice(subtotal)}</Typography>
                </Stack>
                <Divider />
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="h6">Total</Typography>
                  <Typography variant="h6" fontWeight={700}>
                    {formatPrice(subtotal)}
                  </Typography>
                </Stack>
                <Typography variant="caption" color="text.secondary">
                  Delivery fees and any applicable charges are not included.
                </Typography>
                <Button
                  component={Link}
                  to="/products"
                  variant="outlined"
                  fullWidth
                >
                  Continue Shopping
                </Button>
                    <Button
                    component={Link}
                    to="/checkout"
                    variant="contained"
                    fullWidth
                    disabled={hasUnavailableItem}
                    >
                    Proceed to Checkout
                    </Button>
              </Stack>
            </Paper>
          </Stack>
        )}
      </Stack>
    </Container>
  )
}