// the landing page words for small business owners, in english and hindi (source: content/landing-page.md).
// hindi keeps everyday hinglish (login, password, email, link), because that's how owners actually say them.
// only promise what ckauth does today: the paid plans are placeholders and say "coming soon" until they're real

export const CONTACT_EMAIL = 'chiragaroradev@gmail.com'
export const REPO_URL = 'https://github.com/chiragdev1/ckauth'

const en = {
  nav: {
    features: 'Features',
    howItWorks: 'How it works',
    pricing: 'Pricing',
    faq: 'FAQ',
    signIn: 'Sign in',
    tryFree: 'Try it free',
    switchTo: 'हिंदी',
    switchLabel: 'हिंदी में पढ़ें',
  },
  footer: {
    tagline: 'Your website\'s security guard',
    question: 'Questions? Write to',
    signIn: 'Sign in',
    createAccount: 'Create account',
    forgot: 'Forgot password',
  },
  hero: {
    badge: 'Your shop has a strong lock. Does your website?',
    title: 'Meet CKAuth,',
    titleAccent: 'your website\'s security guard.',
    body: 'It checks every customer at the door, stops anyone guessing passwords, and keeps watch day and night. You run your business. CKAuth guards the door.',
    primary: 'Try it free',
    dashboard: 'Go to dashboard',
    developers: 'For web developers',
    stats: [
      { value: '1 min', label: 'to create an account' },
      { value: '15 min', label: 'and every email link expires' },
      { value: '0', label: 'people who can read a password, not even us' },
    ],
  },
  phone: {
    shop: 'Sharma General Store',
    heading: 'Sign in',
    email: 'customer@example.com',
    button: 'Sign in',
    protectedBy: 'Protected by CKAuth',
    checks: ['Email checked', 'Password locked away', 'Wrong guesses blocked'],
    caption: 'What your customers see. What CKAuth checks.',
  },
  ticker: ['Checks every new customer', 'Stops password guessing', 'Locks passwords away', 'One-time links', 'Keeps your customer list private', 'Only real photos', 'Works on every phone'],
  features: {
    eyebrow: 'On duty, every hour',
    title: 'A guard that never takes a day off',
    body: 'Thieves look for the one door nobody is watching. CKAuth watches every door, every time.',
    items: [
      { title: 'Checks every new customer at the door', body: 'Nobody gets an account until they prove the email is theirs. Fake and wrong emails stay out.' },
      { title: 'Stops anyone guessing passwords', body: 'Like an ATM after too many wrong PINs, CKAuth blocks repeated wrong tries, even if the thief keeps changing internet.' },
      { title: 'Locks passwords away, even from us', body: 'Passwords are kept in a secret code, like cash in a bank locker. Stolen data is useless to a thief.' },
      { title: 'Sends links that work only once', body: 'Every email link works one time and stops after 15 minutes, just like an OTP.' },
      { title: 'Keeps your customer list private', body: 'Fraudsters can\'t find out who is registered. Everyone gets the same answer.' },
      { title: 'Logs out lost phones for you', body: 'When a customer changes or resets their password, every other phone and computer is logged out.' },
    ],
  },
  steps: {
    eyebrow: 'How it works',
    title: 'Sign up. Confirm. Stay safe.',
    body: 'No passwords in emails, no codes to copy, no guessing what comes next.',
    stepLabel: 'Step',
    items: [
      { title: 'Sign up', body: 'Name, email, password. A meter shows if the password is strong.' },
      { title: 'Confirm your email', body: 'Click the link we send and enter your password once more. You\'re in.' },
      { title: 'Stay logged in, safely', body: 'No login on every visit. CKAuth quietly checks it\'s still you.' },
      { title: 'Forgot your password?', body: 'A reset link by email, and you\'re back in a minute.' },
    ],
  },
  business: {
    eyebrow: 'For your business',
    title: 'Big-company safety. No tech team needed.',
    body: 'A single break-in can cost years of trust. CKAuth helps you keep that trust, without hiring anyone.',
    items: [
      { title: 'Fewer calls for you', body: 'Customers reset passwords and change their photo themselves.' },
      { title: 'More customers who trust you', body: 'A safe, smooth login looks professional. People buy where they feel safe.' },
      { title: 'Nobody can pretend to be your customer', body: 'Signing up with someone else\'s email gets a fraudster nothing. They\'d need the inbox and the password.' },
      { title: 'Only real photos get in', body: 'Every profile photo is checked, so harmful files dressed as pictures are blocked.' },
    ],
  },
  developers: {
    eyebrow: 'Build websites for clients?',
    title: 'Give every client the same strong lock.',
    body: 'CKAuth\'s code is open on GitHub, and the README explains setup. Set it up once, use it on every site you build.',
    button: 'View the code on GitHub',
  },
  pricing: {
    eyebrow: 'Pricing',
    title: 'Less than a cup of chai a day.',
    body: 'Every plan gets the full security guard. Pay only when your business grows.',
    banner: '🎉 Launch offer: everything is free for now. Paid plans haven\'t started yet.',
    recommended: 'Best value',
    plans: [
      { name: 'Free', price: '₹0', period: '', tagline: 'To try it out', features: ['All security features', 'Email check for every customer', 'Password reset by email'], button: 'Start free', available: true },
      { name: 'Monthly', price: '₹99', period: '/ month', tagline: 'For a growing shop', features: ['Everything in Free', 'Priority email help', 'Your shop name on login emails'], button: 'Coming soon', available: false },
      { name: 'Yearly', price: '₹999', period: '/ year', tagline: 'Best value: save ₹189', features: ['Everything in Monthly', '2 months\' worth of savings', 'Early access to new features'], button: 'Coming soon', available: false },
    ],
  },
  faq: {
    eyebrow: 'Good to know',
    title: 'Questions owners ask',
    items: [
      { q: 'Do I need to know coding?', a: 'No. Your customers just see a simple, safe login.' },
      { q: 'Can you see my customers\' passwords?', a: 'No. They\'re stored in a secret code nobody can read, including us.' },
      { q: 'What if a customer forgets their password?', a: 'They reset it themselves with an email link. No call to you.' },
      { q: 'What if a customer loses their phone?', a: 'Changing the password logs out every other device.' },
      { q: 'Does it work on mobile?', a: 'Yes, on every phone, tablet and computer.' },
      { q: 'How much does it cost?', a: 'Free for now. Paid plans will start later at ₹99/month or ₹999/year, and there will always be a free plan.' },
      { q: 'How do I get help?', a: `Email us at ${CONTACT_EMAIL}.` },
    ],
  },
  final: {
    title: 'Start today. Sleep easy tonight.',
    body: 'Create an account in under a minute and see how safe and simple it feels.',
    primary: 'Try it free',
    contact: 'Talk to us',
    emailLine: 'Questions? Write to',
  },
}

