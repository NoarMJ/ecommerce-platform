
import { useEffect, useState } from 'react';
import { Navigate, Link as RouterLink, useNavigate } from 'react-router-dom';

import {
  Alert,
  AlertTitle,
  Box,
  Button,
  Checkbox,
  Container,
  Divider,
  FormControlLabel,
  Paper,
  Radio,
  RadioGroup,
  Stack,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
} from '@mui/material';

import {
  useSubmitSellerApplicationMutation as useApplySellerMutation,
  useGetMySellerApplicationQuery,
  useResubmitSellerApplicationMutation,
  useUpdateSellerApplicationMutation as useUpdateMySellerMutation,
} from '../../services/sellerApi';

import {
  apiErrorMessage,
  apiFieldErrors,
} from '../../utils/apiError';

import PageSpinner from '../../components/seller/PageSpinner';

const MIN_AGE = 18;

const STATUS_ROUTE = '/seller/application-status';
const DASHBOARD_ROUTE = '/seller/dashboard';

const STEPS = [
  'About you',
  'Your shop',
  'Review',
];

const EMPTY = {
  accountType: 'individual',
  dateOfBirth: '',
  shopName: '',
  companyName: '',
  county: '',
  town: '',
  description: '',
};

const STEP_FOR_FIELD = {
  accountType: 0,
  dateOfBirth: 0,
  shopName: 1,
  companyName: 1,
  county: 1,
  town: 1,
  description: 1,
};

function ageFromDob(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;

  const [year, month, day] = value.split('-').map(Number);

  const dob = new Date(Date.UTC(year, month - 1, day));

  if (
    dob.getUTCFullYear() !== year ||
    dob.getUTCMonth() !== month - 1 ||
    dob.getUTCDate() !== day
  ) {
    return null;
  }

  const now = new Date();

  let age = now.getFullYear() - year;

  if (
    now.getMonth() + 1 < month ||
    (now.getMonth() + 1 === month && now.getDate() < day)
  ) {
    age -= 1;
  }

  return age;
}

function validate(values, currentStep) {
  const errors = {};

  if (currentStep === 0) {
    const age = ageFromDob(values.dateOfBirth);

    if (age === null) {
      errors.dateOfBirth = 'Enter a valid date of birth.';
    } else if (age < MIN_AGE) {
      errors.dateOfBirth = `You must be at least ${MIN_AGE} years old to apply.`;
    }

    if (!['individual', 'company'].includes(values.accountType)) {
      errors.accountType = 'Select an account type.';
    }
  }

  if (currentStep === 1) {
    const length = (value) => value.trim().length;

    if (length(values.shopName) < 2 || length(values.shopName) > 120) {
      errors.shopName = 'Shop name must be between 2 and 120 characters.';
    }

    if (
      values.accountType === 'company' &&
      (length(values.companyName) < 2 || length(values.companyName) > 150)
    ) {
      errors.companyName = 'Company name must be between 2 and 150 characters.';
    }

    if (length(values.county) < 2) {
      errors.county = 'Enter your county.';
    }

    if (length(values.town) < 2) {
      errors.town = 'Enter your town.';
    }

    if (length(values.description) > 1000) {
      errors.description = 'Description cannot exceed 1000 characters.';
    }
  }

  return errors;
}

function SectionHeading({ eyebrow, title, description }) {
  return (
    <Box>
      <Typography
        variant="overline"
        color="primary.main"
        fontWeight={800}
        letterSpacing={1.2}
      >
        {eyebrow}
      </Typography>

      <Typography variant="h5" fontWeight={800} sx={{ mt: 0.5 }}>
        {title}
      </Typography>

      <Typography color="text.secondary" sx={{ mt: 0.75, lineHeight: 1.7 }}>
        {description}
      </Typography>
    </Box>
  );
}

