import { env } from '../config/env.js'
import { accents, button, callout, details, divider, escapeHtml, heading, layout, link, linkFallback, paragraph, plainText, steps } from './components.js'

export type RenderedEmail = {subject: string, html: string, text: string}

// how long verification and reset links last; set by auth-service (TEMP_TOKEN_TTL_MS), repeated here only for the wording
const LINK_TTL_MINUTES = 15

function app() {
  return {appName: env.APP_NAME, appUrl: env.FRONTEND_URL}
}

export function emailVerificationEmail({to, verificationUrl}: {to: string, verificationUrl: string}): RenderedEmail {
  const {appName, appUrl} = app()
  const name = escapeHtml(appName)
  const accent = accents.indigo
  const subject = 'Verify your email address'
  const reason = `because it was used to sign up for ${name}.`

  const html = layout({
    title: subject, accent, icon: '&#9993;&#65039;', appName, appUrl, recipient: to, reason,
    preheader: `Confirm your email to finish setting up your ${name} account. The link expires in ${LINK_TTL_MINUTES} minutes.`,
    body: [
      heading('Confirm your email'),
      paragraph(`Thanks for signing up for ${name}! Confirm this is your email address and your account is ready to go.`),
      paragraph('You will be asked for the password you chose when you signed up.', {muted: true, size: 14}),
      button(verificationUrl, 'Verify email', accent),
      callout(`This link expires in <strong>${LINK_TTL_MINUTES} minutes</strong>. If it does, sign in and we'll send you a new one.`, accent, {icon: '&#9201;&#65039;'}),
      linkFallback(verificationUrl, accent),
      divider(),
      paragraph(`Didn't sign up for ${name}? You can ignore this email. The account won't be activated without this link and the password chosen at sign-up.`, {muted: true, size: 13}),
    ].join('\n'),
  })

  const text = plainText([
    'Confirm your email',
    '',
    `Thanks for signing up for ${appName}! Open this link to confirm your email address (you'll be asked for the password you chose at sign-up):`,
    '',
    verificationUrl,
    '',
    `The link expires in ${LINK_TTL_MINUTES} minutes. If it does, sign in and we'll send you a new one.`,
    '',
    `Didn't sign up for ${appName}? You can ignore this email.`,
  ], {appName, recipient: to, reason: `because it was used to sign up for ${appName}.`})

  return {subject, html, text}
}

export function welcomeEmail({to, firstName}: {to: string, firstName: string}): RenderedEmail {
  const {appName, appUrl} = app()
  const name = escapeHtml(appName)
  const first = escapeHtml(firstName)
  const accent = accents.green
  const subject = `Welcome to ${appName}!`
  const reason = `because you created an account with ${name}.`

  const html = layout({
    title: escapeHtml(subject), accent, icon: '&#127881;', appName, appUrl, recipient: to, reason,
    preheader: `Your ${name} account is verified and ready. Here's how to get started.`,
    body: [
      heading(`Welcome aboard, ${first}!`),
      paragraph(`Your email is verified and your ${name} account is all set. We're really glad you're here.`),
      paragraph('<strong class="em-h" style="color:#111827;">A few things to get you started</strong>', {size: 15}),
      steps([
        {title: 'Complete your profile', text: 'Add a photo and a few details so people know it\'s you.'},
        {title: `Explore ${name}`, text: 'Take a look around and see what you can do.'},
        {title: 'Keep your account safe', text: 'Use a unique password, and sign out of devices you no longer use from your sessions page.'},
      ], accent),
      button(appUrl, `Open ${name}`, accent),
      divider(),
      paragraph(`Questions or need a hand? We're here whenever you need us.<br /><br />Cheers,<br /><strong class="em-h" style="color:#111827;">The ${name} team</strong>`, {muted: true, size: 14}),
    ].join('\n'),
  })

  const text = plainText([
    `Welcome aboard, ${firstName}!`,
    '',
    `Your email is verified and your ${appName} account is all set.`,
    '',
    'A few things to get you started:',
    `1. Complete your profile: add a photo and a few details.`,
    `2. Explore ${appName}: take a look around.`,
    `3. Keep your account safe: use a unique password, and sign out of devices you no longer use.`,
    '',
    `Open ${appName}: ${appUrl}`,
    '',
    'Cheers,',
    `The ${appName} team`,
  ], {appName, recipient: to, reason: `because you created an account with ${appName}.`})

  return {subject, html, text}
}

