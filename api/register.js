/**
 * Partnerschaft India — Vendor Registration Email Handler
 * Vercel Serverless Function (Node.js)
 *
 * Sends:
 *  1. Personalised confirmation email → registrant
 *  2. Full registration details → business@partnerschaft.in
 *
 * SMTP: Titan Email (smtp.titan.email)
 * Env vars required in Vercel:
 *   TITAN_PASS  — password for business@partnerschaft.in
 */

const nodemailer = require('nodemailer');

// ─── CORS helper ──────────────────────────────────────────────────────────────
function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://www.partnerschaft.in');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

// ─── SMTP transporter ─────────────────────────────────────────────────────────
function createTransport() {
  return nodemailer.createTransport({
    host: 'smtp.titan.email',
    port: 587,
    secure: false,          // STARTTLS
    auth: {
      user: 'business@partnerschaft.in',
      pass: process.env.TITAN_PASS,
    },
    tls: { rejectUnauthorized: true },
  });
}

// ─── Email: Confirmation to registrant ────────────────────────────────────────
function confirmationEmail(data) {
  const firstName = (data.contact_name || '').split(' ')[0] || 'there';
  const serviceLabel = data.service_type === 'Free — Directory Listing'
    ? 'Free Directory Listing (search-based discovery)'
    : 'Paid — Managed Requirement Routing';

  return {
    from: '"Partnerschaft India" <business@partnerschaft.in>',
    to: data.email,
    replyTo: 'business@partnerschaft.in',
    subject: `Welcome to Partnerschaft India — Registration Received`,
    html: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Registration Received — Partnerschaft India</title>
</head>
<body style="margin:0;padding:0;background:#F2F4F7;font-family:'Inter',Arial,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" style="background:#F2F4F7;padding:32px 16px;">
  <tr><td align="center">
  <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

    <!-- Header -->
    <tr>
      <td style="background:#0D1830;border-radius:8px 8px 0 0;padding:28px 40px;text-align:center;">
        <p style="margin:0;font-family:'Montserrat',Arial,sans-serif;font-size:22px;font-weight:800;color:#FFFFFF;letter-spacing:.04em;">PARTNERSCHAFT</p>
        <p style="margin:6px 0 0;font-size:11px;color:rgba(255,255,255,.55);letter-spacing:.12em;text-transform:uppercase;">Partnering for Growth</p>
        <div style="width:40px;height:3px;background:#D11A1A;margin:14px auto 0;border-radius:2px;"></div>
      </td>
    </tr>

    <!-- Body -->
    <tr>
      <td style="background:#FFFFFF;padding:40px 40px 32px;">
        <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#D11A1A;letter-spacing:.1em;text-transform:uppercase;">Registration Received</p>
        <h1 style="margin:0 0 20px;font-family:'Montserrat',Arial,sans-serif;font-size:24px;font-weight:800;color:#0D1830;line-height:1.3;">
          Welcome to the network, ${firstName}.
        </h1>
        <p style="margin:0 0 20px;font-size:15px;color:#4B5563;line-height:1.7;">
          Thank you for registering <strong style="color:#0D1830;">${data.org_name}</strong> with Partnerschaft India.
          We've received your details and our team will review your profile within <strong>2–3 business days</strong>.
        </p>

        <!-- Summary box -->
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#F2F4F7;border-radius:8px;margin-bottom:28px;">
          <tr><td style="padding:24px 28px;">
            <p style="margin:0 0 16px;font-family:'Montserrat',Arial,sans-serif;font-size:12px;font-weight:700;color:#0D1830;letter-spacing:.1em;text-transform:uppercase;">Your Registration Summary</p>
            ${summaryRow('Organisation', data.org_name)}
            ${summaryRow('Contact', `${data.contact_name}, ${data.designation}`)}
            ${summaryRow('Company Type', data.company_type)}
            ${summaryRow('Service Type', serviceLabel)}
            ${summaryRow('Domains', data.domains)}
            ${summaryRow('Coverage', data.coverage_area)}
            ${data.gst_number ? summaryRow('GSTIN', data.gst_number) : ''}
          </td></tr>
        </table>

        <!-- What happens next -->
        <p style="margin:0 0 12px;font-family:'Montserrat',Arial,sans-serif;font-size:12px;font-weight:700;color:#0D1830;letter-spacing:.1em;text-transform:uppercase;">What Happens Next</p>
        ${step('1', 'Profile Review', 'Our team reviews your submission and verifies the details within 2–3 business days.')}
        ${step('2', 'Onboarding Call', 'We will reach out to you on <strong>${data.mobile}</strong> or <strong>${data.email}</strong> to discuss fit and next steps.')}
        ${step('3', 'Network Activation', 'Your organisation is listed in the Partnerschaft vendor network and starts receiving relevant briefs.')}

        <p style="margin:28px 0 0;font-size:14px;color:#6B7280;line-height:1.7;">
          Questions? Reply to this email or write to
          <a href="mailto:business@partnerschaft.in" style="color:#0D1830;font-weight:600;text-decoration:none;">business@partnerschaft.in</a>
        </p>
      </td>
    </tr>

    <!-- Signature -->
    <tr>
      <td style="background:#FFFFFF;padding:0 40px 36px;border-top:1px solid #F2F4F7;">
        <p style="margin:0;font-size:14px;color:#1A1A1A;line-height:1.7;">
          Warm regards,<br>
          <strong>BK Satpathy</strong><br>
          <span style="color:#6B7280;">Founder, Partnerschaft India</span><br>
          <span style="color:#D11A1A;font-size:12px;font-style:italic;">Partnering for Growth</span>
        </p>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background:#0D1830;border-radius:0 0 8px 8px;padding:20px 40px;text-align:center;">
        <p style="margin:0;font-size:12px;color:rgba(255,255,255,.45);">
          © 2025 Partnerschaft India ·
          <a href="https://www.partnerschaft.in" style="color:rgba(255,255,255,.55);text-decoration:none;">partnerschaft.in</a>
        </p>
        <p style="margin:8px 0 0;font-size:11px;color:rgba(255,255,255,.3);">
          You received this because you registered at partnerschaft.in. This is not a marketing email.
        </p>
      </td>
    </tr>

  </table>
  </td></tr>
</table>
</body>
</html>`,
  };
}

function summaryRow(label, value) {
  if (!value) return '';
  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:10px;">
    <tr>
      <td width="130" style="font-size:12px;font-weight:600;color:#6B7280;vertical-align:top;padding-right:12px;">${label}</td>
      <td style="font-size:13px;color:#0D1830;font-weight:500;">${value}</td>
    </tr>
  </table>`;
}

function step(num, title, desc) {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:14px;">
    <tr>
      <td width="32" style="vertical-align:top;padding-right:14px;">
        <div style="width:28px;height:28px;background:#0D1830;border-radius:50%;text-align:center;line-height:28px;font-family:'Montserrat',Arial,sans-serif;font-size:12px;font-weight:700;color:#FFFFFF;">${num}</div>
      </td>
      <td style="vertical-align:top;">
        <p style="margin:0 0 3px;font-size:13px;font-weight:700;color:#0D1830;">${title}</p>
        <p style="margin:0;font-size:13px;color:#6B7280;line-height:1.6;">${desc}</p>
      </td>
    </tr>
  </table>`;
}

// ─── Email: Internal notification to BK ───────────────────────────────────────
function internalNotification(data) {
  const rows = [
    ['Organisation', data.org_name],
    ['Company Type', data.company_type],
    ['Year Established', data.year_est],
    ['Annual Turnover', data.turnover || 'Not specified'],
    ['Contact Person', data.contact_name],
    ['Designation', data.designation],
    ['Mobile', data.mobile],
    ['Email', data.email],
    ['Website', data.website || 'Not provided'],
    ['Coverage Area', data.coverage_area],
    ['Service Type', data.service_type],
    ['Domains', data.domains],
    ['GST Number', data.gst_number || 'Not provided'],
    ['GST State', data.gst_state || 'Not specified'],
    ['Turnover', data.turnover || 'Not specified'],
    ['Profile', data.company_profile],
  ];

  const tableRows = rows.map(([k, v]) =>
    `<tr><td style="padding:8px 12px;font-size:12px;font-weight:600;color:#6B7280;border-bottom:1px solid #F2F4F7;width:150px;">${k}</td><td style="padding:8px 12px;font-size:13px;color:#1A1A1A;border-bottom:1px solid #F2F4F7;">${v || '—'}</td></tr>`
  ).join('');

  return {
    from: '"Partnerschaft Registration" <business@partnerschaft.in>',
    to: 'business@partnerschaft.in',
    subject: `🆕 New Vendor Registration — ${data.org_name} (${data.service_type})`,
    html: `<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="font-family:Arial,sans-serif;background:#F2F4F7;padding:24px;">
<div style="max-width:640px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">
  <div style="background:#D11A1A;padding:20px 28px;">
    <p style="margin:0;font-size:16px;font-weight:700;color:#fff;">New Vendor Registration</p>
    <p style="margin:4px 0 0;font-size:13px;color:rgba(255,255,255,.75);">${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'full', timeStyle: 'short' })} IST</p>
  </div>
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:8px 16px;">
    ${tableRows}
  </table>
  <div style="padding:16px 28px;background:#F2F4F7;border-top:1px solid #e5e7eb;">
    <p style="margin:0;font-size:12px;color:#9CA3AF;">Submitted via partnerschaft.in/register.html</p>
  </div>