function ReviewItem({ label, value }) {
  return (
    <Box
      sx={{
        p: 2,
        borderRadius: 2,
        bgcolor: 'action.hover',
        minWidth: 0,
      }}
    >
      <Typography
        variant="caption"
        color="text.secondary"
        fontWeight={700}
      >
        {label}
      </Typography>

      <Typography
        fontWeight={600}
        sx={{
          mt: 0.5,
          overflowWrap: 'anywhere',
          textTransform: label === 'Account type' ? 'capitalize' : 'none',
        }}
      >
        {value || 'Not provided'}
      </Typography>
    </Box>
  );
}

export default function SellerApplicationPage() {
  const navigate = useNavigate();

  const {
    data: seller,
    isLoading,
    isError: sellerQueryError,
    refetch,
  } = useGetMySellerApplicationQuery();

  const [applySeller, applyState] = useApplySellerMutation();
  const [updateMySeller, updateState] = useUpdateMySellerMutation();
  const [resubmitSeller, resubmitState] = useResubmitSellerApplicationMutation();

  const [step, setStep] = useState(0);
  const [form, setForm] = useState(EMPTY);
  const [confirmed, setConfirmed] = useState(false);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [prefilled, setPrefilled] = useState(false);

  useEffect(() => {
    if (isLoading || prefilled) return;

    if (seller && ['pending', 'rejected'].includes(seller.status)) {
      setForm({
        accountType: seller.accountType || 'individual',
        dateOfBirth: seller.dateOfBirth
          ? String(seller.dateOfBirth).slice(0, 10)
          : '',
        shopName: seller.shopName || '',
        companyName: seller.companyName || '',
        county: seller.county || '',
        town: seller.town || '',
        description: seller.description || '',
      });
    }

    setPrefilled(true);
  }, [isLoading, seller, prefilled]);

  if (isLoading || !prefilled) {
    return <PageSpinner />;
  }

  if (sellerQueryError) {
    return (
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Alert
          severity="error"
          action={
            <Button color="inherit" onClick={refetch}>
              Retry
            </Button>
          }
        >
          We couldn't load your seller application. Please try again.
        </Alert>
      </Container>
    );
  }

  if (seller?.status === 'approved') {
    return <Navigate to={DASHBOARD_ROUTE} replace />;
  }

  if (seller?.status === 'suspended') {
    return <Navigate to={STATUS_ROUTE} replace />;
  }

  const mode = !seller
    ? 'new'
    : seller.status === 'pending'
      ? 'edit'
      : 'resubmit';

  const submitting =
    applyState.isLoading ||
    updateState.isLoading ||
    resubmitState.isLoading;

  const submitLabels = {
    new: 'Submit application',
    edit: 'Save changes',
    resubmit: 'Resubmit application',
  };

  const submitLabel = submitLabels[mode];

  const handleChange = (name, value) => {
    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setErrors((previous) => ({
      ...previous,
      [name]: undefined,
    }));

    setFormError('');
  };

  const field = (name) => ({
    value: form[name],
    onChange: (event) => handleChange(name, event.target.value),
    error: Boolean(errors[name]),
    helperText: errors[name],
    fullWidth: true,
    size: 'medium',
  });

  const next = () => {
    const found = validate(form, step);

    setErrors(found);

    if (Object.keys(found).length > 0) return;

    setFormError('');
    setStep((previous) => previous + 1);
  };

  const back = () => {
    setFormError('');
    setStep((previous) => Math.max(0, previous - 1));
  };

  const submit = async () => {
    setFormError('');

    const body = {
      accountType: form.accountType,
      dateOfBirth: form.dateOfBirth,
      shopName: form.shopName.trim(),
      companyName:
        form.accountType === 'company'
          ? form.companyName.trim()
          : '',
      county: form.county.trim(),
      town: form.town.trim(),
      description: form.description.trim(),
    };

    const action = {
      new: applySeller,
      edit: updateMySeller,
      resubmit: resubmitSeller,
    }[mode];

    try {
      await action(body).unwrap();

      // Refresh the seller application query before moving to the status page.
      await refetch();

      navigate(STATUS_ROUTE, { replace: true });
    } catch (error) {
      const serverErrors = apiFieldErrors(error) || {};

      setErrors(serverErrors);
      setFormError(apiErrorMessage(error));

      const firstField = Object.keys(serverErrors)[0];

      if (firstField) {
        setStep(STEP_FOR_FIELD[firstField] ?? 1);
      }
    }
  };

  const reviewRows = [
    ['Account type', form.accountType],
    ['Date of birth', form.dateOfBirth],
    ['Shop name', form.shopName],
    ...(form.accountType === 'company'
      ? [['Company name', form.companyName]]
      : []),
    ['County', form.county],
    ['Town', form.town],
    ['Shop description', form.description || 'Not provided'],
  ];

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: 'background.default',
        py: { xs: 3, md: 6 },
      }}
    >
      <Container maxWidth="lg">
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', sm: 'center' },
            flexDirection: { xs: 'column', sm: 'row' },
            gap: 2,
            mb: 4,
          }}
        >
          <Box>
            <Typography
              variant="overline"
              color="primary.main"
              fontWeight={800}
              letterSpacing={1.5}
            >
              2 VALID SELLER PROGRAM
            </Typography>

            <Typography
              variant="h4"
              component="h1"
              fontWeight={900}
              sx={{ mt: 0.5 }}
            >
              {mode === 'resubmit'
                ? 'Update your application'
                : mode === 'edit'
                  ? 'Edit your application'
                  : 'Become a seller'}
            </Typography>

            <Typography color="text.secondary" sx={{ mt: 1 }}>
              Tell us about yourself and the shop you want to bring to 2 Valid.
            </Typography>
          </Box>

          <Button
            component={RouterLink}
            to={STATUS_ROUTE}
            variant="outlined"
            color="inherit"
            sx={{ borderRadius: 2, whiteSpace: 'nowrap' }}
          >
            View application status
          </Button>
        </Box>

        {mode === 'edit' && (
          <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
            <AlertTitle>Application currently under review</AlertTitle>
            You can update your details while your application is pending.
          </Alert>
        )}

        {mode === 'resubmit' && (
          <Alert severity="warning" sx={{ mb: 3, borderRadius: 2 }}>
            <AlertTitle>Changes are needed</AlertTitle>
            Review your previous application, update the necessary details,
            and submit it again for review.
          </Alert>
        )}

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              md: 'minmax(0, 1fr) 300px',
            },
            gap: 3,
            alignItems: 'start',
          }}
        >
          <Paper
            variant="outlined"
            sx={{
              p: { xs: 2, sm: 3, md: 4 },
              borderRadius: 3,
            }}
          >
            <Box sx={{ mb: 3 }}>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                sx={{ mb: 1.5 }}
              >
                <Typography variant="body2" fontWeight={700}>
                  Step {step + 1} of {STEPS.length}
                </Typography>

                <Typography variant="body2" color="text.secondary">
                  {Math.round(progress)}% complete
                </Typography>
              </Stack>

              <Box
                sx={{
                  height: 6,
                  borderRadius: 10,
                  bgcolor: 'action.hover',
                  overflow: 'hidden',
                }}
              >
                <Box
                  sx={{
                    width: `${progress}%`,
                    height: '100%',
                    bgcolor: 'primary.main',
                    borderRadius: 10,
                    transition: 'width 200ms ease',
                  }}
                />
              </Box>
            </Box>

            <Stepper
              activeStep={step}
              alternativeLabel
              sx={{
                mb: 4,
                '& .MuiStepLabel-label': {
                  fontSize: { xs: 11, sm: 13 },
                  fontWeight: 600,
                },
              }}
            >
              {STEPS.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>

            <Divider sx={{ mb: 3 }} />

            <Stack spacing={3}>
              {formError && (
                <Alert severity="error" onClose={() => setFormError('')}>
                  {formError}
                </Alert>
              )}

              {step === 0 && (
                <>
                  <SectionHeading
                    eyebrow="PERSONAL INFORMATION"
                    title="Let's get to know you"
                    description="First, tell us who will be running this seller account."
                  />

                  <Box>
                    <Typography fontWeight={700} sx={{ mb: 1 }}>
                      What type of seller are you?
                    </Typography>

                    <RadioGroup
                      value={form.accountType}
                      onChange={(event) =>
                        handleChange('accountType', event.target.value)
                      }
                    >
                      <Box
                        sx={{
                          display: 'grid',
                          gridTemplateColumns: {
                            xs: '1fr',
                            sm: '1fr 1fr',
                          },
                          gap: 2,
                        }}
                      >
                        {[
                          {
                            value: 'individual',
                            title: 'Individual',
                            description: 'I am selling as an individual.',
                          },
                          {
                            value: 'company',
                            title: 'Registered business',
                            description: 'I am representing a company.',
                          },
                        ].map((option) => (
                          <Paper
                            key={option.value}
                            variant="outlined"
                            sx={{
                              p: 2,
                              borderRadius: 2,
                              borderColor:
                                form.accountType === option.value
                                  ? 'primary.main'
                                  : 'divider',
                              bgcolor:
                                form.accountType === option.value
                                  ? 'action.selected'
                                  : 'background.paper',
                            }}
                          >
                            <FormControlLabel
                              value={option.value}
                              control={<Radio />}
                              label={
                                <Box>
                                  <Typography fontWeight={700}>
                                    {option.title}
                                  </Typography>
                                  <Typography
                                    variant="body2"
                                    color="text.secondary"
                                  >
                                    {option.description}
                                  </Typography>
                                </Box>
                              }
                              sx={{
                                alignItems: 'flex-start',
                                m: 0,
                                width: '100%',
                              }}
                            />
                          </Paper>
                        ))}
                      </Box>
                    </RadioGroup>

                    {errors.accountType && (
                      <Typography color="error" variant="caption">
                        {errors.accountType}
                      </Typography>
                    )}
                  </Box>

                  <TextField
                    {...field('dateOfBirth')}
                    label="Date of birth"
                    type="date"
                    slotProps={{
                      inputLabel: { shrink: true },
                      htmlInput: {
                        max: new Date().toISOString().slice(0, 10),
                      },
                    }}
                  />

                  <Alert severity="info" sx={{ borderRadius: 2 }}>
                    You must be at least 18 years old to apply. Your account
                    contact details will be used for application communication.
                  </Alert>
                </>
              )}

              {step === 1 && (
                <>
                  <SectionHeading
                    eyebrow="BUSINESS INFORMATION"
                    title="Tell us about your shop"
                    description="Give your shop an identity and tell us where it operates."
                  />

                  <TextField
                    {...field('shopName')}
                    label="Shop name"
                    placeholder="e.g. 2 Valid Electronics"
                    inputProps={{ maxLength: 120 }}
                    required
                  />

                  {form.accountType === 'company' && (
                    <TextField
                      {...field('companyName')}
                      label="Registered company name"
                      placeholder="Enter your registered business name"
                      inputProps={{ maxLength: 150 }}
                      required
                    />
                  )}

                  <Box>
                    <Typography fontWeight={700} sx={{ mb: 1.5 }}>
                      Where is your shop based?
                    </Typography>

                    <Stack
                      direction={{ xs: 'column', sm: 'row' }}
                      spacing={2}
                    >
                      <TextField
                        {...field('county')}
                        label="County"
                        placeholder="e.g. Nairobi"
                        required
                      />

                      <TextField
                        {...field('town')}
                        label="Town"
                        placeholder="e.g. Kasarani"
                        required
                      />
                    </Stack>
                  </Box>

                  <TextField
                    {...field('description')}
                    label="About your shop"
                    placeholder="What products do you plan to sell? Tell customers and our review team about your business."
                    multiline
                    minRows={4}
                    inputProps={{ maxLength: 1000 }}
                    helperText={
                      errors.description ||
                      `${form.description.length}/1000 characters`
                    }
                    error={Boolean(errors.description)}
                  />
                </>
              )}

              {step === 2 && (
                <>
                  <SectionHeading
                    eyebrow="FINAL STEP"
                    title="Review your application"
                    description="Check that your details are accurate before submitting."
                  />

                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: {
                        xs: '1fr',
                        sm: '1fr 1fr',
                      },
                      gap: 1.5,
                    }}
                  >
                    {reviewRows.map(([label, value]) => (
                      <ReviewItem
                        key={label}
                        label={label}
                        value={value}
                      />
                    ))}
                  </Box>

                  <Alert severity="info" sx={{ borderRadius: 2 }}>
                    After submission, you can track your application from the
                    seller application status page.
                  </Alert>

                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={confirmed}
                        onChange={(event) =>
                          setConfirmed(event.target.checked)
                        }
                      />
                    }
                    label={
                      <Typography variant="body2">
                        I confirm that the information provided is accurate
                        and complete.
                      </Typography>
                    }
                    sx={{ alignItems: 'flex-start' }}
                  />
                </>
              )}

              <Divider />

              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                gap={2}
              >
                <Button
                  color="inherit"
                  disabled={step === 0 || submitting}
                  onClick={back}
                >
                  Back
                </Button>

                {step < STEPS.length - 1 ? (
                  <Button
                    variant="contained"
                    onClick={next}
                    sx={{
                      px: 4,
                      py: 1.2,
                      borderRadius: 2,
                      fontWeight: 700,
                    }}
                  >
                    Continue
                  </Button>
                ) : (
                  <Button
                    variant="contained"
                    
                    onClick={submit}
                    disabled={!confirmed || submitting}
                    sx={{
                      px: 3,
                      py: 1.2,
                      borderRadius: 2,
                      fontWeight: 700,
                    }}
                  >
                    {submitting ? 'Submitting...' : submitLabel}
                  </Button>
                )}
              </Stack>
            </Stack>
          </Paper>

          <Stack spacing={2}>
            <Paper
              variant="outlined"
              sx={{
                p: 3,
                borderRadius: 3,
                bgcolor: 'background.paper',
              }}
            >
              <Typography variant="h6" fontWeight={800}>
                Your seller journey
              </Typography>

              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 1, mb: 2.5, lineHeight: 1.7 }}
              >
                Complete your application and follow its progress from your
                seller status page.
              </Typography>

              {[
                ['01', 'Complete your application', 'Provide your personal and shop details.'],
                ['02', 'Application review', 'Your application is reviewed by the 2 Valid team.'],
                ['03', 'Seller dashboard', 'Approved sellers can access their seller workspace.'],
              ].map(([number, title, description], index) => (
                <Stack
                  key={number}
                  direction="row"
                  spacing={1.5}
                  sx={{ mb: index === 2 ? 0 : 2.5 }}
                >
                  <Box
                    sx={{
                      width: 34,
                      height: 34,
                      flexShrink: 0,
                      borderRadius: '50%',
                      display: 'grid',
                      placeItems: 'center',
                      bgcolor: 'action.selected',
                      color: 'primary.main',
                      fontWeight: 800,
                      fontSize: 13,
                    }}
                  >
                    {number}
                  </Box>

                  <Box>
                    <Typography fontWeight={700}>
                      {title}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mt: 0.4, lineHeight: 1.6 }}
                    >
                      {description}
                    </Typography>
                  </Box>
                </Stack>
              ))}
            </Paper>

            <Paper
              variant="outlined"
              sx={{ p: 3, borderRadius: 3 }}
            >
              <Typography fontWeight={800}>
                Need to check your application?
              </Typography>

              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 1, mb: 2, lineHeight: 1.7 }}
              >
                You can return to your application status page to see the
                latest status and available actions.
              </Typography>

              <Button
                component={RouterLink}
                to="/seller/application-status"
                variant="outlined"
                fullWidth
                sx={{ borderRadius: 2 }}
              >
                View application status
              </Button>
            </Paper>
          </Stack>
        </Box>
      </Container>
    </Box>
  );
}
