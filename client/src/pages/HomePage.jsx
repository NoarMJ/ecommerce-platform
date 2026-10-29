
import { Link } from 'react-router-dom'
import {
  Alert,
  Box,
  Button,
  Container,
  Grid,
  Skeleton,
  Typography,
} from '@mui/material'

import {
  useGetProductsQuery,
  useGetCategoriesQuery,
} from '../services/api.js'

import ProductCard from '../components/ProductCard.jsx'

export default function HomePage() {
  // Fetch a small selection of products for the homepage.
  const {
    data: productResponse,
    isLoading: productsLoading,
    isError: productsError,
  } = useGetProductsQuery({ page: 1, limit: 4 })

  // Categories are loaded dynamically from the backend.
  const {
    data: categoryResponse,
    isLoading: categoriesLoading,
    isError: categoriesError,
  } = useGetCategoriesQuery()

  const products = productResponse?.data ?? []
  const categories = categoryResponse?.data ?? []

  return (
    <Box>
      {/* Hero section */}
      <Box
        sx={{
          bgcolor: 'primary.dark',
          color: 'primary.contrastText',
          py: { xs: 6, md: 10 },
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={4} alignItems="center">
            <Grid size={{ xs: 12, md: 7 }}>
              <Typography
                variant="overline"
                sx={{ letterSpacing: 2, fontWeight: 700 }}
              >
                WELCOME TO 2 VALID
              </Typography>

              <Typography
                variant="h2"
                component="h1"
                sx={{
                  fontWeight: 800,
                  mt: 1,
                  mb: 2,
                  fontSize: { xs: '2.5rem', md: '3.75rem' },
                }}
              >
                Everyday essentials. Better choices.
              </Typography>

              <Typography
                variant="h6"
                sx={{
                  opacity: 0.85,
                  fontWeight: 400,
                  maxWidth: 560,
                  mb: 4,
                }}
              >
                Explore technology, accessories and lifestyle products in one
                convenient marketplace.
              </Typography>

              <Button
                component={Link}
                to="/products"
                variant="contained"
                color="secondary"
                size="large"
              >
                Explore products
              </Button>
            </Grid>

            <Grid size={{ xs: 12, md: 5 }}>
              <Box
                sx={{
                  border: 1,
                  borderColor: 'rgba(255,255,255,0.2)',
                  borderRadius: 4,
                  p: { xs: 3, md: 4 },
                  bgcolor: 'rgba(255,255,255,0.06)',
                }}
              >
                <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
                  Find what fits your everyday
                </Typography>

                <Typography sx={{ opacity: 0.85, mb: 3 }}>
                  Browse categories, discover products and find your next
                  favourite item.
                </Typography>

                <Button
                  component={Link}
                  to="/products"
                  variant="outlined"
                  sx={{
                    color: 'inherit',
                    borderColor: 'rgba(255,255,255,0.55)',
                  }}
                >
                  Shop the catalogue
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
        {/* Category shortcuts */}
        <Box sx={{ mb: 6 }}>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
            Shop by category
          </Typography>

          <Typography color="text.secondary" sx={{ mb: 3 }}>
            Explore the categories available at 2 Valid.
          </Typography>

          {categoriesLoading ? (
            <Grid container spacing={2}>
              {Array.from({ length: 4 }).map((_, index) => (
                <Grid key={index} size={{ xs: 6, sm: 4, md: 3 }}>
                  <Skeleton variant="rounded" height={100} />
                </Grid>
              ))}
            </Grid>
          ) : categoriesError ? (
            <Alert severity="warning">
              Categories are temporarily unavailable.
            </Alert>
          ) : categories.length === 0 ? (
            <Typography color="text.secondary">
              No categories are available yet.
            </Typography>
          ) : (
            <Grid container spacing={2}>
              {categories.map((category) => (
                <Grid
                  key={category._id}
                  size={{ xs: 6, sm: 4, md: 3 }}
                >
                  <Box
                    component={Link}
                    to={`/products?category=${encodeURIComponent(category.slug)}`}
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      minHeight: 100,
                      p: 2,
                      border: 1,
                      borderColor: 'divider',
                      borderRadius: 2,
                      color: 'text.primary',
                      textDecoration: 'none',
                      transition: 'border-color 150ms, transform 150ms',
                      '&:hover': {
                        borderColor: 'primary.main',
                        transform: 'translateY(-2px)',
                      },
                    }}
                  >
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      {category.name}
                    </Typography>

                    <Typography variant="body2" color="text.secondary">
                      Explore category →
                    </Typography>
                  </Box>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>

        {/* Featured products */}
        <Box>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 2,
              flexWrap: 'wrap',
              mb: 3,
            }}
          >
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                Featured products
              </Typography>

              <Typography color="text.secondary">
                A selection from our current catalogue.
              </Typography>
            </Box>

            <Button
              component={Link}
              to="/products"
              variant="outlined"
            >
              View all products
            </Button>
          </Box>

          {productsLoading ? (
            <Grid container spacing={2}>
              {Array.from({ length: 4 }).map((_, index) => (
                <Grid key={index} size={{ xs: 12, sm: 6, md: 3 }}>
                  <Box
                    sx={{
                      border: 1,
                      borderColor: 'divider',
                      borderRadius: 2,
                      overflow: 'hidden',
                      p: 1,
                    }}
                  >
                    <Skeleton variant="rectangular" height={190} />
                    <Box sx={{ p: 1 }}>
                      <Skeleton width="80%" height={28} />
                      <Skeleton width="50%" />
                      <Skeleton width="60%" height={32} />
                    </Box>
                  </Box>
                </Grid>
              ))}
            </Grid>
          ) : productsError ? (
            <Alert severity="error">
              Featured products could not be loaded. Please try again later.
            </Alert>
          ) : products.length === 0 ? (
            <Alert severity="info">
              No products are available to feature yet.
            </Alert>
          ) : (
            <Grid container spacing={2}>
              {products.map((product) => (
                <Grid
                  key={product._id}
                  size={{ xs: 12, sm: 6, md: 3 }}
                >
                  <Box
                    sx={{
                      border: 1,
                      borderColor: 'divider',
                      borderRadius: 2,
                      overflow: 'hidden',
                      height: '100%',
                      transition: 'box-shadow 150ms, transform 150ms',
                      '&:hover': {
                        boxShadow: 3,
                        transform: 'translateY(-2px)',
                      },
                    }}
                  >
                   <ProductCard product={product} />
                  </Box>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      </Container>
    </Box>
  )
}