</div>
</body></html>`,
  };
}

// ─── Handler ───────────────────────────────────────────────────────────────────
module.exports = async function handler(req, res) {
  setCors(res);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check env
  if (!process.env.TITAN_PASS) {
    console.error('TITAN_PASS env var not set');
    return res.status(500).json({ error: 'Server misconfigured. Contact business@partnerschaft.in' });
  }

  let data;
  try {
    data = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).json({ error: 'Invalid request body' });
  }

  // Basic server-side validation
  const required = ['org_name', 'contact_name', 'designation', 'mobile', 'email', 'coverage_area', 'service_type', 'domains', 'company_profile'];
  for (const field of required) {
    if (!data[field] || !data[field].toString().trim()) {
      return res.status(400).json({ error: `Missing required field: ${field}` });
    }
  }

  if (!/^[6-9]\d{9}$/.test(data.mobile)) {
    return res.status(400).json({ error: 'Invalid mobile number' });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    return res.status(400).json({ error: 'Invalid email address' });
  }

  try {
    const transporter = createTransport();

    // Verify SMTP connection
    await transporter.verify();

    // Send both emails
    await Promise.all([
      transporter.sendMail(confirmationEmail(data)),
      transporter.sendMail(internalNotification(data)),
    ]);

    console.log(`Registration processed: ${data.org_name} <${data.email}>`);
    return res.status(200).json({ success: true, message: 'Registration submitted successfully.' });

  } catch (err) {
    console.error('Email send error:', err.message);
    return res.status(500).json({
      error: 'Failed to send confirmation email. Please try again or contact business@partnerschaft.in',
      detail: err.message,
    });
  }
};
