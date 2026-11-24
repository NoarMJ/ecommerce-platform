import { useEffect, useRef } from 'react';
import { Link as RouterLink } from 'react-router-dom';

import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Chip,
  Container,
  Divider,
  Grid,
  Paper,
  Stack,
  Typography,
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

import { useGetMeQuery } from '../../services/api';
import { useGetMySellerApplicationQuery } from '../../services/sellerApi';

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

const sellerFeatures = [
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

const primaryButtonSx = {
  bgcolor: '#B9F2D0',
  color: '#17132F',
  fontWeight: 800,
  px: 3,
  py: 1.7,
  borderRadius: 2,
  transition: 'transform 250ms ease, background-color 250ms ease, box-shadow 250ms ease',
  '&:hover': {
    bgcolor: '#9DE5BA',
    transform: 'translateY(-3px)',
    boxShadow: '0 10px 25px rgba(185,242,208,0.2)',
  },
};

export default function SellerLandingPage() {
  const pageRef = useRef(null);

  const { data: user } = useGetMeQuery();
  const { data: seller } = useGetMySellerApplicationQuery(undefined, {
    skip: !user,
  });

  const isSeller = seller?.status === 'approved';

  // Logged out users register first, then return to the seller application.
  const heroCta = !user
    ? {
        label: 'Create account to be a seller',
        to: '/register',
        state: { from: { pathname: '/seller/apply' } },
      }
    : isSeller
      ? { label: 'Go to dashboard', to: '/seller/dashboard' }
      : { label: 'Become a seller', to: '/seller/apply' };

  // Reveal each section once as it enters the viewport.
  useEffect(() => {
    const page = pageRef.current;
    if (!page) return undefined;

    const revealItems = page.querySelectorAll('[data-reveal]');

    // Show content immediately for browsers without IntersectionObserver.
    if (!('IntersectionObserver' in window)) {
      revealItems.forEach((item) => item.classList.add('is-visible'));
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.12,
        rootMargin: '0px 0px -45px 0px',
      },
    );

    revealItems.forEach((item) => observer.observe(item));

    return () => observer.disconnect();
  }, []);

  return (
    <Box
      ref={pageRef}
      sx={{
        overflow: 'hidden',
        bgcolor: '#FAFAFC',

        '& [data-reveal]': {
          opacity: 0,
          transform: 'translate3d(0, 36px, 0)',
          transition:
            'opacity 750ms cubic-bezier(0.22, 1, 0.36, 1), transform 750ms cubic-bezier(0.22, 1, 0.36, 1)',
        },
        '& [data-reveal="left"]': {
          transform: 'translate3d(-42px, 0, 0)',
        },
        '& [data-reveal="right"]': {
          transform: 'translate3d(42px, 0, 0)',
        },
        '& [data-reveal="scale"]': {
          transform: 'scale(0.94)',
        },
        '& [data-reveal].is-visible': {
          opacity: 1,
          transform: 'translate3d(0, 0, 0) scale(1)',
        },

        '@keyframes driftOrb': {
          '0%, 100%': { transform: 'translate3d(0, 0, 0) scale(1)' },
          '50%': { transform: 'translate3d(-24px, 28px, 0) scale(1.08)' },
        },
        '@keyframes floatDashboard': {
          '0%, 100%': { transform: 'translateY(0) rotate(1.2deg)' },
          '50%': { transform: 'translateY(-12px) rotate(0deg)' },
        },
        '@keyframes floatBadge': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        '@keyframes gentlePulse': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(185,242,208,0.0)' },
          '50%': { boxShadow: '0 0 0 9px rgba(185,242,208,0.08)' },
        },

        '@media (prefers-reduced-motion: reduce)': {
          '& [data-reveal]': {
            opacity: 1,
            transform: 'none',
            transition: 'none',
          },
          '& *': {
            scrollBehavior: 'auto !important',
            animationDuration: '0.01ms !important',
            animationIterationCount: '1 !important',
            transitionDuration: '0.01ms !important',
          },
        },
      }}
    >
      {/* HERO */}
      <Box
        sx={{
          position: 'relative',
          isolation: 'isolate',
          overflow: 'hidden',
          background:
            'linear-gradient(125deg, #17132F 0%, #29204F 55%, #49327B 100%)',
          color: '#FFFFFF',
          py: { xs: 7, sm: 9, md: 13 },
        }}
      >
        <Box
          aria-hidden="true"
          sx={{
            position: 'absolute',
            zIndex: -1,
            width: { xs: 260, md: 420 },
            height: { xs: 260, md: 420 },
            borderRadius: '50%',
            bgcolor: 'rgba(255,255,255,0.045)',
            top: -180,
            right: { xs: -130, md: -100 },
            animation: 'driftOrb 13s ease-in-out infinite',
          }}
        />
        <Box
          aria-hidden="true"
          sx={{
            position: 'absolute',
            zIndex: -1,
            width: 300,
            height: 300,
            borderRadius: '50%',
            bgcolor: 'rgba(255,255,255,0.04)',
            bottom: -200,
            left: '30%',
            animation: 'driftOrb 16s ease-in-out infinite reverse',
          }}
        />
        <Box
          aria-hidden="true"
          sx={{
            position: 'absolute',
            zIndex: -1,
            width: 180,
            height: 180,
            borderRadius: '50%',
            border: '1px solid rgba(255,255,255,0.08)',
            top: '18%',
            left: '46%',
            animation: 'driftOrb 18s ease-in-out infinite',
          }}
        />

        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
          <Grid container spacing={{ xs: 5, md: 7 }} alignItems="center">
            <Grid size={{ xs: 12, md: 6 }} data-reveal="left">
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
                  to={heroCta.to}
                  state={heroCta.state}
                  variant="contained"
                  size="large"
                  endIcon={<ArrowForwardRoundedIcon />}
                  sx={primaryButtonSx}
                >
                  {heroCta.label}
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
                    transition: 'background-color 250ms ease, border-color 250ms ease',
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
                      bgcolor: 'rgba(255,255,255,0.08)',
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

            {/* Seller dashboard preview */}
            <Grid size={{ xs: 12, md: 6 }} data-reveal="right">
              <Box
                sx={{
                  position: 'relative',
                  maxWidth: 510,
                  mx: 'auto',
                  px: { xs: 1, sm: 0 },
                  pb: 2,
                }}
              >
                <Paper
                  elevation={0}
                  sx={{
                    p: { xs: 2, sm: 3 },
                    borderRadius: 4,
                    bgcolor: '#FFFFFF',
                    color: '#24213A',
                    transform: { xs: 'none', md: 'rotate(1.2deg)' },
                    boxShadow: '0 30px 80px rgba(0,0,0,0.25)',
                    animation: {
                      xs: 'none',
                      md: 'floatDashboard 6s ease-in-out infinite',
                    },
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
                            transition: 'transform 250ms ease, background-color 250ms ease',
                            '&:hover': {
                              transform: 'translateY(-4px)',
                              bgcolor: '#F2F0F9',
                            },
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

                          <Typography variant="body2" color="text.secondary">
                            {item.label}
                          </Typography>
                          <Typography variant="subtitle2" fontWeight={800}>
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

                <Box
                  sx={{
                    display: { xs: 'none', sm: 'flex' },
                    position: 'absolute',
                    bottom: -4,
                    left: -25,
                    p: 2,
                    bgcolor: '#B9F2D0',
                    color: '#17132F',
                    borderRadius: 3,
                    alignItems: 'center',
                    gap: 1,
                    boxShadow: 4,
                    animation: 'floatBadge 4s ease-in-out infinite',
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

      {/* BENEFITS */}
      <Container maxWidth="lg" sx={{ py: { xs: 7, md: 10 } }}>
        <Box sx={{ maxWidth: 650, mb: 5 }} data-reveal>
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
          {benefits.map((benefit, index) => (
            <Grid
              key={benefit.title}
              size={{ xs: 12, sm: 6, md: 3 }}
              data-reveal="scale"
              style={{ transitionDelay: `${index * 110}ms` }}
            >
              <Paper
                elevation={0}
                sx={{
                  height: '100%',
                  p: 3,
                  borderRadius: 3,
                  border: '1px solid',
                  borderColor: 'divider',
                  transition:
                    'transform 350ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 350ms ease, border-color 350ms ease',
                  '&:hover': {
                    transform: 'translateY(-9px)',
                    boxShadow: '0 20px 45px rgba(30,25,60,0.12)',
                    borderColor: 'primary.light',
                  },
                  '&:hover .benefit-icon': {
                    transform: 'rotate(-8deg) scale(1.08)',
                  },
                }}
              >
                <Box
                  className="benefit-icon"
                  sx={{
                    width: 52,
                    height: 52,
                    borderRadius: 2.5,
                    display: 'grid',
                    placeItems: 'center',
                    bgcolor: benefit.color,
                    color: benefit.iconColor,
                    mb: 3,
                    transition: 'transform 350ms ease',
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
          <Box
            textAlign="center"
            sx={{ maxWidth: 650, mx: 'auto', mb: 6 }}
            data-reveal
          >
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

          <Box sx={{ position: 'relative' }}>
            <Box
              aria-hidden="true"
              sx={{
                display: { xs: 'none', md: 'block' },
                position: 'absolute',
                top: 35,
                left: '16.5%',
                right: '16.5%',
                height: 2,
                bgcolor: '#D8D0EF',
                overflow: 'hidden',
                '&:after': {
                  content: '""',
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  bgcolor: '#7952CF',
                  transform: 'scaleX(0)',
                  transformOrigin: 'left',
                  transition: 'transform 1.5s cubic-bezier(0.22, 1, 0.36, 1)',
                },
                '.is-visible &': {
                  '&:after': { transform: 'scaleX(1)' },
                },
              }}
              data-reveal
            />

            <Grid container spacing={3}>
              {steps.map((step, index) => (
                <Grid
                  key={step.number}
                  size={{ xs: 12, md: 4 }}
                  data-reveal
                  style={{ transitionDelay: `${index * 160}ms` }}
                >
                  <Paper
                    elevation={0}
                    sx={{
                      position: 'relative',
                      zIndex: 1,
                      p: { xs: 3, md: 4 },
                      height: '100%',
                      borderRadius: 3,
                      bgcolor: '#FFFFFF',
                      transition:
                        'transform 350ms ease, box-shadow 350ms ease',
                      '&:hover': {
                        transform: 'translateY(-8px)',
                        boxShadow: '0 20px 40px rgba(40,30,80,0.09)',
                      },
                    }}
                  >
                    <Box
                      sx={{
                        width: 70,
                        height: 70,
                        display: 'grid',
                        placeItems: 'center',
                        borderRadius: '50%',
                        bgcolor: '#E9E3F8',
                        border: '7px solid #F0EEF8',
                        mb: 3,
                        color: '#49327B',
                        fontSize: '1.25rem',
                        fontWeight: 900,
                        transition: 'transform 350ms ease, background-color 350ms ease',
                        '&:hover': {
                          transform: 'scale(1.08)',
                          bgcolor: '#B9F2D0',
                        },
                      }}
                    >
                      {step.number}
                    </Box>

                    <Typography variant="h5" fontWeight={800} mb={1.5}>
                      {step.title}
                    </Typography>

                    <Typography color="text.secondary" lineHeight={1.8}>
                      {step.description}
                    </Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Box>

          <Box textAlign="center" sx={{ mt: 5 }} data-reveal>
            <Button
              component={RouterLink}
              to={heroCta.to}
              state={heroCta.state}
              variant="contained"
              size="large"
              endIcon={<ArrowForwardRoundedIcon />}
              sx={primaryButtonSx}
            >
              {heroCta.label}
            </Button>
          </Box>
        </Container>
      </Box>

      {/* SELLER WORKSPACE / TRUST */}
      <Container maxWidth="lg" sx={{ py: { xs: 7, md: 10 } }}>
        <Grid container spacing={5} alignItems="center">
          <Grid size={{ xs: 12, md: 6 }} data-reveal="left">
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
              {sellerFeatures.map((item, index) => (
                <Paper
                  key={item.title}
                  variant="outlined"
                  data-reveal="right"
                  style={{ transitionDelay: `${index * 130}ms` }}
                  sx={{
                    p: 2.5,
                    borderRadius: 3,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    borderColor: 'divider',
                    transition:
                      'transform 300ms ease, box-shadow 300ms ease, border-color 300ms ease',
                    '&:hover': {
                      transform: 'translateX(7px)',
                      boxShadow: '0 12px 30px rgba(30,25,60,0.07)',
                      borderColor: 'primary.light',
                    },
                  }}
                >
                  <Box
                    sx={{
                      flexShrink: 0,
                      width: 48,
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
                    <Typography fontWeight={800}>{item.title}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {item.text}
                    </Typography>
                  </Box>
                </Paper>
              ))}
            </Stack>
          </Grid>
        </Grid>
      </Container>

      {/* FAQ */}
      <Box sx={{ bgcolor: '#F7F7FA', py: { xs: 7, md: 9 } }}>
        <Container maxWidth="md">
          <Box data-reveal>
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
          </Box>

          {faqs.map((faq, index) => (
            <Accordion
              key={faq.question}
              elevation={0}
              disableGutters
              data-reveal
              style={{ transitionDelay: `${index * 80}ms` }}
              sx={{
                mb: 1.5,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: '12px !important',
                '&:before': { display: 'none' },
                overflow: 'hidden',
                transition:
                  'border-color 250ms ease, box-shadow 250ms ease',
                '&.Mui-expanded': {
                  borderColor: 'primary.light',
                  boxShadow: '0 10px 28px rgba(30,25,60,0.06)',
                },
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreRoundedIcon />}
                sx={{
                  px: 3,
                  py: 1,
                  '& .MuiAccordionSummary-expandIconWrapper': {
                    transition: 'transform 300ms ease',
                  },
                }}
              >
                <Typography fontWeight={700}>{faq.question}</Typography>
              </AccordionSummary>

              <AccordionDetails sx={{ px: 3, pb: 3 }}>
                <Typography color="text.secondary" lineHeight={1.8}>
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
          position: 'relative',
          overflow: 'hidden',
          bgcolor: '#211A42',
          color: '#FFFFFF',
          py: { xs: 7, md: 9 },
          '&:before': {
            content: '""',
            position: 'absolute',
            width: 320,
            height: 320,
            borderRadius: '50%',
            border: '1px solid rgba(255,255,255,0.08)',
            top: -220,
            left: 'calc(50% - 160px)',
          },
        }}
      >
        <Container maxWidth="md">
          <Box textAlign="center" data-reveal="scale">
            <StorefrontRoundedIcon
              sx={{
                fontSize: 48,
                color: '#B9F2D0',
                mb: 2,
                animation: 'floatBadge 4s ease-in-out infinite',
              }}
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
              to={heroCta.to}
              state={heroCta.state}
              variant="contained"
              size="large"
              endIcon={<ArrowForwardRoundedIcon />}
              sx={primaryButtonSx}
            >
              {heroCta.label}
            </Button>

            <Typography
              variant="caption"
              display="block"
              sx={{ mt: 2, color: 'rgba(255,255,255,0.55)' }}
            >
              You must be at least 18 years old to apply.
            </Typography>
          </Box>
        </Container>
      </Box>
    </Box>
  );
}
