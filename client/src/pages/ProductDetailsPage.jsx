
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  ButtonBase,
  Chip,
  Container,
  Grid,
  IconButton,
  Paper,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import RemoveIcon from '@mui/icons-material/Remove'
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import {
  useAddCartItemMutation,
  useGetProductBySlugQuery,
} from '../services/api.js'

function formatPrice(priceMinor) {
  return `KSh ${(priceMinor / 100).toLocaleString('en-KE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

export default function ProductDetailsPage() {
  const { slug } = useParams()

  const [quantity, setQuantity] = useState(1)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [message, setMessage] = useState(null)

  const {
    data: product,
    isLoading,
    isError,
    error,
  } = useGetProductBySlugQuery(slug)

  const [addCartItem, { isLoading: isAdding }] =
    useAddCartItemMutation()

  // Reset the gallery and quantity when navigating to another product.
  useEffect(() => {
    setSelectedImageIndex(0)
    setQuantity(1)
    setMessage(null)
  }, [slug])

  const images = product?.images ?? []
  const selectedImage = images[selectedImageIndex] ?? images[0]

  const stock = Number(product?.stock) || 0
  const outOfStock = stock < 1 || !product?.isActive

  const handleAddToCart = async () => {
    if (!product || outOfStock || quantity > stock) return

    setMessage(null)

    try {
      await addCartItem({
        productId: product._id,
        quantity,
      }).unwrap()

      setMessage({
        type: 'success',
        text: 'Product added to your cart successfully.',
      })
    } catch (err) {
      setMessage({
        type: 'error',
        text:
          err?.data?.message ||
          'Unable to add this product to your cart.',
      })
    }
  }

  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 } }}>
        <Skeleton width={150} height={40} sx={{ mb: 2 }} />

        <Paper variant="outlined" sx={{ p: { xs: 2, md: 4 }, borderRadius: 3 }}>
          <Grid container spacing={4}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Skeleton variant="rounded" height={420} />
              <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                {[1, 2, 3].map((item) => (
                  <Skeleton
                    key={item}
                    variant="rounded"
                    width={76}
                    height={76}
                  />
                ))}
              </Stack>
            </Grid>

            <Grid size={{ xs: 12, md: 6 }}>
              <Skeleton width="35%" height={28} />
              <Skeleton width="85%" height={55} />
              <Skeleton width="45%" height={45} />
              <Skeleton height={70} />
              <Skeleton height={100} />
              <Skeleton variant="rounded" height={52} />
            </Grid>
          </Grid>
        </Paper>
      </Container>
    )
  }

  if (isError || !product) {
    return (
      <Container maxWidth="md" sx={{ py: 5 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error?.data?.message || 'We could not find this product.'}
        </Alert>

        <Button
          component={Link}
          to="/products"
          startIcon={<ArrowBackIcon />}
        >
          Back to products
        </Button>
      </Container>
    )
  }

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 } }}>
      <Button
        component={Link}
        to="/products"
        startIcon={<ArrowBackIcon />}
        sx={{ mb: 3 }}
      >
        Back to products
      </Button>

      <Paper
        variant="outlined"
        sx={{
          p: { xs: 2, sm: 3, md: 4 },
          borderRadius: { xs: 2, md: 4 },
        }}
      >
        <Grid container spacing={{ xs: 3, md: 5 }}>
          {/* Product image gallery */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Box
              sx={{
                position: 'relative',
                bgcolor: 'action.hover',
                borderRadius: 3,
                overflow: 'hidden',
              }}
            >
              <Box
                sx={{
                  minHeight: { xs: 280, sm: 360, md: 440 },
                  height: { xs: 320, sm: 400, md: 480 },
                  display: 'grid',
                  placeItems: 'center',
                  p: { xs: 2, md: 4 },
                }}
              >
                {selectedImage ? (
                  <Box
                    component="img"
                    key={selectedImage}
                    src={selectedImage}
                    alt={product.name}
                    sx={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      transition: 'opacity 180ms ease',
                    }}
                  />
                ) : (
                  <Stack alignItems="center" spacing={1}>
                    <AddShoppingCartIcon
                      sx={{ fontSize: 52, color: 'text.disabled' }}
                    />
                    <Typography color="text.secondary">
                      No image available
                    </Typography>
                  </Stack>
                )}
              </Box>

              {!outOfStock && (
                <Chip
                  icon={<AddShoppingCartIcon />}
                  label="In stock"
                  color="success"
                  size="small"
                  sx={{
                    position: 'absolute',
                    top: 16,
                    left: 16,
                    bgcolor: 'background.paper',
                  }}
                />
              )}
            </Box>

            {/* Clickable image thumbnails */}
            {images.length > 1 && (
              <Stack
                direction="row"
                spacing={1.5}
                sx={{
                  mt: 2,
                  overflowX: 'auto',
                  pb: 1,
                }}
                aria-label="Product image gallery"
              >
                {images.map((image, index) => (
                  <ButtonBase
                    key={`${image}-${index}`}
                    onClick={() => setSelectedImageIndex(index)}
                    aria-label={`View product image ${index + 1}`}
                    aria-pressed={selectedImageIndex === index}
                    sx={{
                      flex: '0 0 auto',
                      width: { xs: 68, sm: 84 },
                      height: { xs: 68, sm: 84 },
                      p: 0.5,
                      border: 2,
                      borderColor:
                        selectedImageIndex === index
                          ? 'primary.main'
                          : 'divider',
                      borderRadius: 2,
                      overflow: 'hidden',
                      bgcolor: 'action.hover',
                      '&:hover': {
                        borderColor: 'primary.main',
                      },
                    }}
                  >
                    <Box
                      component="img"
                      src={image}
                      alt={`${product.name}, image ${index + 1}`}
                      sx={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                      }}
                    />
                  </ButtonBase>
                ))}
              </Stack>
            )}
          </Grid>

          {/* Product information and purchasing controls */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Stack spacing={2.5}>
              <Box>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 1 }}
                >
                  {product.category?.name || 'General'}
                </Typography>

                <Typography
                  variant="h4"
                  component="h1"
                  fontWeight={800}
                  sx={{
                    fontSize: { xs: '1.65rem', sm: '2rem', md: '2.25rem' },
                    lineHeight: 1.2,
                    overflowWrap: 'anywhere',
                  }}
                >
                  {product.name}
                </Typography>
              </Box>

              <Box>
                <Typography
                  variant="h4"
                  color="primary.main"
                  fontWeight={800}
                  sx={{ fontSize: { xs: '1.8rem', md: '2.1rem' } }}
                >
                  {formatPrice(product.priceMinor)}
                </Typography>

                <Typography variant="caption" color="text.secondary">
                  Price per item
                </Typography>
              </Box>

              <Alert severity={outOfStock ? 'warning' : 'success'}>
                {outOfStock
                  ? 'Currently unavailable'
                  : `${stock} ${stock === 1 ? 'unit' : 'units'} available`}
              </Alert>

              <Box>
                <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>
                  Product description
                </Typography>

                <Typography
                  color="text.secondary"
                  sx={{
                    whiteSpace: 'pre-line',
                    lineHeight: 1.8,
                    overflowWrap: 'anywhere',
                  }}
                >
                  {product.description || 'No description is available yet.'}
                </Typography>
              </Box>

              <Box>
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
                  Quantity
                </Typography>

                <Stack
                  direction="row"
                  spacing={1.5}
                  alignItems="center"
                  flexWrap="wrap"
                  useFlexGap
                >
                  <IconButton
                    aria-label="Decrease quantity"
                    onClick={() => {
                      setQuantity((current) => Math.max(1, current - 1))
                      setMessage(null)
                    }}
                    disabled={quantity <= 1 || isAdding}
                    sx={{ border: 1, borderColor: 'divider' }}
                  >
                    <RemoveIcon />
                  </IconButton>

                  <Typography
                    aria-live="polite"
                    sx={{
                      minWidth: 32,
                      textAlign: 'center',
                      fontWeight: 700,
                      fontSize: '1.1rem',
                    }}
                  >
                    {quantity}
                  </Typography>

                  <IconButton
                    aria-label="Increase quantity"
                    onClick={() => {
                      setQuantity((current) =>
                        Math.min(stock, current + 1),
                      )
                      setMessage(null)
                    }}
                    disabled={quantity >= stock || isAdding || outOfStock}
                    sx={{ border: 1, borderColor: 'divider' }}
                  >
                    <AddIcon />
                  </IconButton>

                  <Typography variant="body2" color="text.secondary">
                    {outOfStock ? 'Unavailable' : `Max ${stock}`}
                  </Typography>
                </Stack>
              </Box>

              <Button
                variant="contained"
                size="large"
                fullWidth
                startIcon={<AddShoppingCartIcon />}
                onClick={handleAddToCart}
                disabled={outOfStock || isAdding || quantity > stock}
                sx={{
                  minHeight: 52,
                  borderRadius: 2,
                  fontWeight: 700,
                  textTransform: 'none',
                  fontSize: '1rem',
                }}
              >
                {isAdding ? 'Adding to cart…' : 'Add to Cart'}
              </Button>

              {message && (
                <Alert
                  severity={message.type}
                  onClose={() => setMessage(null)}
                >
                  {message.text}
                </Alert>
              )}

              

              <Stack spacing={1}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <AddShoppingCartIcon
                    fontSize="small"
                    color="success"
                  />
                  <Typography variant="body2" color="text.secondary">
                    Secure cart updates
                  </Typography>
                </Stack>

                <Typography variant="caption" color="text.secondary">
                  Stock availability can change before checkout. Adding an item
                  to your cart does not reserve or deduct inventory.
                </Typography>
              </Stack>
            </Stack>
          </Grid>
        </Grid>
      </Paper>
    </Container>
  )
}
