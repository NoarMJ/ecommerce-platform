// Interactive transactions default to a 5 s timeout. Some of ours run several
// queries against a remote database, so give them the same limit checkout uses.
module.exports = { maxWait: 5000, timeout: 15000 };
