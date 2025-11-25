const nodemailer = require("nodemailer");

const sendEmail = async (to, subject, text, html) => {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"Poblacion Pares ATBP" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
      html,
    });

    console.log(`📧 Email sent to ${to}`);
  } catch (error) {
    console.error("❌ Email sending failed:", error);
    throw error;
  }
};

// Branded email template for verification code (matches login page styling)
const getVerificationEmailTemplate = (fullName, verificationCode) => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Email Verification - Harmony Hub</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f4;">
      <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f4f4f4;">
        <tr>
          <td align="center" style="padding: 48px 16px;">
            <table role="presentation" style="max-width: 560px; width: 100%; border-collapse: collapse; border-radius: 32px; background-color: #101010; overflow: hidden; border: 1px solid rgba(255,255,255,0.08);">
              <tr>
                <td style="background: linear-gradient(135deg, #bf595a 0%, #8c3435 100%); padding: 40px 32px; text-align: center;">
                  <p style="margin: 0; font-size: 13px; letter-spacing: 6px; color: rgba(255,255,255,0.7); text-transform: uppercase;">
                    Poblacion Pares ATBP.
                  </p>
                  <h1 style="margin: 12px 0 0; font-size: 34px; font-weight: 700; color: #ffffff;">
                    Welcome to PoblaGO
                  </h1>
                  <p style="margin: 12px 0 0; color: rgba(255,255,255,0.85); font-size: 16px;">
                    Secure your new account in just one step.
                  </p>
                </td>
              </tr>
              <tr>
                <td style="padding: 40px 32px; background-color: #181818;">
                  <p style="margin: 0 0 12px; color: #f4f4f4; font-size: 24px; font-weight: 600;">
                    Hi ${fullName},
                  </p>
                  <p style="margin: 0 0 24px; color: rgba(255,255,255,0.78); font-size: 15px; line-height: 1.6;">
                    Thanks for creating an account with PoblaGO. Use the verification code below to finish setting up your profile and start ordering your favorites.
                  </p>
                  <div style="background-color: #0f0f0f; border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 28px; text-align: center;">
                    <p style="margin: 0 0 16px; color: rgba(255,255,255,0.65); letter-spacing: 0.2em; font-size: 12px; text-transform: uppercase;">
                      Verification Code
                    </p>
                    <p style="margin: 0; font-size: 40px; letter-spacing: 0.3em; color: #bf595a; font-weight: 700;">
                      ${verificationCode}
                    </p>
                    <p style="margin: 16px 0 0; color: rgba(255,255,255,0.55); font-size: 13px;">
                      Code expires in 10 minutes.
                    </p>
                  </div>
                  <p style="margin: 28px 0 0; color: rgba(255,255,255,0.65); font-size: 14px; line-height: 1.6;">
                    Didn’t initiate this request? Ignore this email or reach out to our support team and we’ll make sure everything’s secure.
                  </p>
                </td>
              </tr>
              <tr>
                <td style="padding: 24px 32px; background-color: #0d0d0d; border-top: 1px solid rgba(255,255,255,0.05); text-align: center;">
                  <p style="margin: 0; color: rgba(255,255,255,0.6); font-size: 13px;">
                    Need help? Email us at
                    <a href="mailto:support@pobla-go.com" style="color: #bf595a; text-decoration: none; font-weight: 600;">support@pobla-go.com</a>
                  </p>
                  <p style="margin: 8px 0 0; color: rgba(255,255,255,0.45); font-size: 12px;">
                    © ${new Date().getFullYear()} Poblacion Pares ATBP. All rights reserved.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
};

// Branded welcome email template (matches login page styling)
const getWelcomeEmailTemplate = (fullName, email) => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to Harmony Hub</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f4;">
      <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f4f4f4;">
        <tr>
          <td align="center" style="padding: 48px 16px;">
            <table role="presentation" style="max-width: 560px; width: 100%; border-collapse: collapse; border-radius: 32px; background-color: #101010; overflow: hidden; border: 1px solid rgba(255,255,255,0.08);">
              <tr>
                <td style="background: linear-gradient(135deg, #bf595a 0%, #f2b25d 100%); padding: 44px 32px; text-align: center;">
                  <p style="margin: 0; font-size: 13px; letter-spacing: 6px; color: rgba(255,255,255,0.75); text-transform: uppercase;">
                    Poblacion Pares ATBP.
                  </p>
                  <h1 style="margin: 12px 0 0; font-size: 34px; font-weight: 700; color: #ffffff;">
                    You're In, ${fullName}! 🎉
                  </h1>
                  <p style="margin: 12px 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">
                    PoblaGO is ready whenever you are.
                  </p>
                </td>
              </tr>
              <tr>
                <td style="padding: 40px 32px; background-color: #181818;">
                  <p style="margin: 0 0 20px; color: rgba(255,255,255,0.78); font-size: 16px; line-height: 1.7;">
                    Your email <strong style="color: #ffffff;">${email}</strong> is now verified. Grab a seat, explore menus, and keep an eye on order updates right from your dashboard.
                  </p>
                  <div style="display: flex; gap: 16px; flex-wrap: wrap; margin: 0 0 28px;">
                    <div style="flex: 1 1 160px; background-color: #0f0f0f; border-radius: 18px; padding: 18px; border: 1px solid rgba(255,255,255,0.08);">
                      <p style="margin: 0; color: rgba(255,255,255,0.65); font-size: 13px;">Next Up</p>
                      <p style="margin: 6px 0 0; color: #ffffff; font-size: 18px; font-weight: 600;">Customize your profile</p>
                    </div>
                    <div style="flex: 1 1 160px; background-color: #0f0f0f; border-radius: 18px; padding: 18px; border: 1px solid rgba(255,255,255,0.08);">
                      <p style="margin: 0; color: rgba(255,255,255,0.65); font-size: 13px;">Hungry?</p>
                      <p style="margin: 6px 0 0; color: #ffffff; font-size: 18px; font-weight: 600;">Browse the menu</p>
                    </div>
                  </div>
                  <p style="margin: 0; color: rgba(255,255,255,0.65); font-size: 14px; line-height: 1.7;">
                    Need a hand? We’re always here — just hit reply or message support.
                  </p>
                </td>
              </tr>
              <tr>
                <td style="padding: 24px 32px; background-color: #0d0d0d; border-top: 1px solid rgba(255,255,255,0.05); text-align: center;">
                  <p style="margin: 0; color: rgba(255,255,255,0.6); font-size: 13px;">
                    With gratitude,<br/>
                    <strong style="color: #ffffff;">The PoblaGO Crew</strong>
                  </p>
                  <p style="margin: 10px 0 0; color: rgba(255,255,255,0.45); font-size: 12px;">
                    © ${new Date().getFullYear()} Poblacion Pares ATBP. All rights reserved.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
};

module.exports = sendEmail;
module.exports.getVerificationEmailTemplate = getVerificationEmailTemplate;
module.exports.getWelcomeEmailTemplate = getWelcomeEmailTemplate;
