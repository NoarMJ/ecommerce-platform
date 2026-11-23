
import { Link } from 'react-router-dom'

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
} from '@mui/material'

import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded'
import EastRoundedIcon from '@mui/icons-material/EastRounded'
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined'
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined'
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined'

import {
  useGetProductsQuery,
  useGetCategoriesQuery,
} from '../services/api.js'

import ProductCard from '../components/ProductCard.jsx'

// --------------------------------------------------
// HOMEPAGE CONFIGURATION
// --------------------------------------------------

const HERO_IMAGE =
  'https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&w=1400&q=85'

const CATEGORY_IMAGES = {
  electronics:
    'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQHtkz4rz2hc70yXfkjZGB19d_YFn8kLT6tsdXgPv-2zAgaWrzI',

  phones:
    'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=800&q=85',

  accessories:
    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&q=85',

  gaming:
    'https://images.unsplash.com/photo-1593305841991-05c297ba4575?auto=format&fit=crop&w=800&q=85',

  fashion:
    'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=800&q=85',

  home:
    'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=800&q=85',

  beauty:
    'https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=800&q=85',
}

const DEFAULT_CATEGORY_IMAGE =
  'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQHtkz4rz2hc70yXfkjZGB19d_YFn8kLT6tsdXgPv-2zAgaWrzI'

function getCategoryImage(category) {
  const value = `${category.name} ${category.slug}`.toLowerCase()

  if (value.includes('phone') || value.includes('mobile')) {
    return CATEGORY_IMAGES.phones
  }

  if (value.includes('game') || value.includes('playstation')) {
    return CATEGORY_IMAGES.gaming
  }

  if (value.includes('accessor')) {
    return CATEGORY_IMAGES.accessories
  }

  if (
    value.includes('electronic') ||
    value.includes('computer') ||
    value.includes('tech') ||
    value.includes('television') ||
    value.includes('tv')
  ) {
    return CATEGORY_IMAGES.electronics
  }

  if (value.includes('fashion') || value.includes('cloth')) {
    return CATEGORY_IMAGES.fashion
  }

  if (
    value.includes('home') ||
    value.includes('furniture') ||
    value.includes('living')
  ) {
    return CATEGORY_IMAGES.home
  }

  if (value.includes('beauty') || value.includes('cosmetic')) {
    return CATEGORY_IMAGES.beauty
  }

  return DEFAULT_CATEGORY_IMAGE
}

// --------------------------------------------------
// REUSABLE SECTION HEADING
// --------------------------------------------------

function SectionHeading({
  eyebrow,
  title,
  description,
  action,
}) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      justifyContent="space-between"
      alignItems={{ xs: 'flex-start', sm: 'flex-end' }}
      spacing={2}
      sx={{ mb: 3.5 }}
    >
      <Box>
        <Typography
          variant="overline"
          sx={{
            color: 'primary.main',
            fontWeight: 900,
            letterSpacing: 2,
          }}
        >
          {eyebrow}
        </Typography>

        <Typography
          component="h2"
          sx={{
            fontSize: { xs: '1.8rem', md: '2.35rem' },
            fontWeight: 900,
            letterSpacing: '-0.045em',
            mt: 0.5,
          }}
        >
          {title}
        </Typography>

        {description && (
          <Typography
            color="text.secondary"
            sx={{ mt: 1, maxWidth: 570, lineHeight: 1.7 }}
          >
            {description}
          </Typography>
        )}
      </Box>

      {action}
    </Stack>
  )
}

// --------------------------------------------------
// LOADING COMPONENTS
// --------------------------------------------------

function CategorySkeletons() {
  return (
    <Grid container spacing={2}>
      {[1, 2, 3, 4].map((item) => (
        <Grid key={item} size={{ xs: 6, md: 3 }}>
          <Skeleton
            variant="rounded"
            height={230}
            animation="wave"
          />
        </Grid>
      ))}
    </Grid>
  )
}

function ProductSkeletons() {
  return (
    <Grid container spacing={2}>
      {[1, 2, 3, 4].map((item) => (
        <Grid key={item} size={{ xs: 6, sm: 6, md: 3 }}>
          <Skeleton
            variant="rounded"
            height={220}
            animation="wave"
          />
          <Skeleton width="85%" height={30} />
          <Skeleton width="55%" />
        </Grid>
      ))}
    </Grid>
  )
}

// --------------------------------------------------
// MAIN HOMEPAGE
// --------------------------------------------------

