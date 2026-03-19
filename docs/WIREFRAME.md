# Frontend Wireframe — Secure Webmail Client

## Layout (Desktop)

```
+------------------------------------------------------------------+
|  [Logo]  SecureMail     [Search box........................]  [Compose] [Settings] [Avatar] |
+----------+----------------------------------------------------------------+------------------+
|          |                                                                |                  |
| Inbox    |  Subject / Sender (thread)          Date         [ ]  [ ]     |  Preview / Open  |
| Sent     |  --------------------------------------------------------------------------------  |  email content   |
| Drafts   |  Re: Project update                   Yesterday    [ ]  [ ]     |  or thread       |
| Spam     |  --------------------------------------------------------------------------------  |                  |
| Trash    |  Welcome to SecureMail                Mar 10       [ ]  [ ]     |  [Reply][Fwd]    |
| ---      |  --------------------------------------------------------------------------------  |  Attachments     |
| Contacts |  ...                                                                               |  ...             |
|          |                                                                |                  |
+----------+----------------------------------------------------------------+------------------+
```

## Regions

1. **Top bar**
   - Logo + app name.
   - Global search (by sender, subject, date).
   - Compose (primary CTA).
   - Notifications bell.
   - User menu: Settings, Logout, 2FA.

2. **Left sidebar**
   - Inbox (with unread count).
   - Sent, Drafts, Spam, Trash.
   - Divider.
   - Contacts (encrypted; opens contact list or modal).
   - Collapsible on small screens (hamburger).

3. **Center: Email list**
   - Rows: avatar/icon, sender (or thread subject), subject/snippet, date, star, checkbox.
   - Bulk actions when selection: Mark read, Move, Delete, Spam.
   - Pagination or infinite scroll.
   - Thread grouping: one row per thread with count; expand to show thread emails.

4. **Right: Preview panel**
   - If no selection: placeholder “Select an email”.
   - If selected: email body (decrypted in client), attachments, Reply / Reply all / Forward.
   - Optional: open in full-screen read view (modal or new route).

## Compose (Modal or Full Page)

- To, Cc, Bcc (with autocomplete from contacts).
- Subject.
- Rich text or plain body.
- Attachments: drag-and-drop or click; show list with remove.
- Encrypt indicator: “Encrypted for: user1@domain.com, user2@domain.com” or “Not encrypted (external)”.
- Actions: Save draft, Send, Discard.

## Key Screens

- **Login**: Email + password; “Forgot password?”; “Register”.
- **Register**: Email + password + confirm; terms; then “Verify your email” or redirect to key setup.
- **Key setup (first time)**: “Generate your encryption keys” (client-side); progress; “Backup your recovery key” (optional).
- **Settings**: Profile (email, change password), 2FA (enable/disable), Security (sessions list, revoke), Notifications (web push, email alerts).
- **Contacts**: List with search; add/edit (name, email, notes — encrypted).
- **Search results**: Same list layout filtered by query + facets (folder, date, sender).

## Mobile / PWA

- Bottom nav or drawer: Inbox, Compose, Contacts, Settings.
- List takes full width; tap opens read view (full screen).
- Offline: cached list and last opened emails; queue outbound for send when online.

## Security UX

- Lock icon next to encrypted emails/recipients.
- Warning banner when replying to unencrypted or external.
- Session timeout warning; “Lock” button to clear in-memory keys.
