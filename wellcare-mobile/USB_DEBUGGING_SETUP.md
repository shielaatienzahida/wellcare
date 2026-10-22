# WellCare Mobile App - USB Debugging Installation Guide

## Prerequisites
- Android phone (Android 5.0 or higher)
- USB cable
- Windows PC with Flutter SDK installed
- USB drivers for your phone installed

---

## Step 1: Enable USB Debugging on Your Phone

### For Android 12 and above:
1. Open **Settings**
2. Go to **About Phone**
3. Tap **Build Number** 7 times until you see "You are now a developer"
4. Go back to **Settings** → **System** → **Developer Options**
5. Enable **USB Debugging**
6. Enable **Install via USB** (if available)

### For Android 11 and below:
1. Open **Settings**
2. Go to **About Phone**
3. Tap **Build Number** 7 times
4. Go back to **Settings** → **Developer Options**
5. Enable **USB Debugging**

---

## Step 2: Connect Your Phone via USB

1. Connect your phone to the PC using a USB cable
2. On your phone, select **File Transfer** or **MTP** mode (not Charging Only)
3. If prompted on phone, tap **Allow** to grant USB debugging permission

---

## Step 3: Verify Connection

Open Command Prompt/PowerShell and run:
```bash
adb devices
```

You should see your device listed. Example:
```
List of attached devices
ABC123XYZ456    device
```

If you see "unauthorized", disconnect and reconnect, then tap "Allow" on your phone.

---

## Step 4: Install the App via USB

Navigate to the wellcare-mobile directory:
```bash
cd "c:\Users\shiela\Desktop\wellcare-system up1\wellcare-mobile"
```

Run the app on your connected device:
```bash
flutter run
```

Or for release build:
```bash
flutter run --release
```

---

## Step 5: Monitor Installation

The console will show:
```
Launching lib/main.dart on [Your Device] in debug mode...
```

Wait for the app to build and install. This may take 2-5 minutes on first run.

---

## Troubleshooting

### Device not recognized
- Install Android USB drivers for your phone model
- Try a different USB cable
- Restart adb: `adb kill-server` then `adb devices`

### "Unauthorized" error
- Disconnect the phone
- Reconnect and tap "Allow" on the permission prompt
- Run `adb devices` again

### Build fails
- Run `flutter clean`
- Run `flutter pub get`
- Try again: `flutter run`

### App crashes on startup
- Check that the backend API is running
- Verify internet connection on phone
- Check logs: `flutter logs`

---

## Backend API Configuration

The app connects to: `http://192.168.x.x:5000` (or your PC's IP)

To find your PC's IP:
```bash
ipconfig
```

Look for "IPv4 Address" under your network adapter.

Update the API URL in `lib/main.dart` if needed.

---

## Quick Commands

| Command | Purpose |
|---------|---------|
| `flutter run` | Install and run in debug mode |
| `flutter run --release` | Install and run in release mode |
| `adb devices` | List connected devices |
| `adb logcat` | View device logs |
| `flutter logs` | View Flutter logs |
| `flutter clean` | Clean build files |
| `flutter pub get` | Get dependencies |

---

## App Features

✅ Client Portal with home, profile, messages, notifications, history
✅ Dark theme with emerald green color scheme
✅ Real-time session tracking
✅ Membership card display
✅ Personal information management
✅ Message communication with admin/staff

---

## Support

If you encounter issues:
1. Check the logs: `flutter logs`
2. Verify backend is running
3. Ensure phone has internet access
4. Try `flutter clean` and rebuild

