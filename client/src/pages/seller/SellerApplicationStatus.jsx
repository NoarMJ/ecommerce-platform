
import { Link as RouterLink, Navigate } from 'react-router-dom';

import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Container,
  Divider,
  Paper,
  Stack,
  Typography,
  Grid,
  Stepper,
  Step,
  StepLabel,
  Skeleton,
} from '@mui/material';

import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded';
import BusinessRoundedIcon from '@mui/icons-material/BusinessRounded';
import LocationOnRoundedIcon from '@mui/icons-material/LocationOnRounded';
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import VerifiedRoundedIcon from '@mui/icons-material/VerifiedRounded';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';

import { useGetMySellerApplicationQuery as useGetMySellerQuery } from '../../services/sellerApi';
import PageSpinner from '../../components/seller/PageSpinner';
import SellerStatusChip from '../../components/seller/SellerStatusChip';

const MESSAGES = {
  pending: {
    severity: 'info',
    title: 'Your application is under review',
    text: 'Thank you for choosing 2 Valid. Our team is reviewing your application. You can still update your information while it is pending.',
    icon: <InfoOutlinedIcon />,
    
  },

  rejected: {
    severity: 'error',
    title: 'Your application needs attention',
    text: 'Your application was not approved. Review the feedback below, make the necessary changes and submit it again.',
    icon: <WarningAmberRoundedIcon />,
  },

  approved: {
    severity: 'success',
    title: 'Congratulations! You are an approved seller.',
    text: 'Your seller application has been approved. You can now access your seller workspace and start setting up your shop.',
    icon: <VerifiedRoundedIcon />,
  },

  suspended: {
    severity: 'warning',
    title: 'Your seller account is suspended',
    text: 'Your seller account is currently suspended and your products are hidden from buyers. Please contact support for assistance.',
    icon: <WarningAmberRoundedIcon />,
  },
};

const APPLICATION_STEPS = [
  'Application submitted',
  'Application review',
  'Final decision',
];

const formatDate = (date) => {
  if (!date) return 'Not available';

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return 'Not available';
  }

  return new Intl.DateTimeFormat('en-KE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(parsedDate);
};