export function resetPasswordEmail({to, firstName, resetUrl}: {to: string, firstName: string, resetUrl: string}): RenderedEmail {
  const {appName, appUrl} = app()
  const name = escapeHtml(appName)
  const accent = accents.amber
  const subject = 'Reset your password'
  const reason = `because a password reset was requested for your ${name} account.`

  const html = layout({
    title: subject, accent, icon: '&#128273;', appName, appUrl, recipient: to, reason,
    preheader: `Choose a new password for your ${name} account. The link expires in ${LINK_TTL_MINUTES} minutes.`,
    body: [
      heading('Reset your password'),
      paragraph(`Hi ${escapeHtml(firstName)}, we got a request to reset the password for your ${name} account. Choose a new one with the button below.`),
      button(resetUrl, 'Choose a new password', accent, {width: 280}),
      callout(`This link expires in <strong>${LINK_TTL_MINUTES} minutes</strong> and works once. Resetting your password signs you out on every device.`, accent, {icon: '&#9201;&#65039;'}),
      linkFallback(resetUrl, accent),
      divider(),
      paragraph(`Didn't ask for this? You can ignore this email; your password stays the same unless you open the link. ${name} will never ask you for your password.`, {muted: true, size: 13}),
    ].join('\n'),
  })

  const text = plainText([
    'Reset your password',
    '',
    `Hi ${firstName}, we got a request to reset the password for your ${appName} account. Open this link to choose a new one:`,
    '',
    resetUrl,
    '',
    `The link expires in ${LINK_TTL_MINUTES} minutes and works once. Resetting your password signs you out on every device.`,
    '',
    `Didn't ask for this? You can ignore this email; your password stays the same. ${appName} will never ask you for your password.`,
  ], {appName, recipient: to, reason: `because a password reset was requested for your ${appName} account.`})

  return {subject, html, text}
}

export function accountExistsEmail({to, firstName, signinUrl, forgotPasswordUrl}: {to: string, firstName: string, signinUrl: string, forgotPasswordUrl: string}): RenderedEmail {
  const {appName, appUrl} = app()
  const name = escapeHtml(appName)
  const accent = accents.blue
  const subject = 'You already have an account'
  const reason = `because someone tried to sign up for ${name} with it.`

  const html = layout({
    title: subject, accent, icon: '&#128075;', appName, appUrl, recipient: to, reason,
    preheader: `Someone tried to sign up with this email, but you already have a ${name} account.`,
    body: [
      heading('You already have an account'),
      paragraph(`Hi ${escapeHtml(firstName)}, someone just tried to sign up for ${name} with this email address. There's already an account for it, so nothing new was created.`),
      paragraph('If that was you, just sign in:'),
      button(signinUrl, 'Sign in', accent, {width: 180}),
      paragraph(`Can't remember your password? ${link(forgotPasswordUrl, 'Reset it here', accent)}.`, {size: 15}),
      divider(),
      paragraph('Wasn\'t you? You can ignore this email. Nothing about your account has changed.', {muted: true, size: 13}),
    ].join('\n'),
  })

  const text = plainText([
    'You already have an account',
    '',
    `Hi ${firstName}, someone just tried to sign up for ${appName} with this email address. There's already an account for it, so nothing new was created.`,
    '',
    `If that was you, sign in here: ${signinUrl}`,
    `Can't remember your password? Reset it here: ${forgotPasswordUrl}`,
    '',
    `Wasn't you? You can ignore this email. Nothing about your account has changed.`,
  ], {appName, recipient: to, reason: `because someone tried to sign up for ${appName} with it.`})

  return {subject, html, text}
}

export function passwordChangedEmail({to, firstName, forgotPasswordUrl, changedAt}: {to: string, firstName: string, forgotPasswordUrl: string, changedAt: Date}): RenderedEmail {
  const {appName, appUrl} = app()
  const name = escapeHtml(appName)
  const accent = accents.red
  const subject = 'Your password was changed'
  const reason = `because the password for your ${name} account was changed.`
  // the time of the change from the job, in UTC because the reader's time zone isn't known
  const when = `${new Intl.DateTimeFormat('en-GB', {dateStyle: 'full', timeStyle: 'short', timeZone: 'UTC'}).format(changedAt)} UTC`

  const html = layout({
    title: subject, accent, icon: '&#128274;', appName, appUrl, recipient: to, reason,
    preheader: `The password for your ${name} account was just changed. If this wasn't you, act now.`,
    body: [
      heading('Your password was changed'),
      paragraph(`Hi ${escapeHtml(firstName)}, the password for your ${name} account was just changed. For your safety, you've been signed out on your other devices.`),
      details([
        ['Account', escapeHtml(to)],
        ['When', escapeHtml(when)],
      ]),
      paragraph('If this was you, there\'s nothing else to do.'),
      callout(`<strong>Wasn't you?</strong> Someone may know your password. Reset it now to lock them out; that signs out every device.`, accent, {icon: '&#9888;&#65039;'}),
      button(forgotPasswordUrl, 'Secure my account', accent, {width: 230}),
    ].join('\n'),
  })

  const text = plainText([
    'Your password was changed',
    '',
    `Hi ${firstName}, the password for your ${appName} account was just changed. You've been signed out on your other devices.`,
    '',
    `Account: ${to}`,
    `When: ${when}`,
    '',
    `If this was you, there's nothing else to do.`,
    '',
    `Wasn't you? Someone may know your password. Reset it now: ${forgotPasswordUrl}`,
  ], {appName, recipient: to, reason: `because the password for your ${appName} account was changed.`})

  return {subject, html, text}
}
