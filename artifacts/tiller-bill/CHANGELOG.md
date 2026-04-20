# Tractor Bill - Release v5.0.0

## [5.0.0] - Production Release
### Added
- Global File Picker (expo-document-picker) supporting ZArchiver and native file managers.
- Google Drive Data Wipe utility in Sync Settings.
- Independent Customer vs. Line-Item editing logic in Pending and History tabs.
- Foreground Service Notifications (Notifee) with live lock-screen Chronometers.
- Dynamic lock-screen controls (Pause/Stop) spawning individually per active timer.
- User Profile photo sync across all tab headers.
- Global Discount application logic (Percentage and Flat) applied to Timers and Ledger items.

### Fixed
- Fatal crashes resulting from missing Contact photos (Optional chaining applied).
- Aggressive Google Auth logout preserving Drive consent on session clear.
- Calendar strict validation regex causing invisible/blank text inputs.
- Floating Action Buttons blocking ScrollView content via global bottom padding.
- Calculator silent save routed securely through Customer Details prompt.
- Universal data persistence for Customer Images across DataContext.

## [4.0.8] - Architecture & Permissions
- Fixed WhatsApp URI country code formatting.
- Fixed Google Drive Sync Permissions (ACCESS_TOKEN_SCOPE_INSUFFICIENT).
- Eradicated hardcoded names from Hindi (hi) and Tamil (ta) dictionaries.
- Stripped Web URI custom schemes to prevent Google Auth Error 400.
- Standardized UPI QR generation strings to bypass rigid banking app strictness.
