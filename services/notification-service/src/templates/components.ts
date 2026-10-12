// building blocks for every email. email clients ignore most modern CSS (Outlook renders with Word, Gmail drops <style>
// in some views), so layout is tables, every style that matters is inline, and <style> only adds extras: mobile sizes and dark mode

export const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"

export type Accent = {
  // buttons and the top bar; dark enough for white text to pass WCAG AA
  main: string
  // background of callouts and the icon badge
  tint: string
  // text on the tint
  ink: string
}

// one colour per kind of email, so a security alert never looks like a welcome note
export const accents = {
  indigo: {main: '#4f46e5', tint: '#eef2ff', ink: '#3730a3'},
  green: {main: '#047857', tint: '#ecfdf5', ink: '#065f46'},
  amber: {main: '#b45309', tint: '#fffbeb', ink: '#92400e'},
  blue: {main: '#2563eb', tint: '#eff6ff', ink: '#1e40af'},
  red: {main: '#dc2626', tint: '#fef2f2', ink: '#991b1b'},
} satisfies Record<string, Accent>

const color = {
  page: '#f3f4f8',
  card: '#ffffff',
  border: '#e5e7eb',
  heading: '#111827',
  text: '#374151',
  muted: '#6b7280',
  faint: '#9ca3af',
  box: '#f9fafb',
}

// every value that comes from a user or a url goes through this before it is put in the html
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function heading(text: string) {
  return `<h1 class="em-h em-h1" style="margin:0 0 16px 0; font-family:${FONT}; font-size:26px; line-height:34px; font-weight:700; letter-spacing:-0.3px; color:${color.heading};">${text}</h1>`
}

// html, not text: callers escape the values they put in
export function paragraph(html: string, {muted = false, size = 16} = {}) {
  return `<p class="${muted ? 'em-muted' : 'em-text'}" style="margin:0 0 16px 0; font-family:${FONT}; font-size:${size}px; line-height:${Math.round(size * 1.6)}px; color:${muted ? color.muted : color.text};">${html}</p>`
}

// a real <a> for every client, plus a VML shape for Outlook on Windows, which can't draw padded, rounded links
export function button(url: string, label: string, accent: Accent, {width = 240} = {}) {
  const href = escapeHtml(url)
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px 0;">
  <tr>
    <td align="center" bgcolor="${accent.main}" style="border-radius:10px;">
      <!--[if mso]>
      <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${href}" style="height:50px; v-text-anchor:middle; width:${width}px;" arcsize="20%" stroke="f" fillcolor="${accent.main}">
        <w:anchorlock/>
        <center style="color:#ffffff; font-family:Arial, sans-serif; font-size:16px; font-weight:bold;">${label}</center>
      </v:roundrect>
      <![endif]-->
      <!--[if !mso]><!-->
      <a href="${href}" target="_blank" rel="noopener noreferrer" style="display:inline-block; padding:15px 32px; font-family:${FONT}; font-size:16px; font-weight:600; line-height:20px; color:#ffffff; text-decoration:none; border-radius:10px; background-color:${accent.main};">${label}&nbsp;&rarr;</a>
      <!--<![endif]-->
    </td>
  </tr>
</table>`
}

// a tinted box with a coloured edge, for the one fact the reader must not miss (expiry, "wasn't you?")
export function callout(html: string, accent: Accent, {icon}: {icon?: string} = {}) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px 0;">
  <tr>
    <td class="em-box" style="background-color:${accent.tint}; border-left:4px solid ${accent.main}; border-radius:8px; padding:14px 18px; font-family:${FONT}; font-size:14px; line-height:22px; color:${accent.ink};">
      ${icon ? `<span style="font-size:16px;">${icon}</span>&nbsp; ` : ''}${html}
    </td>
  </tr>
</table>`
}

