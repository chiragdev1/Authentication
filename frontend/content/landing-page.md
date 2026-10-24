# CKAuth landing page copy (English + हिंदी)

Copy for the home page, written for small business owners in India: shopkeepers, tutors, clinics and local brands with no technical background. The live page reads these words from `src/pages/home-copy.ts`, so change both together. The sections follow the page's order.

## How this page talks

The page borrows the *message*, not the look, from two pages that do it well:

- **dsa.chaicode.com (Chai Prep)** names the result the reader wants ("Start where you are. Walk in ready."), takes away guilt and confusion instead of scaring people, lays out one clear path (learn → practise → sit the round), and gives a second audience (colleges) its own way in.
- **devin.ai** introduces the product as a member of your team ("Meet Devin, your team's…"), starts every feature heading with something it *does for you* ("Keeps working when your laptop is closed"), promises the finished result rather than listing features, and ends with a short command ("Stop deprioritizing. Do it all with Devin").

So, on this page:
1. **CKAuth is a person on your team:** your website's security guard, who works every hour of the day.
2. **Headings start with an action word** and describe what the guard does for you: *Checks…, Stops…, Locks…, Keeps watch…*
3. **Promise the feeling, not the parts:** you sleep easy, and your customers trust you.
4. **Calm, not scary.** Name the worry once ("a single break-in can cost years of trust"), then reassure.
5. **One simple path:** sign up → confirm → stay safe.
6. **Two ways in:** shop owners first, and web developers who build sites for shop owners second.
7. **Short lines.** Most sentences are under 15 words, and headings are often fragments.
8. **Honest proof only.** Use real numbers from the product, and label anything that's a placeholder. There are no customers yet, so **no** made-up logos, testimonials or user counts.
9. **Indian context:** bank locker, ATM PIN, OTP, ₹ and IST. Hindi uses everyday Hinglish words (login, password, email, link).
10. **Only promise what CKAuth does today.** There's no SMS/WhatsApp OTP and no Google login yet, so don't mention them. CKAuth is free for now. The paid plans in the pricing section are placeholders, so the page must say clearly that they haven't started.

Fixed details:
- Contact email: chiragaroradev@gmail.com
- Developer link: https://github.com/chiragdev1/ckauth (its README explains setup)
- Pricing (placeholder): Free, ₹99/month, ₹999/year

---

## 1. Search title and description (`index.html`)

| | English | हिंदी |
|---|---|---|
| Title (50–60 chars) | Secure Website Login for Small Businesses in India · CKAuth | छोटे बिज़नेस की वेबसाइट के लिए सुरक्षित लॉगिन · CKAuth |
| Description (140–160 chars) | Keep your customers' accounts safe with CKAuth: email-checked sign-ups, passwords no one can read and wrong-guess blocking. Try the live demo now. | अपने ग्राहकों के अकाउंट सुरक्षित रखें। ईमेल से पक्का साइन-अप, ऐसे पासवर्ड जिन्हें कोई पढ़ न सके, और गलत अंदाज़े पर रोक। आज ही लाइव डेमो आज़माएँ। |

---

## 2. Hero (top of the page)

**Badge (the worry, named once)**
- EN: Your shop has a strong lock. Does your website?
- HI: आपकी दुकान पर मज़बूत ताला है। क्या आपकी वेबसाइट पर भी है?

**Headline (the product as a team member)**
- EN: Meet CKAuth, **your website's security guard.**
- HI: मिलिए CKAuth से, **आपकी वेबसाइट का सुरक्षा गार्ड।**

**Sub-headline (what it does for you, then the result)**
- EN: It checks every customer at the door, stops anyone guessing passwords, and keeps watch day and night. You run your business. CKAuth guards the door.
- HI: यह हर ग्राहक को दरवाज़े पर जाँचता है, पासवर्ड का अंदाज़ा लगाने वालों को रोकता है, और दिन-रात पहरा देता है। आप अपना बिज़नेस चलाइए, दरवाज़ा CKAuth संभालेगा।

**Buttons**
- Primary: EN: Try it free · HI: मुफ़्त में आज़माएँ
- Secondary (second audience): EN: For web developers · HI: वेब डेवलपर्स के लिए

**Hero picture:** a demo sign-in screen for a made-up shop ("Sharma General Store" / "शर्मा जनरल स्टोर") with three ticks under it: Email checked, Password locked away, Wrong guesses blocked. Caption: "What your customers see. What CKAuth checks." / "आपके ग्राहक यह देखते हैं। CKAuth यह जाँचता है।"

**Real numbers (stats row)**

| Value | EN label | HI label |
|---|---|---|
| 1 min | to create an account | में अकाउंट तैयार |
| 15 min | and every email link expires | में हर ईमेल लिंक बंद |
| 0 | people who can read a password, not even us | लोग पासवर्ड पढ़ सकते हैं, हम भी नहीं |

