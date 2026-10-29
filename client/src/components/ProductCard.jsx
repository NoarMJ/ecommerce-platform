
import { useEffect, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Stack,
  Typography,
} from '@mui/material'
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart'
import { Link } from 'react-router-dom'
import { useAddCartItemMutation } from '../services/api.js'

function formatPrice(priceMinor) {
  return `KSh ${(priceMinor / 100).toLocaleString('en-KE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

export default function ProductCard({ product }) {
  const [addCartItem, { isLoading }] = useAddCartItemMutation()
  const [message, setMessage] = useState(null)
  const [imageFailed, setImageFailed] = useState(false)

  const imageUrl = product.images?.[0]

  useEffect(() => {
    setImageFailed(false)
  }, [imageUrl])

  const stock = Number(product.stock) || 0
  const isOutOfStock = stock < 1 || !product.isActive

  const handleAddToCart = async () => {
    setMessage(null)

    try {
      await addCartItem({
        productId: product._id,
        quantity: 1,
      }).unwrap()

      setMessage({
        type: 'success',
        text: 'Added to your cart.',
      })
    } catch (error) {
      setMessage({
        type: 'error',
        text:
          error?.data?.message ||
          'Unable to add this product. Please try again.',
      })
    }
  }

// ... inside your component:

useEffect(() => {
  // If there is no message, do nothing
  if (!message) return

  // Set a timer to clear the message after 3 seconds (3000ms)
  const timer = setTimeout(() => {
    setMessage(null)
  }, 1000)

  // CRITICAL: Clean up the timer if the component unmounts 
  // or if 'message' changes again before 3 seconds pass
  return () => clearTimeout(timer)
}, [message])


  return (
    <Card
      variant="outlined"
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 2.5,
        overflow: 'hidden',
        transition: 'border-color 180ms ease, box-shadow 180ms ease, transform 180ms ease',
        '&:hover': {
          borderColor: 'primary.main',
          boxShadow: 3,
          transform: 'translateY(-3px)',
        },
      }}
    >
      <Box
        component={Link}
        to={`/products/${product.slug}`}
        aria-label={`View ${product.name}`}
        sx={{
          display: 'block',
          position: 'relative',
          bgcolor: 'action.hover',
          textDecoration: 'none',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            aspectRatio: '4 / 3',
            minHeight: 140,
            maxHeight: 230,
            display: 'grid',
            placeItems: 'center',
            p: { xs: 1.5, sm: 2 },
          }}
        >
          {imageUrl && !imageFailed ? (
            <Box
              component="img"
              src={imageUrl}
              alt={product.name}
              loading="lazy"
              onError={() => setImageFailed(true)}
              sx={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                transition: 'transform 200ms ease',
                '.MuiCard-root:hover &': {
                  transform: 'scale(1.04)',
                },
              }}
            />
          ) : (
            <Typography
              variant="body2"
              color="text.secondary"
              textAlign="center"
            >
              No image available
            </Typography>
          )}
        </Box>

        <Chip
          size="small"
          label={isOutOfStock ? 'Out of stock' : 'In stock'}
          color={isOutOfStock ? 'default' : 'success'}
          variant="filled"
          sx={{
            position: 'absolute',
            top: 10,
            left: 10,
            maxWidth: 'calc(100% - 20px)',
            bgcolor: isOutOfStock ? 'action.disabledBackground' : 'success.light',
            color: isOutOfStock ? 'text.secondary' : 'success.dark',
            fontWeight: 600,
          }}
        />
      </Box>

      <CardContent
        sx={{
          p: { xs: 1.5, sm: 2 },
          '&:last-child': { pb: 2 },
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
        }}
      >
        {product.category?.name && (
          <Typography
            variant="caption"
            color="text.secondary"
            noWrap
          >
            {product.category.name}
          </Typography>
        )}

        <Typography
          component={Link}
          to={`/products/${product.slug}`}
          variant="subtitle2"
          fontWeight={600}
          sx={{
            color: 'text.primary',
            textDecoration: 'none',
            lineHeight: 1.45,
            minHeight: '2.9em',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            overflowWrap: 'anywhere',
            '&:hover': {
              color: 'primary.main',
            },
          }}
        >
          {product.name}
        </Typography>

        <Typography
          variant="h6"
          fontWeight={800}
          color="text.primary"
          sx={{
            fontSize: { xs: '1rem', sm: '1.15rem' },
            mt: 0.5,
          }}
        >
          {formatPrice(product.priceMinor)}
        </Typography>

        <Box sx={{ mt: 'auto', pt: 1 }}>
          <Button
            variant="contained"
            size="medium"
            startIcon={<AddShoppingCartIcon />}
            onClick={handleAddToCart}
            disabled={isLoading || isOutOfStock}
            fullWidth
            sx={{
              minHeight: 40,
              textTransform: 'none',
              fontWeight: 700,
              borderRadius: 1.5,
              whiteSpace: 'nowrap',
            }}
          >
            {isLoading ? 'Adding…' : 'Add to Cart'}
          </Button>
        </Box>

        {message && (
          <Alert
            severity={message.type}
            onClose={() => setMessage(null)}
            sx={{
              mt: 0.5,
              py: 0,
              '& .MuiAlert-message': {
                fontSize: '0.8rem',
                overflowWrap: 'anywhere',
              },
            }}
          >
            {message.text}
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}
