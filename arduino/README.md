# WellCare ESP32 Biometric Hardware Setup Guide

This guide walks you through configuring your **ESP32** and **Optical Fingerprint Sensor (AS608 / R307 / R305 / FPM10A)** in Arduino IDE to work with the WellCare System.

---

## 1. Hardware Pinout & Wiring

Connect the Optical Fingerprint Sensor to your ESP32 board:

| Optical Sensor Wire / Pin | ESP32 Pin | Note |
|---|---|---|
| **VCC (Red)** | **VIN / 5V** (or 3.3V) | Sensor works best on 5V (VIN when powered by USB) |
| **GND (Black)** | **GND** | Common ground |
| **TX (Yellow / Green)** | **GPIO 16 (RX2)** | Sensor Data Output to ESP32 Data Input |
| **RX (White / Blue)** | **GPIO 17 (TX2)** | ESP32 Data Output to Sensor Data Input |

*(Note: Sensor TX always connects to ESP32 RX, and Sensor RX connects to ESP32 TX).*

---

## 2. Arduino IDE Setup

### A. Install ESP32 Board Package
1. Open **Arduino IDE**.
2. Go to **File** > **Preferences**.
3. In **Additional boards manager URLs**, add:
   ```text
   https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
   ```
4. Click **OK**.
5. Go to **Tools** > **Board** > **Boards Manager...**.
6. Search for `esp32` by **Espressif Systems** and click **Install**.

### B. Install Required Libraries
In Arduino IDE, open **Tools** > **Manage Libraries...** (or press `Ctrl + Shift + I`):
1. Search for: **`Adafruit Optical Fingerprint Sensor`** by Adafruit -> Click **Install**.
2. Search for: **`ArduinoJson`** by Benoit Blanchon -> Click **Install**.

---

## 3. Configure the Sketch

Open the sketch file:
`arduino/wellcare_biometric_esp32/wellcare_biometric_esp32.ino`

Update the following settings at the top of the file:

```cpp
// 1. Enter your 2.4GHz Wi-Fi details (ESP32 only supports 2.4GHz)
const char* WIFI_SSID     = "Your_WiFi_Name";
const char* WIFI_PASSWORD = "Your_WiFi_Password";

// 2. Set your server endpoint
// For local testing on your PC:
const char* SERVER_BASE_URL = "http://192.168.1.XXX:5000/api/v1"; 

// OR for Live Cloud Render Backend:
// const char* SERVER_BASE_URL = "https://wellcare-1zo0.onrender.com/api/v1";

// 3. Keep the device security key:
const char* DEVICE_KEY = "heiwa_device";
```

> **Tip for Local Testing**: To find your PC's IP address on Windows, open Command Prompt or PowerShell and type `ipconfig`. Look for **IPv4 Address** (e.g. `192.168.1.15`).

---

## 4. Upload to ESP32

1. Plug your ESP32 into your computer with a micro-USB / Type-C cable.
2. Select your board: **Tools** > **Board** > **ESP32 Arduino** > **DOIT ESP32 DEVKIT V1** (or ESP32 Dev Module).
3. Select your COM Port: **Tools** > **Port** > (Choose your COM port).
4. Click the **Upload** button (`→`).
   *(If the IDE says "Connecting......", press and hold the **BOOT** button on your ESP32 for 2 seconds until uploading starts).*

---

## 5. How It Works

Once uploaded, open the **Serial Monitor** at **115200 baud**:

1. **Daily Attendance Verification**:
   - When any registered client places their finger on the sensor, the ESP32 matches it against stored templates.
   - It sends `POST /api/v1/fingerprint/verify`.
   - The backend records the visit, increments the client's session count, and returns the client's name.

2. **Client Registration & Enrollment**:
   - Go to the WellCare Web Portal: **Register Client** > Step 2.
   - Click **Start Fingerprint Scan**.
   - The ESP32 automatically detects the web request and guides the user to place and re-place their finger.
   - Once saved to a sensor ID, the ESP32 notifies the web dashboard and attaches the fingerprint ID to the client!