---

## 3. Moving strip (ticker)

- EN: Checks every new customer ✦ Stops password guessing ✦ Locks passwords away ✦ One-time links ✦ Keeps your customer list private ✦ Only real photos ✦ Works on every phone
- HI: हर नए ग्राहक की जाँच ✦ पासवर्ड के अंदाज़े पर रोक ✦ पासवर्ड तिजोरी में ✦ एक बार चलने वाले लिंक ✦ ग्राहकों की लिस्ट निजी ✦ सिर्फ़ असली फ़ोटो ✦ हर फ़ोन पर चलता है

---

## 4. What your guard does (replaces "Three walls")

**Section heading**
- Eyebrow: EN: On duty, every hour · HI: हर घंटे ड्यूटी पर
- Title: EN: A guard that never takes a day off · HI: ऐसा गार्ड जो कभी छुट्टी नहीं लेता
- Body: EN: Thieves look for the one door nobody is watching. CKAuth watches every door, every time. · HI: चोर वही दरवाज़ा ढूँढते हैं जिस पर किसी की नज़र न हो। CKAuth हर दरवाज़े पर हमेशा नज़र रखता है।

Six cards. Each heading starts with what the guard does.

| EN heading | EN text | HI heading | HI text |
|---|---|---|---|
| Checks every new customer at the door | Nobody gets an account until they prove the email is theirs. Fake and wrong emails stay out. | हर नए ग्राहक को दरवाज़े पर जाँचता है | जब तक ग्राहक साबित न करे कि ईमेल उसका है, अकाउंट नहीं बनता। नकली और गलत ईमेल बाहर रहते हैं। |
| Stops anyone guessing passwords | Like an ATM after too many wrong PINs, CKAuth blocks repeated wrong tries, even if the thief keeps changing internet. | पासवर्ड का अंदाज़ा लगाने वालों को रोकता है | जैसे ATM बार-बार गलत PIN पर कार्ड रोक देता है, वैसे ही CKAuth गलत कोशिशें रोक देता है, चाहे चोर इंटरनेट बदलता रहे। |
| Locks passwords away, even from us | Passwords are kept in a secret code, like cash in a bank locker. Stolen data is useless to a thief. | पासवर्ड तिजोरी में रखता है, हमसे भी दूर | पासवर्ड गुप्त कोड में रहते हैं, जैसे बैंक लॉकर में पैसे। चोरी हुआ डेटा चोर के किसी काम का नहीं। |
| Sends links that work only once | Every email link works one time and stops after 15 minutes, just like an OTP. | एक बार चलने वाले लिंक भेजता है | हर ईमेल लिंक सिर्फ़ एक बार चलता है और 15 मिनट में बंद हो जाता है, बिल्कुल OTP की तरह। |
| Keeps your customer list private | Fraudsters can't find out who is registered. Everyone gets the same answer. | ग्राहकों की लिस्ट निजी रखता है | धोखेबाज़ पता नहीं लगा सकते कि कौन रजिस्टर है। सबको एक जैसा जवाब मिलता है। |
| Logs out lost phones for you | When a customer changes or resets their password, every other phone and computer is logged out. | खोए फ़ोन से अपने-आप लॉग-आउट | ग्राहक पासवर्ड बदले या रीसेट करे, तो बाकी सभी फ़ोन और कंप्यूटर लॉग-आउट हो जाते हैं। |

---

## 5. One simple path (replaces "From cadet to inside")

**Section heading**
- Eyebrow: EN: How it works · HI: यह कैसे काम करता है
- Title: EN: Sign up. Confirm. Stay safe. · HI: साइन-अप करें। पक्का करें। सुरक्षित रहें।
- Body: EN: No passwords in emails, no codes to copy, no guessing what comes next. · HI: ईमेल में कोई पासवर्ड नहीं, कोई कोड कॉपी नहीं, कोई उलझन नहीं।

| # | EN title | EN text | HI title | HI text |
|---|---|---|---|---|
| 1 | Sign up | Name, email, password. A meter shows if the password is strong. | साइन-अप करें | नाम, ईमेल, पासवर्ड। मीटर बताता है कि पासवर्ड मज़बूत है या नहीं। |
| 2 | Confirm your email | Click the link we send and enter your password once more. You're in. | ईमेल पक्का करें | भेजे गए लिंक पर क्लिक करें और पासवर्ड एक बार फिर डालें। आप अंदर हैं। |
| 3 | Stay logged in, safely | No login on every visit. CKAuth quietly checks it's still you. | सुरक्षित लॉग-इन रहें | हर बार लॉगिन नहीं। CKAuth चुपचाप जाँचता रहता है कि यह आप ही हैं। |
| 4 | Forgot your password? | A reset link by email, and you're back in a minute. | पासवर्ड भूल गए? | ईमेल पर रीसेट लिंक, और एक मिनट में वापस अंदर। |

