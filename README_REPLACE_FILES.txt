LinkLedger React messenger migration files

Copy these files into your React frontend exactly as shown:

src/App.jsx
src/components/AdminMessenger.jsx
src/components/DashboardMessenger.jsx
src/pages/AdminConsents.jsx
src/styles/admin_messages.css
src/styles/chat.css

What changed:
- App.jsx now imports messenger/consent components instead of relying on the giant embedded messenger.
- Admin messenger is separated into src/components/AdminMessenger.jsx.
- Dashboard messenger is separated into src/components/DashboardMessenger.jsx.
- Consent approval page is separated into src/pages/AdminConsents.jsx and keeps notifyInbox: true.
- Messenger CSS is separated into src/styles/admin_messages.css and src/styles/chat.css.

Important:
- This does not touch backend files.
- Your existing App.jsx structure remains, but the messenger usages now point to imported components.
- If Vite complains about duplicate unused functions, that is not a runtime blocker. The old embedded messenger functions are left in App.jsx intentionally so we do not accidentally remove unrelated code.
