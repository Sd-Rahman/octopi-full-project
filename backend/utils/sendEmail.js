import nodemailer from 'nodemailer';

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  if (!process.env.SMTP_HOST) {
    // No SMTP configured — return null so callers fall back to console logging.
    // This means the app is fully runnable/demoable without ever setting up
    // real email, which matters a lot for a 2-day take-home.
    return null;
  }

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  return transporter;
}

// Never throws — a failed/unsent email should never break the actual
// business operation (e.g. a payment succeeding) that triggered it.
export const sendEmail = async ({ to, subject, text }) => {
  const t = getTransporter();

  if (!t) {
    console.log(`[email:dev-mode] to=${to} subject="${subject}"\n${text}`);
    return;
  }

  try {
    await t.sendMail({ from: process.env.SMTP_FROM || 'no-reply@octopi.dev', to, subject, text });
  } catch (err) {
    console.error(`[email] failed to send to ${to}: ${err.message}`);
  }
};
