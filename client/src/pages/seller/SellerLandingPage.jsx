
import { Link as RouterLink } from 'react-router-dom';

import {
  Box,
  Button,
  Container,
  Paper,
  Stack,
  Typography,
  Grid,
  Chip,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';

import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded';
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded';
import ShoppingBagRoundedIcon from '@mui/icons-material/ShoppingBagRounded';
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded';
import VerifiedUserRoundedIcon from '@mui/icons-material/VerifiedUserRounded';
import SupportAgentRoundedIcon from '@mui/icons-material/SupportAgentRounded';
import LocalShippingRoundedIcon from '@mui/icons-material/LocalShippingRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';

const benefits = [
  {
    icon: <TrendingUpRoundedIcon />,
    title: 'Grow your business',
    description:
      'Put your products in front of customers looking for quality products and everyday essentials.',
    color: '#E7F5EE',
    iconColor: '#16865A',
  },
  {
    icon: <StorefrontRoundedIcon />,
    title: 'Your own seller space',
    description:
      'Build your presence with a dedicated seller account and manage your products in one place.',
    color: '#F0EAFE',
    iconColor: '#7952CF',
  },
  {
    icon: <Inventory2RoundedIcon />,
    title: 'Manage your products',
    description:
      'Add products, update prices, manage stock and keep your catalogue organised.',
    color: '#FFF1E6',
    iconColor: '#E77B32',
  },
  {
    icon: <ShoppingBagRoundedIcon />,
    title: 'Manage your orders',
    description:
      'Keep track of customer orders and manage your fulfilment workflow from your dashboard.',
    color: '#E8F1FF',
    iconColor: '#3478D4',
  },
];

const steps = [
  {
    number: '01',
    title: 'Create your application',
    description:
      'Tell us about yourself, your business and the products you want to bring to 2 Valid.',
  },
  {
    number: '02',
    title: 'Get verified',
    description:
      'Our team reviews your application and checks your submitted business information.',
  },
  {
    number: '03',
    title: 'Set up your shop',
    description:
      'Once approved, access your seller dashboard and start building your product catalogue.',
  },
];

const faqs = [
  {
    question: 'Who can become a seller?',
    answer:
      'Individuals, entrepreneurs, small businesses and established companies can apply. You must meet the marketplace requirements and be at least 18 years old.',
  },
  {
    question: 'Do I need to own a registered company?',
    answer:
      'You can submit an application as an individual or a registered business. The information and verification documents required will depend on the application type.',
  },
  {
    question: 'How long does approval take?',
    answer:
      'Every application is reviewed by our team. You can check your application status after submitting it. Approval times may vary.',
  },
  {
    question: 'What happens after approval?',
    answer:
      'You will be able to access your seller dashboard, add products, manage your inventory and handle your orders according to your seller permissions.',
  },
  {
    question: 'Can I manage my shop from my phone?',
    answer:
      'The seller experience is designed to be responsive, allowing you to access the platform from supported mobile and desktop browsers.',
  },
];

export default function SellerLandingPage() {
  return (
    <Box sx={{ overflow: 'hidden', bgcolor: '#FAFAFC' }}>

      {/* HERO SECTION */}
      <Box
        sx={{
          position: 'relative',
          overflow: 'hidden',
          background:
            'linear-gradient(125deg, #17132F 0%, #29204F 55%, #49327B 100%)',
          color: '#FFFFFF',
          py: { xs: 7, sm: 9, md: 13 },
        }}
      >
        {/* Decorative backgrounds */}
        <Box
          sx={{
            position: 'absolute',
            width: 420,
            height: 420,
            borderRadius: '50%',
            bgcolor: 'rgba(255,255,255,0.045)',
            top: -180,
            right: -100,
          }}
        />

        <Box
          sx={{
            position: 'absolute',
            width: 300,
            height: 300,
            borderRadius: '50%',
            bgcolor: 'rgba(255,255,255,0.04)',
            bottom: -200,
            left: '30%',
          }}
        />

        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
          <Grid container spacing={{ xs: 5, md: 7 }} alignItems="center">

            {/* Hero text */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Chip
                icon={
                  <StorefrontRoundedIcon
                    sx={{ color: '#B9F2D0 !important' }}
                  />
                }
                label="SELL WITH 2 VALID"
                sx={{
                  bgcolor: 'rgba(255,255,255,0.1)',
                  color: '#B9F2D0',
                  fontWeight: 700,
                  letterSpacing: 1.5,
                  mb: 3,
                  '& .MuiChip-label': { px: 1.5 },
                }}
              />

              <Typography
                component="h1"
                sx={{
                  fontSize: {
                    xs: '2.7rem',
                    sm: '3.5rem',
                    md: '4.2rem',
                  },
                  lineHeight: 1.08,
                  fontWeight: 900,
                  letterSpacing: '-0.045em',
                  mb: 3,
                }}
              >
                Your business.
                <Box component="span" sx={{ color: '#B9F2D0' }}>
                  {' '}More possibilities.
                </Box>
              </Typography>

              <Typography
                sx={{
                  color: 'rgba(255,255,255,0.78)',
                  fontSize: { xs: '1rem', md: '1.15rem' },
                  lineHeight: 1.85,
                  maxWidth: 520,
                  mb: 4,
                }}
              >
                Take your business to the next level. Join the 2 Valid
                marketplace, showcase your products and connect with
                customers looking for what you sell.
              </Typography>

              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={2}
                sx={{ alignItems: { xs: 'stretch', sm: 'center' } }}
              >
                <Button
                  component={RouterLink}
                  to="/seller/application"
                  variant="contained"
                  size="large"
                  endIcon={<ArrowForwardRoundedIcon />}
                  sx={{
                    bgcolor: '#B9F2D0',
                    color: '#17132F',
                    fontWeight: 800,
                    px: 3,
                    py: 1.7,
                    borderRadius: 2,
                    '&:hover': {
                      bgcolor: '#9DE5BA',
                      transform: 'translateY(-2px)',
                    },
                  }}
                >
                  Become a seller
                </Button>

                <Button
                  component="a"
                  href="#how-it-works"
                  variant="outlined"
                  size="large"
                  sx={{
                    color: '#FFFFFF',
                    borderColor: 'rgba(255,255,255,0.4)',
                    px: 3,
                    py: 1.7,
                    borderRadius: 2,
                    '&:hover': {
                      borderColor: '#FFFFFF',
                      bgcolor: 'rgba(255,255,255,0.08)',
                    },
                  }}
                >
                  How it works
                </Button>

                <Button
                  component={RouterLink}
                  to="/"
                  variant="outlined"
                  size="large"
                  sx={{
                    color: '#FFFFFF',
                    borderColor: 'rgba(255,255,255,0.4)',
                    px: 3,
                    py: 1.7,
                    borderRadius: 2,
                    '&:hover': {
                      borderColor: '#FFFFFF',
                      bgcolor: 'rgba(80, 71, 86, 0.08)',
                    },
                  }}
                >
                  Back to marketplace 
                </Button>
              </Stack>

              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                sx={{ mt: 4 }}
              >
                <VerifiedUserRoundedIcon
                  sx={{ color: '#B9F2D0', fontSize: 19 }}
                />
                <Typography
                  variant="body2"
                  sx={{ color: 'rgba(255,255,255,0.7)' }}
                >
                  A reviewed application process for every seller
                </Typography>
              </Stack>
            </Grid>

            {/* Hero dashboard illustration */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Box
                sx={{
                  position: 'relative',
                  maxWidth: 510,
                  mx: 'auto',
                }}
              >
                <Paper
                  elevation={0}
                  sx={{
                    p: { xs: 2, sm: 3 },
                    borderRadius: 4,
                    bgcolor: '#FFFFFF',
                    color: '#24213A',
                    transform: { md: 'rotate(1.5deg)' },
                    boxShadow: '0 30px 80px rgba(0,0,0,0.25)',
                  }}
                >
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                    mb={3}
                  >
                    <Box>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        fontWeight={700}
                      >
                        SELLER WORKSPACE
                      </Typography>
                      <Typography variant="h6" fontWeight={800}>
                        Your shop at a glance
                      </Typography>
                    </Box>

                    <Box
                      sx={{
                        width: 42,
                        height: 42,
                        borderRadius: 2,
                        bgcolor: '#E7F5EE',
                        display: 'grid',
                        placeItems: 'center',
                        color: '#16865A',
                      }}
                    >
                      <StorefrontRoundedIcon />
                    </Box>
                  </Stack>

                  <Grid container spacing={2}>
                    {[
                      {
                        label: 'Products',
                        value: 'Your catalogue',
                        icon: <Inventory2RoundedIcon />,
                        color: '#E7F5EE',
                      },
                      {
                        label: 'Orders',
                        value: 'Order management',
                        icon: <ShoppingBagRoundedIcon />,
                        color: '#F0EAFE',
                      },
                    ].map((item) => (
                      <Grid key={item.label} size={6}>
                        <Box
                          sx={{
                            p: 2,
                            borderRadius: 3,
                            bgcolor: '#F8F8FB',
                            height: '100%',
                          }}
                        >
                          <Box
                            sx={{
                              width: 38,
                              height: 38,
                              borderRadius: 2,
                              bgcolor: item.color,
                              display: 'grid',
                              placeItems: 'center',
                              mb: 2,
                              color: '#49327B',
                            }}
                          >
                            {item.icon}
                          </Box>

                          <Typography
                            variant="body2"
                            color="text.secondary"
                          >
                            {item.label}
                          </Typography>

                          <Typography
                            variant="subtitle2"
                            fontWeight={800}
                          >
                            {item.value}
                          </Typography>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>

                  <Divider sx={{ my: 2.5 }} />

                  <Typography fontWeight={800} mb={2}>
                    Your business, organised
                  </Typography>

                  {[
                    'Manage your product catalogue',
                    'Keep track of your inventory',
                    'Handle incoming customer orders',
                  ].map((item) => (
                    <Stack
                      key={item}
                      direction="row"
                      spacing={1.5}
                      alignItems="center"
                      sx={{ mb: 1.5 }}
                    >
                      <CheckCircleRoundedIcon
                        sx={{ color: '#16865A', fontSize: 19 }}
                      />
                      <Typography variant="body2" color="text.secondary">
                        {item}
                      </Typography>
                    </Stack>
                  ))}

                  <Box
                    sx={{
                      mt: 3,
                      p: 2,
                      borderRadius: 2,
                      bgcolor: '#F0EAFE',
                    }}
                  >
                    <Typography
                      variant="body2"
                      fontWeight={700}
                      color="#49327B"
                    >
                      Everything you need to manage your shop in one place.
                    </Typography>
                  </Box>
                </Paper>

                {/* Floating decoration */}
                <Box
                  sx={{
                    display: { xs: 'none', sm: 'flex' },
                    position: 'absolute',
                    bottom: -22,
                    left: -25,
                    p: 2,
                    bgcolor: '#B9F2D0',
                    color: '#17132F',
                    borderRadius: 3,
                    alignItems: 'center',
                    gap: 1,
                    boxShadow: 4,
                  }}
                >
                  <TrendingUpRoundedIcon />
                  <Typography fontWeight={800} variant="body2">
                    Build your business
                  </Typography>
                </Box>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* BENEFITS SECTION */}
      <Container maxWidth="lg" sx={{ py: { xs: 7, md: 10 } }}>
        <Box sx={{ maxWidth: 650, mb: 5 }}>
          <Chip
            label="WHY SELL WITH US?"
            sx={{
              mb: 2,
              bgcolor: '#E7F5EE',
              color: '#16865A',
              fontWeight: 800,
              letterSpacing: 1,
            }}
          />

          <Typography
            component="h2"
            variant="h3"
            fontWeight={900}
            sx={{
              fontSize: { xs: '2rem', md: '2.8rem' },
              letterSpacing: '-0.035em',
              mb: 2,
            }}
          >
            More than a shop.
            <Box component="span" sx={{ color: 'primary.main' }}>
              {' '}A place to grow.
            </Box>
          </Typography>

          <Typography color="text.secondary" lineHeight={1.8}>
            Running a business takes dedication. Your online selling
            experience should make managing your products and orders
            simpler, so you can focus on your business.
          </Typography>
        </Box>

        <Grid container spacing={2.5}>
          {benefits.map((benefit) => (
            <Grid key={benefit.title} size={{ xs: 12, sm: 6, md: 3 }}>
              <Paper
                elevation={0}
                sx={{
                  height: '100%',
                  p: 3,
                  borderRadius: 3,
                  border: '1px solid',
                  borderColor: 'divider',
                  transition: 'all 200ms ease',
                  '&:hover': {
                    transform: 'translateY(-5px)',
                    boxShadow: '0 12px 35px rgba(30,25,60,0.08)',
                    borderColor: 'primary.light',
                  },
                }}
              >
                <Box
                  sx={{
                    width: 52,
                    height: 52,
                    borderRadius: 2.5,
                    display: 'grid',
                    placeItems: 'center',
                    bgcolor: benefit.color,
                    color: benefit.iconColor,
                    mb: 3,
                    '& svg': { fontSize: 27 },
                  }}
                >
                  {benefit.icon}
                </Box>

                <Typography variant="h6" fontWeight={800} mb={1}>
                  {benefit.title}
                </Typography>

                <Typography
                  variant="body2"
                  color="text.secondary"
                  lineHeight={1.8}
                >
                  {benefit.description}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* HOW IT WORKS */}
      <Box
        id="how-it-works"
        sx={{
          bgcolor: '#F0EEF8',
          py: { xs: 7, md: 10 },
          scrollMarginTop: '90px',
        }}
      >
        <Container maxWidth="lg">
          <Box textAlign="center" sx={{ maxWidth: 650, mx: 'auto', mb: 6 }}>
            <Chip
              label="GETTING STARTED"
              sx={{
                bgcolor: '#E2DDF6',
                color: '#49327B',
                fontWeight: 800,
                letterSpacing: 1,
                mb: 2,
              }}
            />

            <Typography
              component="h2"
              variant="h3"
              fontWeight={900}
              sx={{
                fontSize: { xs: '2rem', md: '2.7rem' },
                mb: 2,
              }}
            >
              Three steps to get started.
            </Typography>

            <Typography color="text.secondary" lineHeight={1.8}>
              We've made the onboarding process straightforward.
              Apply, get reviewed and prepare to start selling.
            </Typography>
          </Box>

          <Grid container spacing={3}>
            {steps.map((step, index) => (
              <Grid key={step.number} size={{ xs: 12, md: 4 }}>
                <Paper
                  elevation={0}
                  sx={{
                    p: { xs: 3, md: 4 },
                    height: '100%',
                    borderRadius: 3,
                    bgcolor: '#FFFFFF',
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: '2.8rem',
                      fontWeight: 900,
                      color: '#C8BFE8',
                      lineHeight: 1,
                      mb: 3,
                    }}
                  >
                    {step.number}
                  </Typography>

                  <Typography variant="h5" fontWeight={800} mb={1.5}>
                    {step.title}
                  </Typography>

                  <Typography
                    color="text.secondary"
                    lineHeight={1.8}
                  >
                    {step.description}
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>

          <Box textAlign="center" sx={{ mt: 5 }}>
            <Button
              component={RouterLink}
              to="/seller/application"
              variant="contained"
              size="large"
              endIcon={<ArrowForwardRoundedIcon />}
              sx={{
                px: 4,
                py: 1.7,
                borderRadius: 2,
                fontWeight: 800,
              }}
            >
              Start your application
            </Button>
          </Box>
        </Container>
      </Box>

      {/* SUPPORT / TRUST SECTION */}
      <Container maxWidth="lg" sx={{ py: { xs: 7, md: 10 } }}>
        <Grid container spacing={5} alignItems="center">
          <Grid size={{ xs: 12, md: 6 }}>
            <Typography
              variant="overline"
              fontWeight={800}
              color="primary.main"
              letterSpacing={1.5}
            >
              BUILT FOR SELLERS
            </Typography>

            <Typography
              component="h2"
              variant="h3"
              fontWeight={900}
              sx={{
                fontSize: { xs: '2rem', md: '2.7rem' },
                lineHeight: 1.2,
                my: 2,
              }}
            >
              Spend less time juggling.
              <Box component="span" color="primary.main">
                {' '}Focus on growing.
              </Box>
            </Typography>

            <Typography color="text.secondary" lineHeight={1.9}>
              Your seller workspace brings important store-management
              activities together. From product listings to orders,
              you have a central place to organise your business.
            </Typography>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <Stack spacing={2}>
              {[
                {
                  icon: <Inventory2RoundedIcon />,
                  title: 'Product management',
                  text: 'Organise your listings, prices and available stock.',
                },
                {
                  icon: <LocalShippingRoundedIcon />,
                  title: 'Order management',
                  text: 'Keep up with orders and their fulfilment status.',
                },
                {
                  icon: <SupportAgentRoundedIcon />,
                  title: 'Seller assistance',
                  text: 'Get guidance through the application and onboarding process.',
                },
              ].map((item) => (
                <Paper
                  key={item.title}
                  variant="outlined"
                  sx={{
                    p: 2.5,
                    borderRadius: 3,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    borderColor: 'divider',
                  }}
                >
                  <Box
                    sx={{
                      minWidth: 48,
                      height: 48,
                      borderRadius: 2,
                      display: 'grid',
                      placeItems: 'center',
                      bgcolor: '#F0EAFE',
                      color: '#7952CF',
                    }}
                  >
                    {item.icon}
                  </Box>

                  <Box>
                    <Typography fontWeight={800}>
                      {item.title}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                    >
                      {item.text}
                    </Typography>
                  </Box>
                </Paper>
              ))}
            </Stack>
          </Grid>
        </Grid>
      </Container>

      {/* FAQ SECTION */}
      <Box sx={{ bgcolor: '#F7F7FA', py: { xs: 7, md: 9 } }}>
        <Container maxWidth="md">
          <Typography
            component="h2"
            variant="h3"
            fontWeight={900}
            textAlign="center"
            sx={{
              fontSize: { xs: '2rem', md: '2.6rem' },
              mb: 2,
            }}
          >
            Frequently asked questions
          </Typography>

          <Typography
            textAlign="center"
            color="text.secondary"
            sx={{ mb: 5 }}
          >
            Everything you need to know before joining 2 Valid.
          </Typography>

          {faqs.map((faq) => (
            <Accordion
              key={faq.question}
              elevation={0}
              disableGutters
              sx={{
                mb: 1.5,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: '12px !important',
                '&:before': { display: 'none' },
                overflow: 'hidden',
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreRoundedIcon />}
                sx={{ px: 3, py: 1 }}
              >
                <Typography fontWeight={700}>
                  {faq.question}
                </Typography>
              </AccordionSummary>

              <AccordionDetails sx={{ px: 3, pb: 3 }}>
                <Typography
                  color="text.secondary"
                  lineHeight={1.8}
                >
                  {faq.answer}
                </Typography>
              </AccordionDetails>
            </Accordion>
          ))}
        </Container>
      </Box>

      {/* FINAL CALL TO ACTION */}
      <Box
        sx={{
          bgcolor: '#211A42',
          color: '#FFFFFF',
          py: { xs: 7, md: 9 },
        }}
      >
        <Container maxWidth="md">
          <Box textAlign="center">
            <StorefrontRoundedIcon
              sx={{ fontSize: 48, color: '#B9F2D0', mb: 2 }}
            />

            <Typography
              component="h2"
              variant="h3"
              fontWeight={900}
              sx={{
                fontSize: { xs: '2rem', md: '3rem' },
                mb: 2,
              }}
            >
              Ready to bring your business to 2 Valid?
            </Typography>

            <Typography
              sx={{
                color: 'rgba(255,255,255,0.72)',
                maxWidth: 560,
                mx: 'auto',
                lineHeight: 1.8,
                mb: 4,
              }}
            >
              Your next chapter starts with one application.
              Take the first step towards growing your business
              with our marketplace.
            </Typography>

            <Button
              component={RouterLink}
              to="/seller/apply"
              variant="contained"
              size="large"
              endIcon={<ArrowForwardRoundedIcon />}
              sx={{
                bgcolor: '#B9F2D0',
                color: '#17132F',
                fontWeight: 900,
                px: 4,
                py: 1.8,
                borderRadius: 2,
                '&:hover': {
                  bgcolor: '#9DE5BA',
                },
              }}
            >
              Apply to become a seller
            </Button>

            <Typography
              variant="caption"
              display="block"
              sx={{ mt: 3, color: 'rgba(255,255,255,0.55)' }}
            >
              You must be at least 18 years old to apply.
            </Typography>
          </Box>
        </Container>
      </Box>

    </Box>
  );
}
