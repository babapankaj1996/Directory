import nodemailer from 'nodemailer';

function isProduction() {
  return process.env.NODE_ENV === 'production';
}

function boolEnv(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(String(value).trim().toLowerCase());
}

function smtpConfig() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  if (!host) return null;

  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  return {
    host,
    port,
    secure: boolEnv(process.env.SMTP_SECURE, port === 465),
    auth: user && pass ? { user, pass } : undefined
  };
}

function fromAddress() {
  return process.env.SMTP_FROM || process.env.MAIL_FROM || 'Directory <no-reply@localhost>';
}

function shouldLogOnly() {
  return String(process.env.MAIL_DELIVERY || '').trim().toLowerCase() === 'log';
}

function mailHtml({ title, intro, actionLabel, actionUrl, footer }) {
  return `
    <div style="margin:0;background:#f8fafc;padding:32px;font-family:Arial,sans-serif;color:#172033">
      <div style="max-width:560px;margin:0 auto;border:1px solid #e5e7eb;border-radius:24px;background:#ffffff;padding:28px;box-shadow:0 20px 60px rgba(15,23,42,.08)">
        <p style="margin:0 0 12px;color:#b68b2d;font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase">Directory account</p>
        <h1 style="margin:0 0 16px;font-size:26px;line-height:1.2;color:#172033">${title}</h1>
        <p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:#526071">${intro}</p>
        <a href="${actionUrl}" style="display:inline-block;border-radius:16px;background:#172033;padding:14px 20px;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none">${actionLabel}</a>
        <p style="margin:24px 0 0;font-size:12px;line-height:1.6;color:#64748b">If the button does not work, open this link:<br><a href="${actionUrl}" style="color:#b68b2d">${actionUrl}</a></p>
        <p style="margin:20px 0 0;font-size:12px;line-height:1.6;color:#94a3b8">${footer}</p>
      </div>
    </div>
  `;
}