---

## 6. Built for a small business (new; replaces "Built for the worst day")

**Section heading**
- Eyebrow: EN: For your business · HI: आपके बिज़नेस के लिए
- Title: EN: Big-company safety. No tech team needed. · HI: बड़ी कंपनियों जैसी सुरक्षा। टेक टीम की ज़रूरत नहीं।
- Body: EN: A single break-in can cost years of trust. CKAuth helps you keep that trust, without hiring anyone. · HI: एक चोरी सालों का भरोसा तोड़ सकती है। CKAuth बिना किसी को नौकरी पर रखे, वह भरोसा बनाए रखने में मदद करता है।

| EN title | EN text | HI title | HI text |
|---|---|---|---|
| Fewer calls for you | Customers reset passwords and change their photo themselves. | आपको कम फ़ोन | ग्राहक पासवर्ड और फ़ोटो खुद बदल लेते हैं। |
| More customers who trust you | A safe, smooth login looks professional. People buy where they feel safe. | ज़्यादा भरोसेमंद ग्राहक | सुरक्षित और आसान लॉगिन प्रोफ़ेशनल लगता है। लोग वहीं खरीदते हैं जहाँ सुरक्षित महसूस करें। |
| Nobody can pretend to be your customer | Signing up with someone else's email gets a fraudster nothing. They'd need the inbox and the password. | कोई आपके ग्राहक का रूप नहीं ले सकता | किसी और के ईमेल से साइन-अप करके धोखेबाज़ को कुछ नहीं मिलता। उसे ईमेल और पासवर्ड, दोनों चाहिए। |
| Only real photos get in | Every profile photo is checked, so harmful files dressed as pictures are blocked. | सिर्फ़ असली फ़ोटो | हर प्रोफ़ाइल फ़ोटो जाँची जाती है, फ़ोटो के भेस में आई खतरनाक फ़ाइलें रुक जाती हैं। |

---

## 7. For web developers (the second way in)

- Eyebrow: EN: Build websites for clients? · HI: क्लाइंट्स के लिए वेबसाइट बनाते हैं?
- Title: EN: Give every client the same strong lock. · HI: हर क्लाइंट को वही मज़बूत ताला दीजिए।
- Body: EN: CKAuth's code is open on GitHub, with a clear API guide. Set it up once, use it on every site you build. · HI: CKAuth का कोड GitHub पर खुला है, साथ में आसान API गाइड। एक बार सेट करें, हर वेबसाइट पर इस्तेमाल करें।
- Button: EN: View the code on GitHub · HI: GitHub पर कोड देखें. Link: https://github.com/chiragdev1/ckauth (the README there explains setup).

---

## 8. Pricing (placeholder plans; CKAuth is free for now)

**Section heading**
- Eyebrow: EN: Pricing · HI: कीमत
- Title: EN: Less than a cup of chai a day. · HI: रोज़ एक कप चाय से भी कम।
- Body: EN: Every plan gets the full security guard. Pay only when your business grows. · HI: हर प्लान में पूरा सुरक्षा गार्ड। पैसे तभी, जब आपका बिज़नेस बढ़े।
- Launch banner (show above the cards): EN: 🎉 Launch offer: everything is free for now. Paid plans haven't started yet. · HI: 🎉 लॉन्च ऑफ़र: अभी सब कुछ मुफ़्त है। पेड प्लान अभी शुरू नहीं हुए हैं।

| | Free | Monthly | Yearly |
|---|---|---|---|
| Price (EN) | ₹0 | ₹99 / month | ₹999 / year |
| Price (HI) | ₹0 | ₹99 / महीना | ₹999 / साल |
| Tagline (EN) | To try it out | For a growing shop | Best value: save ₹189 |
| Tagline (HI) | आज़माने के लिए | बढ़ती दुकान के लिए | सबसे फ़ायदेमंद: ₹189 की बचत |
| Includes (EN) | All security features · Email check for every customer · Password reset by email | Everything in Free · Priority email help · Your shop name on login emails | Everything in Monthly · 2 months' worth of savings · Early access to new features |
| Includes (HI) | सारी सुरक्षा सुविधाएँ · हर ग्राहक का ईमेल जाँच · ईमेल से पासवर्ड रीसेट | Free की सारी सुविधाएँ · ईमेल पर जल्दी मदद · लॉगिन ईमेल पर आपकी दुकान का नाम | Monthly की सारी सुविधाएँ · लगभग 2 महीने की बचत · नई सुविधाएँ सबसे पहले |
| Button (EN) | Start free | Coming soon | Coming soon |
| Button (HI) | मुफ़्त शुरू करें | जल्द आ रहा है | जल्द आ रहा है |