export default function HomePage() {
  const {
    data: productResponse,
    isLoading: productsLoading,
    isError: productsError,
    refetch: refetchProducts,
  } = useGetProductsQuery({
    page: 1,
    limit: 8,
  })

  const {
    data: categoryResponse,
    isLoading: categoriesLoading,
    isError: categoriesError,
    refetch: refetchCategories,
  } = useGetCategoriesQuery()

  const products = productResponse?.data ?? []
  const categories = categoryResponse?.data ?? []

  const visibleCategories = categories.slice(0, 4)

  return (
    <Box
      sx={{
        bgcolor: 'background.default',
        overflow: 'hidden',
      }}
    >
      {/* ==========================================
          ANNOUNCEMENT BAR
      ========================================== */}

    

      {/* ==========================================
          HERO SECTION
      ========================================== */}

      <Container
        maxWidth="xl"
        sx={{ py: { xs: 3, md: 5 } }}
      >
        <Box
          sx={{
            position: 'relative',
            minHeight: { xs: 490, md: 540 },
            borderRadius: { xs: 3, md: 5 },
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            backgroundImage: `
              linear-gradient(
                90deg,
                rgba(12, 20, 28, 0.92) 0%,
                rgba(12, 20, 28, 0.76) 45%,
                rgba(12, 20, 28, 0.12) 100%
              ),
              url("${HERO_IMAGE}")
            `,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            color: '#fff',
          }}
        >
          <Box
            sx={{
              width: '100%',
              px: { xs: 3, sm: 5, md: 8 },
              py: 6,
              position: 'relative',
              zIndex: 1,
            }}
          >
            <Box sx={{ maxWidth: 650 }}>
              <Typography
                variant="overline"
                sx={{
                  color: 'secondary.main',
                  letterSpacing: 3,
                  fontWeight: 900,
                  fontSize: '0.85rem',
                }}
              >
                DISCOVER SOMETHING BETTER
              </Typography>

              <Typography
                component="h1"
                sx={{
                  fontSize: {
                    xs: '2.8rem',
                    sm: '3.8rem',
                    md: '5rem',
                  },
                  fontWeight: 950,
                  lineHeight: 1.04,
                  letterSpacing: '-0.055em',
                  mt: 2,
                }}
              >
                Everyday essentials.
                <Box
                  component="span"
                  sx={{
                    display: 'block',
                    color: 'secondary.main',
                  }}
                >
                  Better choices.
                </Box>
              </Typography>

              <Typography
                sx={{
                  mt: 3,
                  mb: 4,
                  maxWidth: 480,
                  fontSize: { xs: '1rem', md: '1.15rem' },
                  lineHeight: 1.8,
                  color: 'rgba(255,255,255,0.82)',
                }}
              >
                Your everyday marketplace for technology,
                accessories and lifestyle essentials.
                Discover products that make everyday living better.
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
                  endIcon={<ArrowForwardRoundedIcon />}
                  sx={{
                    px: 4,
                    py: 1.6,
                    borderRadius: 2,
                    fontWeight: 850,
                  }}
                >
                  Shop now
                </Button>

                <Button
                  component={Link}
                  to="/products"
                  variant="outlined"
                  size="large"
                  sx={{
                    px: 4,
                    py: 1.6,
                    borderRadius: 2,
                    color: '#fff',
                    borderColor: 'rgba(255,255,255,0.65)',
                    fontWeight: 800,
                    '&:hover': {
                      borderColor: '#fff',
                      bgcolor: 'rgba(255,255,255,0.1)',
                    },
                  }}
                >
                  Explore collection
                </Button>
              </Stack>
            </Box>
          </Box>

          {/* Decorative label */}

          <Box
            sx={{
              display: { xs: 'none', md: 'block' },
              position: 'absolute',
              right: 35,
              bottom: 35,
              px: 3,
              py: 2,
              bgcolor: 'rgba(255,255,255,0.14)',
              backdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.25)',
              borderRadius: 2,
            }}
          >
            <Typography variant="caption" fontWeight={800}>
              THE 2 VALID EXPERIENCE
            </Typography>
          </Box>
        </Box>
      </Container>

      {/* ==========================================
          SERVICE BENEFITS
      ========================================== */}

      <Container maxWidth="xl">
        <Grid
          container
          spacing={2}
          sx={{
            py: 3,
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
          {[
            {
              icon: <LocalShippingOutlinedIcon />,
              title: 'Convenient shopping',
              text: 'Explore products in one place',
            },
            {
              icon: <ShieldOutlinedIcon />,
              title: 'Secure checkout',
              text: 'Shop with confidence',
            },
            {
              icon: <StorefrontOutlinedIcon />,
              title: 'Marketplace sellers',
              text: 'Discover different businesses',
            },
          ].map((item) => (
            <Grid key={item.title} size={{ xs: 12, md: 4 }}>
              <Stack
                direction="row"
                spacing={2}
                alignItems="center"
                justifyContent="center"
              >
                <Box sx={{ color: 'primary.main' }}>
                  {item.icon}
                </Box>

                <Box>
                  <Typography fontWeight={850} fontSize="0.9rem">
                    {item.title}
                  </Typography>

                  <Typography
                    variant="caption"
                    color="text.secondary"
                  >
                    {item.text}
                  </Typography>
                </Box>
              </Stack>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* ==========================================
          SHOP BY CATEGORY
      ========================================== */}

      <Container
        maxWidth="xl"
        sx={{ py: { xs: 6, md: 9 } }}
      >
        <SectionHeading
          eyebrow="FIND YOUR FAVOURITES"
          title="Shop by category"
          description="Explore our collections and find exactly what you are looking for."
          action={
            <Button
              component={Link}
              to="/products"
              endIcon={<EastRoundedIcon />}
              sx={{ fontWeight: 850 }}
            >
              All categories
            </Button>
          }
        />

        {categoriesLoading ? (
          <CategorySkeletons />
        ) : categoriesError ? (
          <Alert
            severity="warning"
            action={
              <Button
                color="inherit"
                onClick={refetchCategories}
              >
                Retry
              </Button>
            }
          >
            We couldn't load the categories.
          </Alert>
        ) : categories.length === 0 ? (
          <Alert severity="info">
            Categories will appear here when available.
          </Alert>
        ) : (
          <Grid container spacing={2}>
            {visibleCategories.map((category, index) => (
              <Grid
                key={category._id}
                size={{ xs: 6, sm: 6, md: 3 }}
              >
                <Paper
                  component={Link}
                  to={`/products?category=${encodeURIComponent(category.slug)}`}
                  elevation={0}
                  sx={{
                    position: 'relative',
                    display: 'flex',
                    minHeight: { xs: 190, md: 290 },
                    alignItems: 'flex-end',
                    overflow: 'hidden',
                    borderRadius: 3,
                    textDecoration: 'none',
                    color: '#fff',
                    backgroundImage: `
                      linear-gradient(
                        0deg,
                        rgba(0,0,0,0.78) 0%,
                        rgba(0,0,0,0.08) 75%
                      ),
                      url("${getCategoryImage(category)}")
                    `,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    transition: 'transform 250ms ease',
                    '&:hover': {
                      transform: 'translateY(-5px)',
                      '& .category-arrow': {
                        transform: 'translateX(5px)',
                      },
                    },
                  }}
                >
                  <Box sx={{ p: { xs: 2, md: 3 }, width: '100%' }}>
                    <Typography
                      variant="caption"
                      sx={{
                        opacity: 0.8,
                        fontWeight: 800,
                        letterSpacing: 1,
                      }}
                    >
                      COLLECTION 0{index + 1}
                    </Typography>

                    <Stack
                      direction="row"
                      alignItems="center"
                      justifyContent="space-between"
                      sx={{ mt: 0.5 }}
                    >
                      <Typography
                        fontWeight={900}
                        sx={{
                          fontSize: {
                            xs: '1.05rem',
                            md: '1.35rem',
                          },
                          overflowWrap: 'anywhere',
                        }}
                      >
                        {category.name}
                      </Typography>

                      <EastRoundedIcon
                        className="category-arrow"
                        sx={{
                          transition: 'transform 200ms ease',
                          flexShrink: 0,
                        }}
                      />
                    </Stack>
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>
        )}
      </Container>

      {/* ==========================================
          FEATURED PRODUCTS
      ========================================== */}

      <Box
        sx={{
          bgcolor: 'background.paper',
          py: { xs: 6, md: 9 },
        }}
      >
        <Container maxWidth="xl">
          <SectionHeading
            eyebrow="HANDPICKED FOR YOU"
            title="Explore our products"
            description="Discover what's available in the 2 Valid marketplace."
            action={
              <Button
                component={Link}
                to="/products"
                variant="outlined"
                endIcon={<ArrowForwardRoundedIcon />}
                sx={{
                  borderRadius: 2,
                  fontWeight: 850,
                }}
              >
                View all products
              </Button>
            }
          />

          {productsLoading ? (
            <ProductSkeletons />
          ) : productsError ? (
            <Alert
              severity="error"
              action={
                <Button
                  color="inherit"
                  onClick={refetchProducts}
                >
                  Retry
                </Button>
              }
            >
              Products could not be loaded.
            </Alert>
          ) : products.length === 0 ? (
            <Alert severity="info">
              Our products will be appearing here soon.
            </Alert>
          ) : (
            <Grid container spacing={2}>
              {products.map((product) => (
                <Grid
                  key={product._id}
                  size={{ xs: 6, sm: 6, md: 3 }}
                >
                  <Paper
                    elevation={0}
                    variant="outlined"
                    sx={{
                      height: '100%',
                      overflow: 'hidden',
                      borderRadius: 3,
                      borderColor: 'divider',
                      transition: 'all 200ms ease',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: 3,
                      },
                    }}
                  >
                    <ProductCard product={product} />
                  </Paper>
                </Grid>
              ))}
            </Grid>
          )}
        </Container>
      </Box>

      {/* ==========================================
          PROMOTIONAL BANNER
      ========================================== */}

      <Container
        maxWidth="xl"
        sx={{ py: { xs: 6, md: 9 } }}
      >
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 7 }}>
            <Box
              sx={{
                position: 'relative',
                minHeight: 350,
                height: '100%',
                overflow: 'hidden',
                borderRadius: 4,
                display: 'flex',
                alignItems: 'flex-end',
                color: '#fff',
                backgroundImage: `
                  linear-gradient(
                    0deg,
                    rgba(0,0,0,0.8),
                    rgba(0,0,0,0.05)
                  ),
                  url("https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=1200&q=85")
                `,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            >
              <Box sx={{ p: { xs: 3, md: 5 } }}>
                <Typography
                  variant="overline"
                  fontWeight={900}
                  letterSpacing={2}
                  color="secondary.main"
                >
                  TECHNOLOGY & EVERYDAY LIVING
                </Typography>

                <Typography
                  variant="h3"
                  fontWeight={900}
                  sx={{ mt: 1, mb: 2 }}
                >
                  Upgrade your everyday.
                </Typography>

                <Typography
                  sx={{
                    mb: 3,
                    maxWidth: 430,
                    color: 'rgba(255,255,255,0.8)',
                    lineHeight: 1.7,
                  }}
                >
                  Explore technology and accessories that
                  fit the way you live.
                </Typography>

                <Button
                  component={Link}
                  to="/products"
                  variant="contained"
                  color="secondary"
                  endIcon={<EastRoundedIcon />}
                  sx={{ fontWeight: 850, px: 3 }}
                >
                  Discover products
                </Button>
              </Box>
            </Box>
          </Grid>

          <Grid size={{ xs: 12, md: 5 }}>
            <Box
              sx={{
                height: '100%',
                minHeight: 350,
                borderRadius: 4,
                bgcolor: 'primary.dark',
                color: 'primary.contrastText',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                p: { xs: 3, md: 4 },
              }}
            >
              <Box>
                <Typography
                  variant="overline"
                  color="secondary.main"
                  fontWeight={900}
                  letterSpacing={2}
                >
                  YOUR MARKETPLACE
                </Typography>

                <Typography
                  variant="h3"
                  fontWeight={900}
                  sx={{
                    mt: 2,
                    lineHeight: 1.15,
                    fontSize: { xs: '2.1rem', md: '2.7rem' },
                  }}
                >
                  More choices.
                  <br />
                  Better everyday living.
                </Typography>

                <Typography
                  sx={{
                    mt: 2,
                    lineHeight: 1.8,
                    opacity: 0.78,
                  }}
                >
                  Discover a growing collection of products
                  and businesses in one marketplace.
                </Typography>
              </Box>

              <Button
                component={Link}
                to="/products"
                color="secondary"
                variant="contained"
                endIcon={<ArrowForwardRoundedIcon />}
                sx={{
                  alignSelf: 'flex-start',
                  px: 3,
                  fontWeight: 850,
                }}
              >
                Start exploring
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Container>

      {/* ==========================================
          BECOME A SELLER
      ========================================== */}

      <Box
        sx={{
          bgcolor: 'action.hover',
          py: { xs: 6, md: 8 },
        }}
      >
        <Container maxWidth="xl">
          <Grid
            container
            spacing={4}
            alignItems="center"
          >
            <Grid size={{ xs: 12, md: 8 }}>
              <Typography
                variant="overline"
                color="primary.main"
                fontWeight={900}
                letterSpacing={2}
              >
                GROW WITH 2 VALID
              </Typography>

              <Typography
                component="h2"
                sx={{
                  fontSize: { xs: '2rem', md: '3rem' },
                  fontWeight: 950,
                  letterSpacing: '-0.04em',
                  mt: 1,
                }}
              >
                Have a business?
                <br />
                Sell with us.
              </Typography>

              <Typography
                color="text.secondary"
                sx={{
                  mt: 2,
                  maxWidth: 570,
                  lineHeight: 1.8,
                }}
              >
                Bring your products to the 2 Valid marketplace.
                Apply to become a seller, reach more customers
                and grow your business.
              </Typography>
            </Grid>

            <Grid
              size={{ xs: 12, md: 4 }}
              sx={{ textAlign: { xs: 'left', md: 'right' } }}
            >
              <Button
                component={Link}
                to="/seller/lp"
                variant="contained"
                color="primary"
                size="large"
                endIcon={<ArrowForwardRoundedIcon />}
                sx={{
                  px: 4,
                  py: 1.7,
                  borderRadius: 2,
                  fontWeight: 850,
                }}
              >
                Become a seller
              </Button>
            </Grid>
          </Grid>
        </Container>
      </Box>
    </Box>
  )
}
