import nodemailer from 'nodemailer';
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for 587
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});
const FROM = process.env.SMTP_FROM || '"SafePath" <noreply@safepath.app>';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3002';
export class EmailService {
    static async sendVerificationEmail(to, token) {
        const verifyUrl = `${FRONTEND_URL}/verify-email?token=${token}`;
        await transporter.sendMail({
            from: FROM,
            to,
            subject: 'Verify your SafePath account',
            html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
          </head>
          <body style="margin:0;padding:0;background:#0f172a;font-family:'Segoe UI',system-ui,sans-serif;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:40px 20px;">
              <tr>
                <td align="center">
                  <table width="560" cellpadding="0" cellspacing="0" style="background:#1e293b;border-radius:16px;border:1px solid #334155;overflow:hidden;">
                    <!-- Header -->
                    <tr>
                      <td style="background:linear-gradient(135deg,#3b82f6,#6366f1);padding:32px;text-align:center;">
                        <h1 style="margin:0;color:#fff;font-size:24px;font-weight:800;letter-spacing:-0.5px;">🛡️ SafePath</h1>
                        <p style="margin:8px 0 0;color:rgba(255,255,255,0.75);font-size:14px;">Community Safety Platform</p>
                      </td>
                    </tr>
                    <!-- Body -->
                    <tr>
                      <td style="padding:40px 36px;">
                        <h2 style="margin:0 0 12px;color:#f1f5f9;font-size:20px;font-weight:700;">Confirm your email address</h2>
                        <p style="margin:0 0 28px;color:#94a3b8;font-size:15px;line-height:1.6;">
                          Thanks for signing up! Click the button below to verify your email and activate your account. This link expires in <strong style="color:#e2e8f0;">24 hours</strong>.
                        </p>
                        <table width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td align="center">
                              <a href="${verifyUrl}"
                                 style="display:inline-block;background:linear-gradient(135deg,#3b82f6,#6366f1);color:#fff;font-weight:700;font-size:15px;text-decoration:none;padding:14px 36px;border-radius:10px;letter-spacing:0.3px;">
                                Verify Email Address
                              </a>
                            </td>
                          </tr>
                        </table>
                        <p style="margin:28px 0 0;color:#64748b;font-size:13px;line-height:1.6;">
                          Or copy and paste this URL into your browser:<br />
                          <a href="${verifyUrl}" style="color:#3b82f6;word-break:break-all;">${verifyUrl}</a>
                        </p>
                        <hr style="border:none;border-top:1px solid #334155;margin:28px 0;" />
                        <p style="margin:0;color:#475569;font-size:12px;">
                          If you didn't create a SafePath account, you can safely ignore this email.
                        </p>
                      </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                      <td style="padding:20px 36px;background:#0f172a;text-align:center;">
                        <p style="margin:0;color:#334155;font-size:12px;">© ${new Date().getFullYear()} SafePath · Iba, Zambales</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
        });
    }
    static async sendPasswordResetEmail(to, otp) {
        await transporter.sendMail({
            from: FROM,
            to,
            subject: 'Reset your SafePath password',
            html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
          </head>
          <body style="margin:0;padding:0;background:#0f172a;font-family:'Segoe UI',system-ui,sans-serif;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:40px 20px;">
              <tr>
                <td align="center">
                  <table width="560" cellpadding="0" cellspacing="0" style="background:#1e293b;border-radius:16px;border:1px solid #334155;overflow:hidden;">
                    <!-- Header -->
                    <tr>
                      <td style="background:linear-gradient(135deg,#f59e0b,#ef4444);padding:32px;text-align:center;">
                        <h1 style="margin:0;color:#fff;font-size:24px;font-weight:800;letter-spacing:-0.5px;">🛡️ SafePath</h1>
                        <p style="margin:8px 0 0;color:rgba(255,255,255,0.75);font-size:14px;">Password Reset Request</p>
                      </td>
                    </tr>
                    <!-- Body -->
                    <tr>
                      <td style="padding:40px 36px;">
                        <h2 style="margin:0 0 12px;color:#f1f5f9;font-size:20px;font-weight:700;">Reset your password</h2>
                        <p style="margin:0 0 28px;color:#94a3b8;font-size:15px;line-height:1.6;">
                          We received a request to reset your SafePath password. Use the following 6-digit verification code to choose a new password. This code expires in <strong style="color:#e2e8f0;">15 minutes</strong>.
                        </p>
                        <table width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td align="center">
                              <div style="display:inline-block;background:linear-gradient(135deg,#f59e0b,#ef4444);color:#fff;font-weight:700;font-size:28px;letter-spacing:4px;padding:14px 36px;border-radius:10px;">
                                ${otp}
                              </div>
                            </td>
                          </tr>
                        </table>
                        <hr style="border:none;border-top:1px solid #334155;margin:28px 0;" />
                        <p style="margin:0;color:#475569;font-size:12px;">
                          If you didn't request a password reset, you can safely ignore this email. Your password won't change.
                        </p>
                      </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                      <td style="padding:20px 36px;background:#0f172a;text-align:center;">
                        <p style="margin:0;color:#334155;font-size:12px;">© ${new Date().getFullYear()} SafePath · Iba, Zambales</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
        });
    }
    static async sendVerificationOtpEmail(to, otp) {
        await transporter.sendMail({
            from: FROM,
            to,
            subject: 'Your SafePath verification code',
            html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
          </head>
          <body style="margin:0;padding:0;background:#0f172a;font-family:'Segoe UI',system-ui,sans-serif;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:40px 20px;">
              <tr>
                <td align="center">
                  <table width="560" cellpadding="0" cellspacing="0" style="background:#1e293b;border-radius:16px;border:1px solid #334155;overflow:hidden;">
                    <!-- Header -->
                    <tr>
                      <td style="background:linear-gradient(135deg,#3b82f6,#6366f1);padding:32px;text-align:center;">
                        <h1 style="margin:0;color:#fff;font-size:24px;font-weight:800;letter-spacing:-0.5px;">🛡️ SafePath</h1>
                        <p style="margin:8px 0 0;color:rgba(255,255,255,0.75);font-size:14px;">Community Safety Platform</p>
                      </td>
                    </tr>
                    <!-- Body -->
                    <tr>
                      <td style="padding:40px 36px;">
                        <h2 style="margin:0 0 12px;color:#f1f5f9;font-size:20px;font-weight:700;">Your verification code</h2>
                        <p style="margin:0 0 28px;color:#94a3b8;font-size:15px;line-height:1.6;">
                          Enter the code below to verify your email and activate your SafePath account. This code expires in <strong style="color:#e2e8f0;">15 minutes</strong>.
                        </p>
                        <table width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td align="center">
                              <div style="display:inline-block;background:linear-gradient(135deg,#3b82f6,#6366f1);color:#fff;font-weight:800;font-size:36px;letter-spacing:10px;padding:18px 40px;border-radius:12px;font-family:monospace;">
                                ${otp}
                              </div>
                            </td>
                          </tr>
                        </table>
                        <hr style="border:none;border-top:1px solid #334155;margin:28px 0;" />
                        <p style="margin:0;color:#475569;font-size:12px;">
                          If you didn't create a SafePath account, you can safely ignore this email.
                        </p>
                      </td>
                    </tr>
                    <!-- Footer -->
                    <tr>
                      <td style="padding:20px 36px;background:#0f172a;text-align:center;">
                        <p style="margin:0;color:#334155;font-size:12px;">© ${new Date().getFullYear()} SafePath · Iba, Zambales</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
        });
    }
    static async sendVerificationReminderEmail(to, token) {
        return this.sendVerificationEmail(to, token);
    }
}
