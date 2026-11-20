
import { Box, CircularProgress, Typography } from '@mui/material';

const PageSpinner = ({ message = 'Loading...' }) => {
  return (
    <Box
      sx={{
        minHeight: '60vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
      }}
    >
      <CircularProgress size={36} />
      <Typography color="text.secondary">
        {message}
      </Typography>
    </Box>
  );
};

export default PageSpinner;