// numbered steps with a coloured badge per step
export function steps(items: {title: string, text: string}[], accent: Accent) {
  const rows = items.map((item, index) => `<tr>
    <td valign="top" width="44" style="padding:0 0 18px 0;">
      <div style="width:30px; height:30px; line-height:30px; border-radius:15px; background-color:${accent.tint}; color:${accent.ink}; font-family:${FONT}; font-size:14px; font-weight:700; text-align:center;">${index + 1}</div>
    </td>
    <td valign="top" style="padding:4px 0 18px 0; font-family:${FONT}; font-size:15px; line-height:23px;">
      <strong class="em-h" style="color:${color.heading};">${item.title}</strong><br />
      <span class="em-muted" style="color:${color.muted};">${item.text}</span>
    </td>
  </tr>`).join('\n')
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 8px 0;">${rows}</table>`
}

// label / value rows in a light box, for facts such as when a change happened
export function details(rows: [label: string, value: string][]) {
  const body = rows.map(([label, value], index) => `<tr>
    <td class="em-muted" style="padding:12px 18px; ${index ? `border-top:1px solid ${color.border};` : ''} font-family:${FONT}; font-size:13px; line-height:20px; color:${color.muted}; white-space:nowrap;" width="110">${label}</td>
    <td class="em-h" style="padding:12px 18px; ${index ? `border-top:1px solid ${color.border};` : ''} font-family:${FONT}; font-size:14px; line-height:20px; color:${color.heading}; font-weight:600;">${value}</td>
  </tr>`).join('\n')
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="em-box em-border" style="margin:0 0 24px 0; background-color:${color.box}; border:1px solid ${color.border}; border-radius:10px;">${body}</table>`
}

// for clients that block the button, or readers who want to see where it goes
export function linkFallback(url: string, accent: Accent) {
  const href = escapeHtml(url)
  return `${paragraph("Button not working? Copy and paste this link into your browser:", {muted: true, size: 13})}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:-6px 0 24px 0;">
  <tr>
    <td class="em-box em-border" style="background-color:${color.box}; border:1px solid ${color.border}; border-radius:8px; padding:12px 14px; font-family:Menlo, Consolas, 'Courier New', monospace; font-size:12px; line-height:18px; word-break:break-all;">
      <a href="${href}" target="_blank" rel="noopener noreferrer" style="color:${accent.ink}; text-decoration:none;">${href}</a>
    </td>
  </tr>
</table>`
}

export function divider() {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="em-border" style="border-top:1px solid ${color.border}; font-size:1px; line-height:1px; padding:0 0 24px 0;">&nbsp;</td></tr></table>`
}

export function link(url: string, label: string, accent: Accent) {
  return `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" style="color:${accent.main}; font-weight:600; text-decoration:none;">${label}</a>`
}

type LayoutOptions = {
  title: string
  // the grey line inboxes show after the subject
  preheader: string
  accent: Accent
  // shown in a round badge above the heading
  icon: string
  appName: string
  appUrl: string
  recipient: string
  // already-built html from the helpers above
  body: string
  // why the reader got this mail, shown in the footer
  reason: string
}

