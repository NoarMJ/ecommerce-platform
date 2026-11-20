
import { Link } from 'react-router-dom';

import {
  Alert,
  Box,
  Button,
  Container,
  Grid,
  Paper,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material';

import {
  useGetProductsQuery,
  useGetCategoriesQuery,
} from '../services/api.js';

import ProductCard from '../components/ProductCard.jsx';

const HERO_HIGHLIGHTS = [
  {
    number: '01',
    title: 'Explore products',
    description: 'Discover products across our available categories.',
  },
  {
    number: '02',
    title: 'Find your choice',
    description: 'Browse the catalogue and compare your options.',
  },
  {
    number: '03',
    title: 'Join our marketplace',
    description: 'Explore opportunities to become a 2 Valid seller.',
  },
];

function SectionHeading({ eyebrow, title, description }) {
  return (
    <Box>
      <Typography
        variant="overline"
        color="primary.main"
        fontWeight={800}
        letterSpacing={1.3}
      >
        {eyebrow}
      </Typography>

      <Typography
        variant="h4"
        component="h2"
        fontWeight={850}
        sx={{
          mt: 0.5,
          fontSize: { xs: '1.65rem', md: '2rem' },
        }}
      >
        {title}
      </Typography>

      {description && (
        <Typography
          color="text.secondary"
          sx={{ mt: 1, lineHeight: 1.7 }}
        >
          {description}
        </Typography>
      )}
    </Box>
  );
}

function CategorySkeletons() {
  return (
    <Grid container spacing={2}>
      {Array.from({ length: 4 }).map((_, index) => (
        <Grid key={index} size={{ xs: 6, sm: 4, md: 3 }}>
          <Skeleton variant="rounded" height={125} />
        </Grid>
      ))}
    </Grid>
  );
}

function ProductSkeletons() {
  return (
    <Grid container spacing={2}>
      {Array.from({ length: 4 }).map((_, index) => (
        <Grid key={index} size={{ xs: 6, sm: 6, md: 3 }}>
          <Paper
            variant="outlined"
            sx={{ p: 1, borderRadius: 3, overflow: 'hidden' }}
          >
            <Skeleton variant="rounded" height={190} />
            <Box sx={{ p: 1 }}>
              <Skeleton width="85%" height={28} />
              <Skeleton width="55%" />
              <Skeleton width="65%" height={32} />
            </Box>
          </Paper>
        </Grid>
      ))}
    </Grid>
  );
}

export default function HomePage() {
  const {
    data: productResponse,
    isLoading: productsLoading,
    isError: productsError,
    refetch: refetchProducts,
  } = useGetProductsQuery({ page: 1, limit: 4 });

  const {
    data: categoryResponse,
    isLoading: categoriesLoading,
    isError: categoriesError,
    refetch: refetchCategories,
  } = useGetCategoriesQuery();

  const products = productResponse?.data ?? [];
  const categories = categoryResponse?.data ?? [];

  return (
    <Box sx={{ overflow: 'hidden' }}>
      {/* HERO */}
      <Box
        sx={{
          position: 'relative',
          overflow: 'hidden',
          bgcolor: 'primary.dark',
          color: 'primary.contrastText',
          py: { xs: 7, md: 11 },
        }}
      >
        {/* Decorative background elements */}
        <Box
          aria-hidden="true"
          sx={{
            position: 'absolute',
            width: { xs: 220, md: 420 },
            height: { xs: 220, md: 420 },
            borderRadius: '50%',
            border: '1px solid rgba(255,255,255,0.10)',
            top: { xs: -100, md: -180 },
            right: { xs: -90, md: -100 },
          }}
        />

        <Box
          aria-hidden="true"
          sx={{
            position: 'absolute',
            width: 250,
            height: 250,
            borderRadius: '50%',
            bgcolor: 'rgba(255,255,255,0.035)',
            bottom: -150,
            left: '35%',
          }}
        />

        <Container maxWidth="lg" sx={{ position: 'relative' }}>
          <Grid container spacing={{ xs: 5, md: 7 }} alignItems="center">
            <Grid size={{ xs: 12, md: 7 }}>
              <Typography
                variant="overline"
                sx={{
                  letterSpacing: 2.5,
                  fontWeight: 800,
                  color: 'secondary.main',
                }}
              >
                WELCOME TO 2 VALID
              </Typography>

              <Typography
                variant="h1"
                component="h1"
                sx={{
                  fontWeight: 900,
                  mt: 1.5,
                  mb: 2.5,
                  lineHeight: 1.08,
                  letterSpacing: '-0.04em',
                  fontSize: {
                    xs: '2.65rem',
                    sm: '3.5rem',
                    md: '4.4rem',
                  },
                  maxWidth: 720,
                }}
              >
                Everyday essentials.
                <Box component="span" sx={{ color: 'secondary.main' }}>
                  {' '}Better choices.
                </Box>
              </Typography>

              <Typography
                variant="h6"
                sx={{
                  opacity: 0.82,
                  fontWeight: 400,
                  lineHeight: 1.7,
                  maxWidth: 570,
                  mb: 4,
                  fontSize: { xs: '1rem', md: '1.2rem' },
                }}
              >
                Explore technology, accessories and lifestyle products
                in one convenient marketplace.
              </Typography>

              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={2}
              >
                <Button
                  component={Link}
                  to="/products"
                  variant="contained"
                  color="secondary"
                  size="large"
                  sx={{
                    px: 3.5,
                    py: 1.5,
                    borderRadius: 2,
                    fontWeight: 800,
                  }}
                >
                  Explore products
                </Button>

                <Button
                  component={Link}
                  to="/products"
                  variant="outlined"
                  size="large"
                  sx={{
                    px: 3.5,
                    py: 1.5,
                    borderRadius: 2,
                    color: 'inherit',
                    borderColor: 'rgba(255,255,255,0.45)',
                    '&:hover': {
                      borderColor: 'white',
                      bgcolor: 'rgba(255,255,255,0.08)',
                    },
                  }}
                >
                  Browse catalogue
                </Button>
              </Stack>
            </Grid>

            <Grid size={{ xs: 12, md: 5 }}>
              <Paper
                elevation={0}
                sx={{
                  p: { xs: 3, md: 3.5 },
                  borderRadius: 4,
                  color: 'primary.contrastText',
                  bgcolor: 'rgba(255,255,255,0.075)',
                  border: '1px solid rgba(255,255,255,0.16)',
                  backdropFilter: 'blur(12px)',
                }}
              >
                <Typography
                  variant="overline"
                  sx={{
                    letterSpacing: 2,
                    color: 'secondary.main',
                    fontWeight: 800,
                  }}
                >
                  YOUR MARKETPLACE
                </Typography>

                <Typography
                  variant="h4"
                  fontWeight={850}
                  sx={{ mt: 1, mb: 1.5 }}
                >
                  Find what fits your everyday.
                </Typography>

                <Typography
                  sx={{
                    opacity: 0.8,
                    lineHeight: 1.8,
                    mb: 3,
                  }}
                >
                  From everyday technology to lifestyle essentials,
                  explore the catalogue and discover what is available.
                </Typography>

                <Stack spacing={2.5}>
                  {HERO_HIGHLIGHTS.map((item) => (
                    <Stack
                      key={item.number}
                      direction="row"
                      spacing={2}
                      alignItems="flex-start"
                    >
                      <Box
                        sx={{
                          width: 38,
                          height: 38,
                          flexShrink: 0,
                          display: 'grid',
                          placeItems: 'center',
                          borderRadius: 2,
                          bgcolor: 'rgba(255,255,255,0.12)',
                          color: 'secondary.main',
                          fontWeight: 900,
                          fontSize: 13,
                        }}
                      >
                        {item.number}
                      </Box>

                      <Box>
                        <Typography fontWeight={800}>
                          {item.title}
                        </Typography>

                        <Typography
                          variant="body2"
                          sx={{ opacity: 0.72, mt: 0.4, lineHeight: 1.6 }}
                        >
                          {item.description}
                        </Typography>
                      </Box>
                    </Stack>
                  ))}
                </Stack>
              </Paper>
            </Grid>
          </Grid>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: { xs: 5, md: 8 } }}>
        {/* CATEGORIES */}
        <Box sx={{ mb: { xs: 6, md: 9 } }}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: { xs: 'flex-start', sm: 'flex-end' },
              gap: 2,
              flexWrap: 'wrap',
              mb: 3,
            }}
          >
            <SectionHeading
              eyebrow="DISCOVER"
              title="Shop by category"
              description="Find products by exploring our available categories."
            />

            <Button
              component={Link}
              to="/products"
              variant="text"
              sx={{ fontWeight: 800, whiteSpace: 'nowrap' }}
            >
              View all products →
            </Button>
          </Box>

          {categoriesLoading ? (
            <CategorySkeletons />
          ) : categoriesError ? (
            <Alert
              severity="warning"
              action={
                <Button
                  color="inherit"
                  size="small"
                  onClick={refetchCategories}
                >
                  Retry
                </Button>
              }
              sx={{ borderRadius: 2 }}
            >
              Categories are temporarily unavailable.
            </Alert>
          ) : categories.length === 0 ? (
            <Paper
              variant="outlined"
              sx={{ p: 4, borderRadius: 3, textAlign: 'center' }}
            >
              <Typography fontWeight={700}>
                No categories available yet
              </Typography>
              <Typography color="text.secondary" sx={{ mt: 1 }}>
                Check back later as our catalogue grows.
              </Typography>
            </Paper>
          ) : (
            <Grid container spacing={2}>
              {categories.map((category, index) => (
                <Grid
                  key={category._id}
                  size={{ xs: 6, sm: 4, md: 3 }}
                >
                  <Paper
                    component={Link}
                    to={`/products?category=${encodeURIComponent(category.slug)}`}
                    variant="outlined"
                    sx={{
                      minHeight: 135,
                      p: { xs: 2, md: 2.5 },
                      borderRadius: 3,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      textDecoration: 'none',
                      color: 'text.primary',
                      transition: 'all 180ms ease',
                      '&:hover': {
                        borderColor: 'primary.main',
                        transform: 'translateY(-4px)',
                        boxShadow: 2,
                        bgcolor: 'action.hover',
                      },
                    }}
                  >
                    <Typography
                      variant="overline"
                      color="primary.main"
                      fontWeight={800}
                    >
                      CATEGORY {String(index + 1).padStart(2, '0')}
                    </Typography>

                    <Box>
                      <Typography
                        variant="h6"
                        fontWeight={800}
                        sx={{
                          overflowWrap: 'anywhere',
                          fontSize: { xs: '1rem', md: '1.15rem' },
                        }}
                      >
                        {category.name}
                      </Typography>

                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mt: 1, fontWeight: 600 }}
                      >
                        Explore category →
                      </Typography>
                    </Box>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>

        {/* FEATURED PRODUCTS */}
        <Box sx={{ mb: { xs: 6, md: 9 } }}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: { xs: 'flex-start', sm: 'flex-end' },
              gap: 2,
              flexWrap: 'wrap',
              mb: 3,
            }}
          >
            <SectionHeading
              eyebrow="OUR CATALOGUE"
              title="Explore featured products"
              description="Discover a selection from our current product catalogue."
            />

            <Button
              component={Link}
              to="/products"
              variant="outlined"
              sx={{
                borderRadius: 2,
                fontWeight: 800,
                whiteSpace: 'nowrap',
              }}
            >
              View all products
            </Button>
          </Box>

          {productsLoading ? (
            <ProductSkeletons />
          ) : productsError ? (
            <Alert
              severity="error"
              action={
                <Button
                  color="inherit"
                  size="small"
                  onClick={refetchProducts}
                >
                  Retry
                </Button>
              }
              sx={{ borderRadius: 2 }}
            >
              Featured products could not be loaded. Please try again.
            </Alert>
          ) : products.length === 0 ? (
            <Paper
              variant="outlined"
              sx={{
                p: 4,
                borderRadius: 3,
                textAlign: 'center',
              }}
            >
              <Typography variant="h6" fontWeight={800}>
                Products are coming soon
              </Typography>

              <Typography color="text.secondary" sx={{ mt: 1 }}>
                Our catalogue is being updated. Please check back later.
              </Typography>
            </Paper>
          ) : (
            <Grid container spacing={2}>
              {products.map((product) => (
                <Grid
                  key={product._id}
                  size={{ xs: 6, sm: 6, md: 3 }}
                >
                  <Paper
                    variant="outlined"
                    sx={{
                      height: '100%',
                      overflow: 'hidden',
                      borderRadius: 3,
                      transition: 'all 180ms ease',
                      '&:hover': {
                        boxShadow: 3,
                        transform: 'translateY(-3px)',
                      },
                    }}
                  >
                    <ProductCard product={product} />
                  </Paper>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>

        {/* BECOME A SELLER */}
        <Paper
          elevation={0}
          sx={{
            position: 'relative',
            overflow: 'hidden',
            borderRadius: 4,
            p: { xs: 3, sm: 4, md: 5 },
            bgcolor: 'primary.dark',
            color: 'primary.contrastText',
          }}
        >
          <Box
            aria-hidden="true"
            sx={{
              position: 'absolute',
              width: 260,
              height: 260,
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '50%',
              right: -100,
              top: -130,
            }}
          />

          <Box
            sx={{
              position: 'relative',
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              justifyContent: 'space-between',
              alignItems: { xs: 'flex-start', md: 'center' },
              gap: 3,
            }}
          >
            <Box sx={{ maxWidth: 650 }}>
              <Typography
                variant="overline"
                sx={{
                  color: 'secondary.main',
                  letterSpacing: 2,
                  fontWeight: 800,
                }}
              >
                GROW WITH 2 VALID
              </Typography>

              <Typography
                variant="h4"
                component="h2"
                fontWeight={900}
                sx={{ mt: 1, mb: 1.5 }}
              >
                Have products to sell?
              </Typography>

              <Typography
                sx={{
                  opacity: 0.82,
                  lineHeight: 1.8,
                  maxWidth: 570,
                }}
              >
                Bring your business to the 2 Valid marketplace.
                Apply to become a seller, submit your business details,
                and track your application as it goes through review.
              </Typography>
            </Box>

            <Stack
              spacing={1.5}
              sx={{ flexShrink: 0, width: { xs: '100%', md: 'auto' } }}
            >
              <Button
                component={Link}
                to="/seller"
                variant="contained"
                color="secondary"
                size="large"
                sx={{
                  px: 3.5,
                  py: 1.5,
                  borderRadius: 2,
                  fontWeight: 800,
                }}
              >
                Become a seller
              </Button>

              <Typography
                variant="caption"
                textAlign="center"
                sx={{ opacity: 0.7 }}
              >
                Discover the seller programme
              </Typography>
            </Stack>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}