const formatValue = (value) => {
  if (!value) return 'Not provided';

  return String(value)
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

function ApplicationProgress({ status }) {
  const activeStep =
    status === 'pending' ? 1 : 2;

  const completed =
    status === 'approved' || status === 'suspended';

  return (
    
    <Paper
      variant="outlined"
      sx={{
        p: { xs: 2, sm: 3 },
        borderRadius: 3,
        borderColor: 'divider',
      }}
    >
      <Typography variant="h6" fontWeight={800} mb={1}>
        Application progress
      </Typography>

      <Typography variant="body2" color="text.secondary" mb={4}>
        Follow the progress of your seller application.
      </Typography> 

      




      <Stepper
        activeStep={activeStep}
        alternativeLabel
        sx={{
          '& .MuiStepLabel-label': {
            fontSize: { xs: '0.7rem', sm: '0.85rem' },
            fontWeight: 600,
          },
          '& .MuiStepIcon-root.Mui-active': {
            color: 'primary.main',
          },
          '& .MuiStepIcon-root.Mui-completed': {
            color: 'success.main',
          },
        }}
      >
        {APPLICATION_STEPS.map((step, index) => (
          <Step
            key={step}
            completed={completed || index === 0}
          >
            <StepLabel>{step}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {status === 'rejected' && (
        <Alert severity="error" sx={{ mt: 3, borderRadius: 2 }}>
          A decision has been made. Please review the feedback and
          resubmit your application.
        </Alert>
      )}

      {status === 'suspended' && (
        <Alert severity="warning" sx={{ mt: 3, borderRadius: 2 }}>
          Your seller account was previously approved but is now
          suspended. Contact support for assistance.
        </Alert>
      )}

     
    </Paper>
    
  );
}

function InformationItem({ icon, label, value }) {
  return (
    <Stack direction="row" spacing={2} alignItems="flex-start">
      <Box
        sx={{
          width: 42,
          height: 42,
          flexShrink: 0,
          borderRadius: 2,
          display: 'grid',
          placeItems: 'center',
          bgcolor: 'action.hover',
          color: 'primary.main',
        }}
      >
        {icon}
      </Box>

      <Box sx={{ minWidth: 0 }}>
        <Typography
          variant="caption"
          color="text.secondary"
          display="block"
        >
          {label}
        </Typography>

        <Typography
          variant="body1"
          fontWeight={600}
          sx={{ overflowWrap: 'anywhere' }}
        >
          {value}
        </Typography>
      </Box>
    </Stack>
  );
}

export default function SellerApplicationStatus() {
  const {
    data: seller,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useGetMySellerQuery();

  if (isLoading) {
    return <PageSpinner />;
  }

  // Handle API errors separately from missing applications.
  if (isError) {
    return (
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Alert
          severity="error"
          sx={{ borderRadius: 3 }}
          action={
            <Button
              color="inherit"
              size="small"
              startIcon={<RefreshRoundedIcon />}
              onClick={() => refetch()}
            >
              Retry
            </Button>
          }
        >
          <AlertTitle>Unable to load your application</AlertTitle>
          {error?.data?.message ||
            'Something went wrong while retrieving your seller information. Please try again.'}
        </Alert>
      </Container>
    );
  }

  // No seller application exists.
  if (!seller) {
    return <Navigate to="/seller/apply" replace />;
  }

  const status = String(seller.status || '').toLowerCase();

  const message = MESSAGES[status] || {
    severity: 'warning',
    title: 'Application status unavailable',
    text: 'We could not identify your current application status. Please contact support.',
    icon: <InfoOutlinedIcon />,
  };

  const isKnownStatus = Boolean(MESSAGES[status]);

  const details = [
    {
      label: 'Shop name',
      value: seller.shopName,
      icon: <StorefrontRoundedIcon />,
    },
    {
      label: 'Account type',
      value: formatValue(seller.accountType),
      icon: <BusinessRoundedIcon />,
    },
    ...(seller.companyName
      ? [
          {
            label: 'Company name',
            value: seller.companyName,
            icon: <BusinessRoundedIcon />,
          },
        ]
      : []),
    {
      label: 'Location',
      value: [seller.town, seller.county]
        .filter(Boolean)
        .join(', ') || 'Not provided',
      icon: <LocationOnRoundedIcon />,
    },
    {
      label: 'Application submitted',
      value: formatDate(seller.submittedAt),
      icon: <CalendarMonthRoundedIcon />,
    },
  ];

  return (
    <Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>
      <Container
        maxWidth="lg"
        sx={{ py: { xs: 3, sm: 5, md: 6 } }}
      >
        {/* Page heading */}
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          spacing={2}
          sx={{ mb: 4 }}
        >
          <Box>
            <Typography
              variant="overline"
              color="primary.main"
              fontWeight={800}
              letterSpacing={1.5}
            >
              SELLER CENTRE
            </Typography>
             <Button
                  component={RouterLink}
                  to="/seller/lp"
                  variant="outlined"
                  color="inherit"
                  sx={{ borderRadius: 2, whiteSpace: 'nowrap',mx:20 }}
                >
                  Back to Home
                </Button>

            <Typography
              component="h1"
              variant="h4"
              fontWeight={900}
              sx={{
                letterSpacing: '-0.035em',
                mb: 1,
              }}
            >
              Application overview
            </Typography>

            <Typography color="text.secondary">
              Manage your seller application and track its progress.
            </Typography>
          </Box>

          <SellerStatusChip status={status} />
        </Stack>

        <Grid container spacing={3}>
          {/* Main column */}
          <Grid size={{ xs: 12, md: 8 }}>
            <Stack spacing={3}>
              {/* Status card */}
              <Paper
                elevation={0}
                sx={{
                  p: { xs: 2.5, sm: 4 },
                  borderRadius: 3,
                  border: '1px solid',
                  borderColor: 'divider',
                  overflow: 'hidden',
                }}
              >
                <Stack
                  direction="row"
                  spacing={2}
                  alignItems="flex-start"
                >
                  <Box
                    sx={{
                      width: 52,
                      height: 52,
                      flexShrink: 0,
                      borderRadius: 2.5,
                      display: 'grid',
                      placeItems: 'center',
                      bgcolor: `${message.severity}.lighter`,
                      color: `${message.severity}.main`,
                    }}
                  >
                    {message.icon}
                  </Box>

                  <Box sx={{ minWidth: 0 }}>
                    <Typography
                      variant="h5"
                      fontWeight={800}
                      sx={{ mb: 1 }}
                    >
                      {message.title}
                    </Typography>

                    <Typography
                      color="text.secondary"
                      lineHeight={1.8}
                    >
                      {message.text}
                    </Typography>
                  </Box>
                </Stack>

                {status === 'rejected' && seller.rejectionReason && (
                  <Alert
                    severity="error"
                    sx={{ mt: 3, borderRadius: 2 }}
                  >
                    <AlertTitle fontWeight={800}>
                      Feedback from our review team
                    </AlertTitle>

                    {seller.rejectionReason}
                  </Alert>
                )}

                {status === 'approved' && (
                  <Button
                    component={RouterLink}
                    to="/seller"
                    variant="contained"
                    size="large"
                    endIcon={<ArrowForwardRoundedIcon />}
                    sx={{ mt: 3, fontWeight: 700 }}
                  >
                    Open seller dashboard
                  </Button>
                )}

                {status === 'pending' && (
                  <Button
                    component={RouterLink}
                    to="/seller/apply"
                    variant="outlined"
                    startIcon={<EditRoundedIcon />}
                    sx={{ mt: 3, fontWeight: 700 }}
                  >
                    Edit application
                  </Button>
                )}

                {status === 'rejected' && (
                  <Button
                    component={RouterLink}
                    to="/seller/apply"
                    variant="contained"
                    endIcon={<ArrowForwardRoundedIcon />}
                    sx={{ mt: 3, fontWeight: 700 }}
                  >
                    Update and resubmit
                  </Button>
                )}

                {status === 'suspended' && (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 3 }}
                  >
                    Seller dashboard access and selling permissions
                    are subject to your account status.
                  </Typography>
                )}

                {!isKnownStatus && (
                  <Button
                    variant="outlined"
                    onClick={() => refetch()}
                    startIcon={<RefreshRoundedIcon />}
                    sx={{ mt: 3 }}
                  >
                    Refresh status
                  </Button>
                )}
              </Paper>

              {/* Application progress */}
              {isKnownStatus && (
                <ApplicationProgress status={status} />
              )}

              {/* Application details */}
              <Paper
                elevation={0}
                sx={{
                  p: { xs: 2.5, sm: 3 },
                  borderRadius: 3,
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" fontWeight={800}>
                    Business information
                  </Typography>

                  <Typography variant="body2" color="text.secondary">
                    Details submitted with your seller application.
                  </Typography>
                </Box>

                <Grid container spacing={3}>
                  {details.map((item) => (
                    <Grid
                      key={item.label}
                      size={{ xs: 12, sm: 6 }}
                    >
                      <InformationItem
                        icon={item.icon}
                        label={item.label}
                        value={item.value}
                      />
                    </Grid>
                  ))}
                </Grid>
              </Paper>
            </Stack>
          </Grid>

          {/* Sidebar */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Stack spacing={3}>
              {/* Seller assistance */}
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  borderRadius: 3,
                  bgcolor: 'primary.dark',
                  color: 'primary.contrastText',
                }}
              >
                <Box
                  sx={{
                    width: 46,
                    height: 46,
                    borderRadius: 2,
                    bgcolor: 'rgba(255,255,255,0.12)',
                    display: 'grid',
                    placeItems: 'center',
                    mb: 2,
                  }}
                >
                  <InfoOutlinedIcon />
                </Box>

                <Typography variant="h6" fontWeight={800} mb={1}>
                  Need assistance?
                </Typography>

                <Typography
                  variant="body2"
                  sx={{
                    opacity: 0.85,
                    lineHeight: 1.8,
                    mb: 2,
                  }}
                >
                  Have questions about your application? Our support
                  team can help you understand the seller onboarding
                  process.
                </Typography>

                <Typography
                  variant="caption"
                  sx={{ opacity: 0.75 }}
                >
                  Contact 2 Valid support through the available
                  customer support channels.
                </Typography>
              </Paper>

              {/* Helpful reminders */}
              <Paper
                variant="outlined"
                sx={{
                  p: 3,
                  borderRadius: 3,
                }}
              >
                <Typography variant="h6" fontWeight={800} mb={2}>
                  Helpful reminders
                </Typography>

                <Stack spacing={2}>
                  {[
                    'Keep your business information accurate.',
                    'Check your application status regularly.',
                    'Respond to any requests for additional information.',
                  ].map((item) => (
                    <Stack
                      key={item}
                      direction="row"
                      spacing={1.5}
                      alignItems="flex-start"
                    >
                      <VerifiedRoundedIcon
                        color="success"
                        sx={{ fontSize: 19, mt: 0.2 }}
                      />

                      <Typography
                        variant="body2"
                        color="text.secondary"
                        lineHeight={1.7}
                      >
                        {item}
                      </Typography>
                    </Stack>
                  ))}
                </Stack>
              </Paper>

              {/* Refresh card */}
              <Paper
                variant="outlined"
                sx={{
                  p: 2.5,
                  borderRadius: 3,
                }}
              >
                <Typography fontWeight={700} mb={0.5}>
                  Application updates
                </Typography>

                <Typography
                  variant="body2"
                  color="text.secondary"
                  mb={2}
                >
                  Refresh to check whether your application status
                  has changed.
                </Typography>

                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<RefreshRoundedIcon />}
                  onClick={() => refetch()}
                  disabled={isFetching}
                >
                  {isFetching ? 'Refreshing...' : 'Refresh status'}
                </Button>
              </Paper>
            </Stack>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
