import "dotenv/config"
import {Resend} from "resend"
import {ApiError} from "./api-error.js"

const resendClient = new Resend(process.env.RESEND_API_KEY)
const from = process.env.EMAIL_FROM || "team@dsaden.com"

async function sendEmail(to: string, subject: string, html: string, text: string) {
  const {data, error} = await resendClient.emails.send({
    to,
    from,
    html,
    subject,
    text,
  })

  if (error) {
    console.error(`Failed to send email to ${to}:`, error)
    throw ApiError.internal("Failed to send email")
  }

  return data
}

export async function sendEmailVerificationMail(to: string, verificationUrl: string) {

  const htmlContent = generateEmailVerificationHtml(verificationUrl)
  
  const textContent = generateEmailVerificationText(verificationUrl)

  return await sendEmail(to, "Verify your email address", htmlContent, textContent)
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function generateEmailVerificationHtml(
  verificationUrl: string,
  appName: string = process.env.APP_NAME || "DSADEN",
  expiresInMinutes: number = 15,
): string {
  const url = escapeHtml(verificationUrl)
  const name = escapeHtml(appName)
  const year = new Date().getFullYear()

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="x-apple-disable-message-reformatting" />
  <meta name="color-scheme" content="light only" />
  <meta name="supported-color-schemes" content="light" />
  <title>Verify your email address</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    body { margin: 0 !important; padding: 0 !important; width: 100% !important; }
    a { color: #4f46e5; }
    @media screen and (max-width: 600px) {
      .container { width: 100% !important; }
      .px { padding-left: 24px !important; padding-right: 24px !important; }
      .h1 { font-size: 22px !important; line-height: 30px !important; }
    }
  </style>
</head>
<body style="margin:0; padding:0; background-color:#f4f5f7;">
  <!-- Preheader (hidden preview text) -->
  <div style="display:none; max-height:0; overflow:hidden; mso-hide:all; font-size:1px; line-height:1px; color:#f4f5f7; opacity:0;">
    Confirm your email address to finish setting up your ${name} account.
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f5f7;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" class="container" width="560" cellpadding="0" cellspacing="0" border="0" style="width:560px; max-width:560px;">

          <!-- Brand -->
          <tr>
            <td align="center" style="padding-bottom:24px; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size:20px; font-weight:700; color:#111827; letter-spacing:-0.2px;">
              ${name}
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background-color:#ffffff; border:1px solid #e5e7eb; border-radius:12px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td class="px" style="padding:40px 48px 8px 48px; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                    <h1 class="h1" style="margin:0 0 16px 0; font-size:24px; line-height:32px; font-weight:700; color:#111827;">
                      Verify your email address
                    </h1>
                    <p style="margin:0 0 16px 0; font-size:16px; line-height:24px; color:#374151;">
                      Hi there,
                    </p>
                    <p style="margin:0 0 28px 0; font-size:16px; line-height:24px; color:#374151;">
                      Thanks for signing up for ${name}. Please confirm that this is your email address by clicking the button below.
                    </p>
                  </td>
                </tr>

                <!-- Button -->
                <tr>
                  <td class="px" align="left" style="padding:0 48px 28px 48px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td align="center" bgcolor="#4f46e5" style="border-radius:8px;">
                          <!--[if mso]>
                          <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${url}" style="height:48px; v-text-anchor:middle; width:220px;" arcsize="17%" stroke="f" fillcolor="#4f46e5">
                            <w:anchorlock/>
                            <center style="color:#ffffff; font-family:Arial, sans-serif; font-size:16px; font-weight:bold;">Verify email address</center>
                          </v:roundrect>
                          <![endif]-->
                          <!--[if !mso]><!-->
                          <a href="${url}" target="_blank" rel="noopener noreferrer"
                             style="display:inline-block; padding:14px 28px; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size:16px; font-weight:600; line-height:20px; color:#ffffff; text-decoration:none; border-radius:8px; background-color:#4f46e5;">
                            Verify email address
                          </a>
                          <!--<![endif]-->
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <tr>
                  <td class="px" style="padding:0 48px 32px 48px; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                    <p style="margin:0 0 16px 0; font-size:14px; line-height:22px; color:#6b7280;">
                      This link will expire in <strong style="color:#374151;">${expiresInMinutes} minutes</strong>. If it expires, you can request a new one from the sign-in page.
                    </p>
                    <p style="margin:0 0 8px 0; font-size:14px; line-height:22px; color:#6b7280;">
                      If the button doesn't work, copy and paste this link into your browser:
                    </p>
                    <p style="margin:0; font-size:13px; line-height:20px; word-break:break-all;">
                      <a href="${url}" target="_blank" rel="noopener noreferrer" style="color:#4f46e5; text-decoration:underline;">${url}</a>
                    </p>
                  </td>
                </tr>

                <!-- Divider -->
                <tr>
                  <td class="px" style="padding:0 48px;">
                    <div style="height:1px; line-height:1px; font-size:1px; background-color:#e5e7eb;">&nbsp;</div>
                  </td>
                </tr>

                <tr>
                  <td class="px" style="padding:24px 48px 40px 48px; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                    <p style="margin:0; font-size:13px; line-height:20px; color:#9ca3af;">
                      Didn't create an account with ${name}? You can safely ignore this email &mdash; no account will be activated without verification.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding:24px 16px 0 16px; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size:12px; line-height:18px; color:#9ca3af;">
              This is an automated message, please do not reply.<br />
              &copy; ${year} ${name}. All rights reserved.
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
function generateEmailVerificationText(
  verificationUrl: string,
  appName: string = process.env.APP_NAME || "DSADEN",
  expiresInMinutes: number = 30,
): string {
  const year = new Date().getFullYear()

  return [
    `Verify your email address`,
    ``,
    `Hi there,`,
    ``,
    `Thanks for signing up for ${appName}. Please confirm that this is your email address by opening the link below:`,
    ``,
    verificationUrl,
    ``,
    `This link will expire in ${expiresInMinutes} minutes. If it expires, you can request a new one from the sign-in page.`,
    ``,
    `Didn't create an account with ${appName}? You can safely ignore this email - no account will be activated without verification.`,
    ``,
    `---`,
    `This is an automated message, please do not reply.`,
    `© ${year} ${appName}. All rights reserved.`,
  ].join("\n")
}
