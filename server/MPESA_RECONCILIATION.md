# M-Pesa receipt reconciliation

The payment page can submit a customer-provided M-Pesa receipt code for an
unresolved prompt. The code is not treated as proof of payment: Daraja's
Transaction Status API must return a successful result for the configured
merchant shortcode, matching the receipt, order amount, and prompt phone when
Safaricom includes the payer number. The result callback updates the order and
notifies the customer's existing Socket.IO room.

Configure these additional server environment variables:

- `MPESA_INITIATOR_NAME`: the Daraja API initiator configured for Transaction
  Status queries.
- `MPESA_SECURITY_CREDENTIAL`: that initiator's password encrypted with the
  Safaricom certificate for the selected environment. Do not put the raw
  password here.
- `MPESA_CALLBACK_BASE_URL`: the public HTTPS base URL that Safaricom can reach.
  It must route to this server and include no trailing slash.
- `MPESA_CALLBACK_SECRET`: the existing callback URL secret, also used for
  transaction status result and timeout callbacks.

The Daraja account must be enabled for the Transaction Status API. Apply the
Prisma migration with `npx prisma migrate deploy` after configuring
`DATABASE_URL`, then regenerate Prisma Client with `npx prisma generate` if your
deployment process does not already do so.
