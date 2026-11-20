// Helpers for writing payment events to the server log without personal data.
// Phone numbers and receipt codes are looked up in the database by payment ID
// when staff need them.

// "QK12ABC3DE" -> "QK1*****DE": enough to tell codes apart in a log.
const maskReceipt = (receipt) => {
  const text = String(receipt ?? '');
  return text.length > 5 ? `${text.slice(0, 3)}*****${text.slice(-2)}` : '*****';
};

// One line about an error, without the data it was handling. Prisma error
// messages repeat the query's arguments (phone numbers, callback bodies), so
// for those only the error class, code and affected fields are logged.
const describeError = (error) => {
  if (!error) return 'Unknown error';
  if (String(error.name).startsWith('PrismaClient')) {
    const target = error.meta?.target ? ` on ${[].concat(error.meta.target).join(', ')}` : '';
    return `${error.name}${error.code ? ` ${error.code}` : ''}${target}`;
  }
  const message = String(error.message ?? error).split('\n')[0].slice(0, 300);
  const where = error.stack?.split('\n')[1]?.trim();
  return `${error.name ?? 'Error'}: ${message}${where ? ` (${where})` : ''}`;
};

module.exports = { maskReceipt, describeError };
