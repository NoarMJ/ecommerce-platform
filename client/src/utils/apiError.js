
export const apiErrorMessage = (error, fallback = 'Something went wrong. Please try again.') => {
  if (!error) return fallback;

  if (typeof error === 'string') return error;

  return (
    error?.data?.message ||
    error?.data?.error ||
    error?.error ||
    error?.message ||
    fallback
  );
};

export const apiFieldErrors = (error) => {
  const errors = error?.data?.errors;

  if (!errors) return {};

  // Handle array-based validation errors
  if (Array.isArray(errors)) {
    return errors.reduce((result, item) => {
      if (item.field) {
        result[item.field] = item.message;
      }
      return result;
    }, {});
  }

  // Handle object-based validation errors
  return errors;
};
