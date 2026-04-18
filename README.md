# Tractor Bill 🚜

**Tractor Bill** is a React Native mobile application designed specifically for agricultural finance tracking and billing. It streamlines creating bills, tracking debts, scheduling reminders, and receiving payments via standardized Universal UPI QR codes, making financial management accessible and efficient for farmers and agricultural businesses.

[![Version](https://img.shields.io/badge/version-v2.3.0-blue.svg)](https://github.com/siva5842/Tractor-Bill/releases)
[![Build Status](https://img.shields.io/badge/build-GitHub%20Actions-success.svg)](#)
[![Platform](https://img.shields.io/badge/platform-Android-green.svg)](#)

## ✨ Key Features

* **Universal UPI QR Billing:** Generates dynamic, standard UPI QR codes (`upi://pay`) directly on the screen. Customers can scan with Google Pay, PhonePe, or Paytm to instantly pay the exact bill amount without needing the app installed.
* **Google Authentication:** Secure, one-tap login using Google Sign-In, pulling user profiles dynamically to personalize the app experience.
* **Smart Scheduling:** Freeform date parsing engine. Enter dates naturally (e.g., "1322026" or "13 2 26") and the app automatically formats them into standard calendar reminders.
* **Debt & Contact Management:** Seamlessly import phone contacts with a built-in search/filter interface to easily attach bills and debts to specific individuals.
* **Media & Receipt Tracking:** Robust image picker integration allows users to upload item images and receipts securely.
* **Cloud Ready:** Configured with Google Drive API scopes to prepare for seamless cloud data backups.

## 🛠️ Tech Stack

* **Framework:** React Native / Expo
* **Language:** TypeScript / JavaScript
* **Authentication:** Google OAuth 2.0 (Google Cloud Console)
* **CI/CD:** GitHub Actions (Automated Android APK compilation)
* **Build Tools:** EAS CLI, Gradle, Android NDK

## 🚀 Automated Deployment (CI/CD)

This repository is configured with a fully automated deployment pipeline. You do not need to build the APK locally. 

To generate a new release:
1. Push your code changes to the `main` branch.
2. Create a new Git tag representing the version (e.g., `git tag v2.4.0`).
3. Push the tag to GitHub (`git push origin v2.4.0`).
4. **GitHub Actions** will automatically spin up a cloud server, flatten the directory, compile the React Native Android code, and publish a new `.apk` file directly to the [Releases page](../../releases).

## 💻 Local Development Setup

If you want to run the app locally on an emulator or physical device for development:

### Prerequisites
* [Node.js](https://nodejs.org/) (v20 LTS recommended)
* [Java JDK](https://adoptium.net/) (Strictly v17 for Android Gradle compatibility)
* [Android Studio](https://developer.android.com/studio) (for local emulators and SDKs)

### Installation

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/siva5842/Tractor-Bill.git](https://github.com/siva5842/Tractor-Bill.git)
   cd Tractor-Bill/artifacts/tiller-bill