Notes on the placeholder plans:
- ₹99 × 12 = ₹1,188, so the yearly plan saves ₹189 (about 16%, close to 2 months free). ₹99 a month is about ₹3.30 a day, which is where the chai line comes from.
- The paid plans list **features CKAuth doesn't have yet** (priority help, your shop name on emails, early access). They're placeholders. Keep "Coming soon" on those buttons and the launch banner until the features exist.
- Mark the yearly card as the recommended plan.

---

## 9. Good to know (FAQ)

| EN question | EN answer | HI question | HI answer |
|---|---|---|---|
| Do I need to know coding? | No. Your customers just see a simple, safe login. | क्या मुझे कोडिंग आनी चाहिए? | नहीं। आपके ग्राहकों को बस आसान और सुरक्षित लॉगिन दिखता है। |
| Can you see my customers' passwords? | No. They're stored in a secret code nobody can read, including us. | क्या आप मेरे ग्राहकों के पासवर्ड देख सकते हैं? | नहीं। वे ऐसे गुप्त कोड में रहते हैं जिसे कोई नहीं पढ़ सकता, हम भी नहीं। |
| What if a customer forgets their password? | They reset it themselves with an email link. No call to you. | अगर ग्राहक पासवर्ड भूल जाए तो? | वह ईमेल लिंक से खुद रीसेट कर लेता है। आपको फ़ोन नहीं करना पड़ता। |
| What if a customer loses their phone? | Changing the password logs out every other device. | अगर ग्राहक का फ़ोन खो जाए तो? | पासवर्ड बदलते ही बाकी सभी डिवाइस लॉग-आउट हो जाते हैं। |
| Does it work on mobile? | Yes, on every phone, tablet and computer. | क्या यह मोबाइल पर चलता है? | हाँ, हर फ़ोन, टैबलेट और कंप्यूटर पर। |
| How much does it cost? | Free for now. Paid plans will start later at ₹99/month or ₹999/year, and there will always be a free plan. | इसकी कीमत क्या है? | अभी मुफ़्त है। पेड प्लान बाद में ₹99/महीना या ₹999/साल से शुरू होंगे, और मुफ़्त प्लान हमेशा रहेगा। |
| How do I get help? | Email us at chiragaroradev@gmail.com. | मदद कैसे मिलेगी? | हमें chiragaroradev@gmail.com पर ईमेल करें। |

---

## 10. Closing call to action (bottom of the page)

- Title: EN: Start today. Sleep easy tonight. · HI: आज शुरू करें। आज रात चैन की नींद सोएँ।
- Alternative title: EN: Stop worrying about break-ins. Let CKAuth keep watch. · HI: चोरी की चिंता छोड़िए। पहरा CKAuth देगा।
- Body: EN: Create an account in under a minute and see how safe and simple it feels. · HI: एक मिनट से कम में अकाउंट बनाएँ और खुद देखें कि यह कितना आसान और सुरक्षित है।
- Buttons: EN: Try it free / Talk to us · HI: मुफ़्त में आज़माएँ / हमसे बात करें
- "Talk to us" opens: mailto:chiragaroradev@gmail.com
- Contact line: EN: Questions? Write to chiragaroradev@gmail.com · HI: कोई सवाल? chiragaroradev@gmail.com पर लिखें

---

## 11. WhatsApp share message

**English**

> 🔒 Your shop has a strong lock. Does your website?
>
> Meet CKAuth, your website's security guard:
> ✅ Checks every new customer's email
> ✅ Stops wrong password guesses, like an ATM PIN
> ✅ Locks passwords away, even from us
> ✅ One-time links that expire, like an OTP
>
> You run your business. CKAuth guards the door.
> 👉 Try it free: https://ckauth.chiragdev.com

**हिंदी**

> 🔒 आपकी दुकान पर मज़बूत ताला है। क्या आपकी वेबसाइट पर भी है?
>
> मिलिए CKAuth से, आपकी वेबसाइट का सुरक्षा गार्ड:
> ✅ हर नए ग्राहक का ईमेल जाँचता है
> ✅ ATM PIN की तरह, गलत पासवर्ड की कोशिशें रोकता है
> ✅ पासवर्ड तिजोरी में, हमसे भी दूर
> ✅ OTP की तरह, एक बार चलने वाले लिंक
>
> आप अपना बिज़नेस चलाइए, दरवाज़ा CKAuth संभालेगा।
> 👉 मुफ़्त में आज़माएँ: https://ckauth.chiragdev.com