export function layout({title, preheader, accent, icon, appName, appUrl, recipient, body, reason}: LayoutOptions) {
  const name = escapeHtml(appName)
  const initial = escapeHtml(appName.trim().charAt(0).toUpperCase() || 'A')
  const year = new Date().getFullYear()
  // padding after the preheader stops inboxes from filling the preview with the start of the body
  const previewPadding = '&#847;&zwnj;&nbsp;'.repeat(60)

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <meta name="x-apple-disable-message-reformatting" />
  <meta name="format-detection" content="telephone=no, date=no, address=no, email=no" />
  <meta name="color-scheme" content="light dark" />
  <meta name="supported-color-schemes" content="light dark" />
  <title>${title}</title>
  <!--[if mso]>
  <noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
  <![endif]-->
  <style>
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; border-collapse: separate; }
    body { margin: 0 !important; padding: 0 !important; width: 100% !important; }
    a[x-apple-data-detectors] { color: inherit !important; text-decoration: none !important; }
    @media screen and (max-width: 600px) {
      .em-container { width: 100% !important; }
      .em-px { padding-left: 24px !important; padding-right: 24px !important; }
      .em-h1 { font-size: 22px !important; line-height: 30px !important; }
    }
    /* clients that support it (Apple Mail, Outlook for Mac, some webmails) get a dark version instead of an inverted one */
    @media (prefers-color-scheme: dark) {
      .em-bg { background-color: #0b0d12 !important; }
      .em-card { background-color: #151821 !important; border-color: #262b36 !important; }
      .em-h { color: #f9fafb !important; }
      .em-text { color: #d1d5db !important; }
      .em-muted { color: #9ca3af !important; }
      .em-box { background-color: #1d212b !important; }
      .em-border { border-color: #2a2f3a !important; }
    }
  </style>
</head>
<body class="em-bg" style="margin:0; padding:0; background-color:${color.page};">
  <div style="display:none; max-height:0; overflow:hidden; mso-hide:all; font-size:1px; line-height:1px; opacity:0;">${preheader}${previewPadding}</div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="em-bg" style="background-color:${color.page};">
    <tr>
      <td align="center" style="padding:40px 16px 48px 16px;">
        <table role="presentation" class="em-container" width="580" cellpadding="0" cellspacing="0" border="0" style="width:580px; max-width:580px;">

          <!-- brand -->
          <tr>
            <td align="center" style="padding:0 0 28px 0;">
              <a href="${escapeHtml(appUrl)}" target="_blank" rel="noopener noreferrer" style="text-decoration:none;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td width="38" height="38" align="center" valign="middle" bgcolor="#111827" style="width:38px; height:38px; border-radius:10px; font-family:${FONT}; font-size:19px; font-weight:800; color:#ffffff;">${initial}</td>
                    <td class="em-h" style="padding-left:12px; font-family:${FONT}; font-size:19px; font-weight:700; letter-spacing:-0.2px; color:${color.heading};">${name}</td>
                  </tr>
                </table>
              </a>
            </td>
          </tr>

          <!-- card -->
          <tr>
            <td class="em-card" style="background-color:${color.card}; border:1px solid ${color.border}; border-radius:16px; overflow:hidden;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr><td height="5" bgcolor="${accent.main}" style="height:5px; line-height:5px; font-size:5px; background-color:${accent.main}; border-radius:16px 16px 0 0;">&nbsp;</td></tr>
                <tr>
                  <td class="em-px" style="padding:40px 48px 16px 48px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px 0;">
                      <tr><td width="56" height="56" align="center" valign="middle" style="width:56px; height:56px; border-radius:28px; background-color:${accent.tint}; font-size:26px; line-height:56px;">${icon}</td></tr>
                    </table>
                    ${body}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- footer -->
          <tr>
            <td align="center" class="em-muted" style="padding:28px 24px 0 24px; font-family:${FONT}; font-size:12px; line-height:19px; color:${color.faint};">
              This email was sent to <span style="color:${color.muted};">${escapeHtml(recipient)}</span> ${reason}<br />
              It's an automated message, so replies aren't read.<br /><br />
              <a href="${escapeHtml(appUrl)}" target="_blank" rel="noopener noreferrer" style="color:${color.muted}; text-decoration:underline;">${name}</a> &middot; &copy; ${year}
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

// the plain text part, for clients that don't show html and for spam filters, which trust mails that have both
export function plainText(lines: string[], {appName, recipient, reason}: {appName: string, recipient: string, reason: string}) {
  return [
    ...lines,
    '',
    '—',
    `This email was sent to ${recipient} ${reason}`,
    `It's an automated message, so replies aren't read.`,
    `© ${new Date().getFullYear()} ${appName}`,
  ].join('\n')
}
