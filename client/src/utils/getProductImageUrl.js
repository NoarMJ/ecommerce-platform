
const getProductImageUrl = (image) => {
  if (!image) {
    return '';
  }

  if (typeof image === 'string') {
    return image;
  }

  return image.url || '';
};

export default getProductImageUrl;
