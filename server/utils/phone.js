// Accepts 07XXXXXXXX, 01XXXXXXXX, 2547XXXXXXXX, +2547XXXXXXXX.
// Returns +254XXXXXXXXX, or null if invalid.
const normaliseKenyanPhone = (raw) => {
  const cleaned = String(raw || '').replace(/[\s-]/g, '');
  const match = cleaned.match(/^(?:\+?254|0)([17]\d{8})$/);
  return match ? `+254${match[1]}` : null;
};

module.exports = { normaliseKenyanPhone };