async function deliver({ kind, to, subject, text, html, actionUrl, replyTo }) {
  const config = smtpConfig();

  if (shouldLogOnly() || !config) {
    const reason = shouldLogOnly() ? 'MAIL_DELIVERY=log' : 'SMTP is not configured';
    console.log(`[mail:${kind}:log] ${to} -> ${actionUrl || subject} (${reason})`);
    return {
      delivered: false,
      delivery: 'log',
      reason,
      actionUrl: !isProduction() ? actionUrl : undefined
    };
  }

  try {
    const transporter = nodemailer.createTransport(config);
    const info = await transporter.sendMail({
      from: fromAddress(),
      to,
      subject,
      text,
      html,
      replyTo
    });
    console.log(`[mail:${kind}:sent] ${to} ${info.messageId || ''}`.trim());
    return { delivered: true, delivery: 'smtp', messageId: info.messageId };
  } catch (error) {
    console.error(`[mail:${kind}:error] ${to}`, error);
    return {
      delivered: false,
      delivery: 'error',
      reason: error instanceof Error ? error.message : 'Email delivery failed',
      actionUrl: !isProduction() ? actionUrl : undefined
    };
  }
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function publicMailStatus(result) {
  if (!result) return undefined;
  const message = result.delivered
    ? 'Email sent.'
    : result.delivery === 'log'
      ? 'Email delivery is in local log mode. Use the development link or configure SMTP.'
      : 'Email could not be delivered. Check SMTP settings.';

  return {
    delivered: result.delivered,
    delivery: result.delivery,
    message,
    reason: !isProduction() ? result.reason : undefined
  };
}

export async function sendVerificationEmail({ to, name, verifyUrl }) {
  return deliver({
    kind: 'verify-email',
    to,
    subject: 'Verify your directory account',
    actionUrl: verifyUrl,
    text: `Hi ${name || 'there'}, verify your account by opening this link: ${verifyUrl}`,
    html: mailHtml({
      title: 'Verify your email address',
      intro: `Hi ${name || 'there'}, please verify your email before posting reviews or managing business listings.`,
      actionLabel: 'Verify Email',
      actionUrl: verifyUrl,
      footer: 'This verification link expires in 24 hours.'
    })
  });
}

export async function sendPasswordResetEmail({ to, name, resetUrl }) {
  return deliver({
    kind: 'password-reset',
    to,
    subject: 'Reset your directory password',
    actionUrl: resetUrl,
    text: `Hi ${name || 'there'}, reset your password by opening this link: ${resetUrl}`,
    html: mailHtml({
      title: 'Reset your password',
      intro: `Hi ${name || 'there'}, use this secure link to set a new password for your directory account.`,
      actionLabel: 'Reset Password',
      actionUrl: resetUrl,
      footer: 'This reset link expires in 2 hours. Ignore this email if you did not request it.'
    })
  });
}

export async function sendLeadNotificationEmail({ to, profileName, lead, dashboardUrl }) {
  const service = lead.serviceNeeded || 'Service request';
  const preferred = [lead.preferredDate, lead.preferredTime].filter(Boolean).join(' ');
  const lines = [
    `New request for ${profileName}`,
    `Name: ${lead.name}`,
    `Phone: ${lead.phone}`,
    lead.email ? `Email: ${lead.email}` : undefined,
    lead.whatsapp ? `WhatsApp: ${lead.whatsapp}` : undefined,
    lead.budget ? `Budget: ${lead.budget}` : undefined,
    lead.timeline ? `Timeline: ${lead.timeline}` : undefined,
    lead.contactPreference ? `Preferred contact: ${lead.contactPreference}` : undefined,
    service ? `Service: ${service}` : undefined,
    preferred ? `Preferred time: ${preferred}` : undefined,
    lead.message ? `Message: ${lead.message}` : undefined
  ].filter(Boolean);

  return deliver({
    kind: 'lead-notification',
    to,
    subject: `New service request for ${profileName}`,
    actionUrl: dashboardUrl,
    replyTo: lead.email || undefined,
    text: `${lines.join('\n')}\n\nOpen dashboard: ${dashboardUrl}`,
    html: `
      <div style="margin:0;background:#f8fafc;padding:32px;font-family:Arial,sans-serif;color:#172033">
        <div style="max-width:620px;margin:0 auto;border:1px solid #e5e7eb;border-radius:24px;background:#ffffff;padding:28px;box-shadow:0 20px 60px rgba(15,23,42,.08)">
          <p style="margin:0 0 12px;color:#b68b2d;font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase">New lead</p>
          <h1 style="margin:0 0 16px;font-size:26px;line-height:1.2;color:#172033">${escapeHtml(profileName)}</h1>
          <table style="width:100%;border-collapse:collapse;font-size:14px;color:#526071">
            ${[
              ['Name', lead.name],
              ['Phone', lead.phone],
              ['Email', lead.email],
              ['WhatsApp', lead.whatsapp],
              ['Budget', lead.budget],
              ['Timeline', lead.timeline],
              ['Preferred contact', lead.contactPreference],
              ['Service', service],
              ['Preferred time', preferred],
              ['Message', lead.message]
            ].filter(([, value]) => value).map(([label, value]) => `
              <tr>
                <td style="width:140px;padding:10px 0;color:#172033;font-weight:700;vertical-align:top">${escapeHtml(label)}</td>
                <td style="padding:10px 0;line-height:1.6">${escapeHtml(value)}</td>
              </tr>
            `).join('')}
          </table>
          <a href="${dashboardUrl}" style="display:inline-block;margin-top:22px;border-radius:16px;background:#172033;padding:14px 20px;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none">Open Lead Inbox</a>
        </div>
      </div>
    `
  });
}

export async function sendFeaturedRequestEmail({ to, ownerName, ownerEmail, profile, profileUrl, adminUrl, requestedDays, requestedPage, requestedPagePath }) {
  const lines = [
    `Featured placement request`,
    `Business: ${profile.name}`,
    `Owner: ${ownerName || profile.ownerName}`,
    ownerEmail ? `Owner email: ${ownerEmail}` : undefined,
    requestedDays ? `Requested duration: ${requestedDays} days` : undefined,
    requestedPage ? `Requested page: ${requestedPagePath || requestedPage}` : undefined,
    `Category: ${profile.category?.name || profile.categoryId}`,
    `City: ${profile.city?.name || profile.cityId}`,
    `Profile: ${profileUrl}`,
    `Admin review: ${adminUrl}`
  ].filter(Boolean);

  return deliver({
    kind: 'featured-request',
    to,
    subject: `Featured placement request: ${profile.name}`,
    actionUrl: adminUrl,
    replyTo: ownerEmail || undefined,
    text: lines.join('\n'),
    html: `
      <div style="margin:0;background:#f8fafc;padding:32px;font-family:Arial,sans-serif;color:#172033">
        <div style="max-width:620px;margin:0 auto;border:1px solid #e5e7eb;border-radius:24px;background:#ffffff;padding:28px;box-shadow:0 20px 60px rgba(15,23,42,.08)">
          <p style="margin:0 0 12px;color:#b68b2d;font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase">Featured listing request</p>
          <h1 style="margin:0 0 16px;font-size:26px;line-height:1.2;color:#172033">${escapeHtml(profile.name)}</h1>
          <table style="width:100%;border-collapse:collapse;font-size:14px;color:#526071">
            ${[
              ['Owner', ownerName || profile.ownerName],
              ['Owner email', ownerEmail],
              ['Requested duration', requestedDays ? `${requestedDays} days` : undefined],
              ['Requested page', requestedPagePath || requestedPage],
              ['Category', profile.category?.name || profile.categoryId],
              ['City', profile.city?.name || profile.cityId],
              ['Profile URL', profileUrl]
            ].filter(([, value]) => value).map(([label, value]) => `
              <tr>
                <td style="width:140px;padding:10px 0;color:#172033;font-weight:700;vertical-align:top">${escapeHtml(label)}</td>
                <td style="padding:10px 0;line-height:1.6">${escapeHtml(value)}</td>
              </tr>
            `).join('')}
          </table>
          <a href="${adminUrl}" style="display:inline-block;margin-top:22px;border-radius:16px;background:#172033;padding:14px 20px;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none">Open Listing</a>
        </div>
      </div>
    `
  });
}