export type HomeCopy = typeof en

const hi: HomeCopy = {
  nav: {
    features: 'सुविधाएँ',
    howItWorks: 'कैसे काम करता है',
    pricing: 'कीमत',
    faq: 'सवाल-जवाब',
    signIn: 'साइन इन',
    tryFree: 'मुफ़्त में आज़माएँ',
    switchTo: 'English',
    switchLabel: 'Read in English',
  },
  footer: {
    tagline: 'आपकी वेबसाइट का सुरक्षा गार्ड',
    question: 'कोई सवाल? लिखें',
    signIn: 'साइन इन',
    createAccount: 'अकाउंट बनाएँ',
    forgot: 'पासवर्ड भूल गए',
  },
  hero: {
    badge: 'आपकी दुकान पर मज़बूत ताला है। क्या आपकी वेबसाइट पर भी है?',
    title: 'मिलिए CKAuth से,',
    titleAccent: 'आपकी वेबसाइट का सुरक्षा गार्ड।',
    body: 'यह हर ग्राहक को दरवाज़े पर जाँचता है, पासवर्ड का अंदाज़ा लगाने वालों को रोकता है, और दिन-रात पहरा देता है। आप अपना बिज़नेस चलाइए, दरवाज़ा CKAuth संभालेगा।',
    primary: 'मुफ़्त में आज़माएँ',
    dashboard: 'डैशबोर्ड पर जाएँ',
    developers: 'वेब डेवलपर्स के लिए',
    stats: [
      { value: '1 मिनट', label: 'में अकाउंट तैयार' },
      { value: '15 मिनट', label: 'में हर ईमेल लिंक बंद' },
      { value: '0', label: 'लोग पासवर्ड पढ़ सकते हैं, हम भी नहीं' },
    ],
  },
  phone: {
    shop: 'शर्मा जनरल स्टोर',
    heading: 'साइन इन',
    email: 'customer@example.com',
    button: 'साइन इन',
    protectedBy: 'CKAuth से सुरक्षित',
    checks: ['ईमेल जाँचा गया', 'पासवर्ड तिजोरी में', 'गलत अंदाज़े पर रोक'],
    caption: 'आपके ग्राहक यह देखते हैं। CKAuth यह जाँचता है।',
  },
  ticker: ['हर नए ग्राहक की जाँच', 'पासवर्ड के अंदाज़े पर रोक', 'पासवर्ड तिजोरी में', 'एक बार चलने वाले लिंक', 'ग्राहकों की लिस्ट निजी', 'सिर्फ़ असली फ़ोटो', 'हर फ़ोन पर चलता है'],
  features: {
    eyebrow: 'हर घंटे ड्यूटी पर',
    title: 'ऐसा गार्ड जो कभी छुट्टी नहीं लेता',
    body: 'चोर वही दरवाज़ा ढूँढते हैं जिस पर किसी की नज़र न हो। CKAuth हर दरवाज़े पर हमेशा नज़र रखता है।',
    items: [
      { title: 'हर नए ग्राहक को दरवाज़े पर जाँचता है', body: 'जब तक ग्राहक साबित न करे कि ईमेल उसका है, अकाउंट नहीं बनता। नकली और गलत ईमेल बाहर रहते हैं।' },
      { title: 'पासवर्ड का अंदाज़ा लगाने वालों को रोकता है', body: 'जैसे ATM बार-बार गलत PIN पर कार्ड रोक देता है, वैसे ही CKAuth गलत कोशिशें रोक देता है, चाहे चोर इंटरनेट बदलता रहे।' },
      { title: 'पासवर्ड तिजोरी में रखता है, हमसे भी दूर', body: 'पासवर्ड गुप्त कोड में रहते हैं, जैसे बैंक लॉकर में पैसे। चोरी हुआ डेटा चोर के किसी काम का नहीं।' },
      { title: 'एक बार चलने वाले लिंक भेजता है', body: 'हर ईमेल लिंक सिर्फ़ एक बार चलता है और 15 मिनट में बंद हो जाता है, बिल्कुल OTP की तरह।' },
      { title: 'ग्राहकों की लिस्ट निजी रखता है', body: 'धोखेबाज़ पता नहीं लगा सकते कि कौन रजिस्टर है। सबको एक जैसा जवाब मिलता है।' },
      { title: 'खोए फ़ोन से अपने-आप लॉग-आउट', body: 'ग्राहक पासवर्ड बदले या रीसेट करे, तो बाकी सभी फ़ोन और कंप्यूटर लॉग-आउट हो जाते हैं।' },
    ],
  },
  steps: {
    eyebrow: 'यह कैसे काम करता है',
    title: 'साइन-अप करें। पक्का करें। सुरक्षित रहें।',
    body: 'ईमेल में कोई पासवर्ड नहीं, कोई कोड कॉपी नहीं, कोई उलझन नहीं।',
    stepLabel: 'स्टेप',
    items: [
      { title: 'साइन-अप करें', body: 'नाम, ईमेल, पासवर्ड। मीटर बताता है कि पासवर्ड मज़बूत है या नहीं।' },
      { title: 'ईमेल पक्का करें', body: 'भेजे गए लिंक पर क्लिक करें और पासवर्ड एक बार फिर डालें। आप अंदर हैं।' },
      { title: 'सुरक्षित लॉग-इन रहें', body: 'हर बार लॉगिन नहीं। CKAuth चुपचाप जाँचता रहता है कि यह आप ही हैं।' },
      { title: 'पासवर्ड भूल गए?', body: 'ईमेल पर रीसेट लिंक, और एक मिनट में वापस अंदर।' },
    ],
  },
  business: {
    eyebrow: 'आपके बिज़नेस के लिए',
    title: 'बड़ी कंपनियों जैसी सुरक्षा। टेक टीम की ज़रूरत नहीं।',
    body: 'एक चोरी सालों का भरोसा तोड़ सकती है। CKAuth बिना किसी को नौकरी पर रखे, वह भरोसा बनाए रखने में मदद करता है।',
    items: [
      { title: 'आपको कम फ़ोन', body: 'ग्राहक पासवर्ड और फ़ोटो खुद बदल लेते हैं।' },
      { title: 'ज़्यादा भरोसेमंद ग्राहक', body: 'सुरक्षित और आसान लॉगिन प्रोफ़ेशनल लगता है। लोग वहीं खरीदते हैं जहाँ सुरक्षित महसूस करें।' },
      { title: 'कोई आपके ग्राहक का रूप नहीं ले सकता', body: 'किसी और के ईमेल से साइन-अप करके धोखेबाज़ को कुछ नहीं मिलता। उसे ईमेल और पासवर्ड, दोनों चाहिए।' },
      { title: 'सिर्फ़ असली फ़ोटो', body: 'हर प्रोफ़ाइल फ़ोटो जाँची जाती है, फ़ोटो के भेस में आई खतरनाक फ़ाइलें रुक जाती हैं।' },
    ],
  },
  developers: {
    eyebrow: 'क्लाइंट्स के लिए वेबसाइट बनाते हैं?',
    title: 'हर क्लाइंट को वही मज़बूत ताला दीजिए।',
    body: 'CKAuth का कोड GitHub पर खुला है, और README में सेटअप समझाया गया है। एक बार सेट करें, हर वेबसाइट पर इस्तेमाल करें।',
    button: 'GitHub पर कोड देखें',
  },
  pricing: {
    eyebrow: 'कीमत',
    title: 'रोज़ एक कप चाय से भी कम।',
    body: 'हर प्लान में पूरा सुरक्षा गार्ड। पैसे तभी, जब आपका बिज़नेस बढ़े।',
    banner: '🎉 लॉन्च ऑफ़र: अभी सब कुछ मुफ़्त है। पेड प्लान अभी शुरू नहीं हुए हैं।',
    recommended: 'सबसे फ़ायदेमंद',
    plans: [
      { name: 'Free', price: '₹0', period: '', tagline: 'आज़माने के लिए', features: ['सारी सुरक्षा सुविधाएँ', 'हर ग्राहक का ईमेल जाँच', 'ईमेल से पासवर्ड रीसेट'], button: 'मुफ़्त शुरू करें', available: true },
      { name: 'Monthly', price: '₹99', period: '/ महीना', tagline: 'बढ़ती दुकान के लिए', features: ['Free की सारी सुविधाएँ', 'ईमेल पर जल्दी मदद', 'लॉगिन ईमेल पर आपकी दुकान का नाम'], button: 'जल्द आ रहा है', available: false },
      { name: 'Yearly', price: '₹999', period: '/ साल', tagline: 'सबसे फ़ायदेमंद: ₹189 की बचत', features: ['Monthly की सारी सुविधाएँ', 'लगभग 2 महीने की बचत', 'नई सुविधाएँ सबसे पहले'], button: 'जल्द आ रहा है', available: false },
    ],
  },
  faq: {
    eyebrow: 'काम की बातें',
    title: 'दुकानदार जो पूछते हैं',
    items: [
      { q: 'क्या मुझे कोडिंग आनी चाहिए?', a: 'नहीं। आपके ग्राहकों को बस आसान और सुरक्षित लॉगिन दिखता है।' },
      { q: 'क्या आप मेरे ग्राहकों के पासवर्ड देख सकते हैं?', a: 'नहीं। वे ऐसे गुप्त कोड में रहते हैं जिसे कोई नहीं पढ़ सकता, हम भी नहीं।' },
      { q: 'अगर ग्राहक पासवर्ड भूल जाए तो?', a: 'वह ईमेल लिंक से खुद रीसेट कर लेता है। आपको फ़ोन नहीं करना पड़ता।' },
      { q: 'अगर ग्राहक का फ़ोन खो जाए तो?', a: 'पासवर्ड बदलते ही बाकी सभी डिवाइस लॉग-आउट हो जाते हैं।' },
      { q: 'क्या यह मोबाइल पर चलता है?', a: 'हाँ, हर फ़ोन, टैबलेट और कंप्यूटर पर।' },
      { q: 'इसकी कीमत क्या है?', a: 'अभी मुफ़्त है। पेड प्लान बाद में ₹99/महीना या ₹999/साल से शुरू होंगे, और मुफ़्त प्लान हमेशा रहेगा।' },
      { q: 'मदद कैसे मिलेगी?', a: `हमें ${CONTACT_EMAIL} पर ईमेल करें।` },
    ],
  },
  final: {
    title: 'आज शुरू करें। आज रात चैन की नींद सोएँ।',
    body: 'एक मिनट से कम में अकाउंट बनाएँ और खुद देखें कि यह कितना आसान और सुरक्षित है।',
    primary: 'मुफ़्त में आज़माएँ',
    contact: 'हमसे बात करें',
    emailLine: 'कोई सवाल? लिखें',
  },
}

export const homeCopy = { en, hi }
