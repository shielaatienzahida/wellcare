/*
 * =========================================================================
 * WELLCARE HEALTH & WELLNESS SYSTEM - ESP32 BIOMETRIC KIOSK
 * Board: ESP32 Dev Module (WROOM / NodeMCU-32S)
 * Sensor: Optical Fingerprint Sensor (AS608 / R307 / R305 / FPM10A)
 * Display: 0.96" I2C OLED (SSD1306 128x64, address 0x3C or 0x3D)
 * =========================================================================
 * 
 * Required Libraries (Install via Arduino IDE Library Manager):
 * 1. "Adafruit Optical Fingerprint Sensor" by Adafruit
 * 2. "Adafruit SSD1306" by Adafruit
 * 3. "Adafruit GFX Library" by Adafruit
 * 4. "ArduinoJson" by Benoit Blanchon (Version 6 or 7)
 * 
 * Wiring (CRITICAL - PLEASE VERIFY):
 * [Fingerprint Sensor (AS608 / R307 / FPM10A) to ESP32]
 * - Sensor VCC (Red)   --> ESP32 VIN / 5V (NOT 3.3V! Optical LED requires 5V)
 * - Sensor GND (Black) --> ESP32 GND
 * - Sensor TX  (Green) --> ESP32 GPIO 16 (RX2)
 * - Sensor RX  (White) --> ESP32 GPIO 17 (TX2)
 * 
 * [OLED Display to ESP32]
 * - OLED VCC    --> ESP32 3.3V or 5V
 * - OLED GND    --> ESP32 GND
 * - OLED SDA    --> ESP32 GPIO 21
 * - OLED SCL    --> ESP32 GPIO 22
 * 
 * [Optional Buzzer]
 * - Buzzer (+)  --> ESP32 GPIO 32
 * - Buzzer (-)  --> ESP32 GND
 * =========================================================================
 */

#include <WiFi.h>
#include <WiFiMulti.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>
#include <Adafruit_Fingerprint.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

// Brownout & Watchdog protection headers
#include "soc/soc.h"
#include "soc/rtc_cntl_reg.h"

// ── 1. WI-FI & SERVER SECRETS (Loaded from secrets.h) ────────────────────
#if __has_include("secrets.h")
  #include "secrets.h"
#else
  // Default placeholders: copy secrets.h.example -> secrets.h and enter your network details
  #define WIFI_SSID_1 "Your_WiFi_Name"
  #define WIFI_PASS_1 "Your_WiFi_Password"
  #define WIFI_SSID_2 "Backup_Hotspot"
  #define WIFI_PASS_2 "Backup_Password"
  #define SERVER_BASE_URL "https://wellcare-1zo0.onrender.com/api/v1"
  #define DEVICE_KEY "heiwa_device"
#endif

WiFiMulti wifiMulti;

// ── 3. HARDWARE SETUP ───────────────────────────────────────────────────
HardwareSerial mySerial(2);
Adafruit_Fingerprint finger = Adafruit_Fingerprint(&mySerial);
bool sensorReady = false;
unsigned long lastSensorRetry = 0;

// OLED Display (128x64 SSD1306 I2C, Address 0x3C or 0x3D)
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);
bool oledReady = false;

// Buzzer Pin
const int BUZZER_PIN = 32;

// Timing
unsigned long lastEnrollPoll = 0;
const unsigned long POLL_INTERVAL_MS = 2000;
unsigned long lastWiFiRetry = 0;
const unsigned long WIFI_RETRY_INTERVAL = 8000; // Wait 8s before retrying to prevent thrashing
int wifiFailCount = 0;

// Forward declarations
void showOLED(const String &header, const String &line1 = "", const String &line2 = "");
void beep(int ms = 80);
bool tryConnectSensor();
void connectToWiFi();
void scanNearbyNetworks();
void showReadyScreen();
void checkFingerprintVerification();
void sendAttendanceCheckIn(int fingerprintId);
void checkPendingEnrollment();
bool enrollFingerprint(int id, const String &clientName);
int getNextFreeId();
void sendEnrollmentSuccess(String sessionId, int fingerprintId);

// =========================================================================
// OLED HELPER FUNCTION
// =========================================================================
void showOLED(const String &header, const String &line1, const String &line2) {
  if (!oledReady) return;
  display.clearDisplay();

  // Header / Title Banner
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);
  display.setCursor(0, 0);
  display.println(header);
  display.drawLine(0, 10, 127, 10, SSD1306_WHITE);

  // Line 1
  if (line1.length() > 0) {
    display.setCursor(0, 18);
    display.setTextSize(1);
    display.println(line1);
  }

  // Line 2
  if (line2.length() > 0) {
    display.setCursor(0, 38);
    display.setTextSize(1);
    display.println(line2);
  }

  display.display();
  yield();
}

void beep(int ms) {
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, HIGH);
  delay(ms);
  digitalWrite(BUZZER_PIN, LOW);
  yield();
}

// =========================================================================
// SENSOR INITIALIZATION (WITH AUTO-BAUD DETECTION & ZERO HANGS)
// =========================================================================
bool tryConnectSensor() {
  // Step A: Try 57600 baud (Default for AS608 / R307)
  Serial.print("Testing sensor at 57600 baud on GPIO 16 (RX2), 17 (TX2)... ");
  mySerial.begin(57600, SERIAL_8N1, 16, 17);
  finger.begin(57600);
  delay(150);
  yield();

  if (finger.verifyPassword()) {
    Serial.println("FOUND at 57600 baud!");
    sensorReady = true;
    finger.getParameters();
    return true;
  }

  // Step B: Try 9600 baud (Default for some R305/FPM10A sensors)
  mySerial.end();
  delay(50);
  yield();
  Serial.print("Testing sensor at 9600 baud... ");
  mySerial.begin(9600, SERIAL_8N1, 16, 17);
  finger.begin(9600);
  delay(150);
  yield();

  if (finger.verifyPassword()) {
    Serial.println("FOUND at 9600 baud!");
    sensorReady = true;
    finger.getParameters();
    return true;
  }

  // Step C: Try 115200 baud
  mySerial.end();
  delay(50);
  yield();
  Serial.print("Testing sensor at 115200 baud... ");
  mySerial.begin(115200, SERIAL_8N1, 16, 17);
  finger.begin(115200);
  delay(150);
  yield();

  if (finger.verifyPassword()) {
    Serial.println("FOUND at 115200 baud!");
    sensorReady = true;
    finger.getParameters();
    return true;
  }

  Serial.println("NOT DETECTED yet.");
  sensorReady = false;
  return false;
}

// =========================================================================
// SETUP
// =========================================================================
void setup() {
  // Disable Brownout Detector so voltage dips from Wi-Fi/Sensor don't reboot the ESP32
  WRITE_PERI_REG(RTC_CNTL_BROWN_OUT_REG, 0);

  Serial.begin(115200);
  delay(300);
  Serial.println("\n\n========================================");
  Serial.println("  WELLCARE BIOMETRIC SYSTEM (ESP32)     ");
  Serial.printf ("  Reset Reason Code: %d\n", esp_reset_reason());
  Serial.println("========================================");
  Serial.flush();

  // 1. Initialize OLED (Wire on GPIO 21=SDA, GPIO 22=SCL with 100ms timeout)
  Serial.print("[1/3] Initializing I2C OLED display... ");
  Serial.flush();
  Wire.begin(21, 22);
  Wire.setTimeOut(100); // Prevents freeze if I2C wire is loose!
  if (display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {
    oledReady = true;
    display.clearDisplay();
    display.setTextColor(SSD1306_WHITE);
    showOLED("WELLCARE BIOMETRIC", "Starting up...", "Please wait");
    Serial.println("FOUND at 0x3C!");
  } else if (display.begin(SSD1306_SWITCHCAPVCC, 0x3D)) {
    oledReady = true;
    display.clearDisplay();
    display.setTextColor(SSD1306_WHITE);
    showOLED("WELLCARE BIOMETRIC", "Starting up...", "Please wait");
    Serial.println("FOUND at 0x3D!");
  } else {
    Serial.println("Not detected (will continue without OLED).");
  }
  Serial.flush();

  // 2. Try to connect to Fingerprint Sensor
  Serial.print("[2/3] Checking Fingerprint Sensor... ");
  Serial.flush();
  if (tryConnectSensor()) {
    showOLED("SENSOR STATUS", "Fingerprint: OK!", "Connecting WiFi...");
    Serial.println("✓ Fingerprint sensor detected and verified!");
  } else {
    Serial.println("! SENSOR WARNING: Not detected at startup.");
    Serial.println("  -> Check VCC wire: Must be connected to 5V or VIN (optical LED needs 5V)");
    Serial.println("  -> Check GND wire: Must be connected to ESP32 GND");
    Serial.println("  -> Check Green wire (TX): Must connect to GPIO 16 (RX2)");
    Serial.println("  -> Check White wire (RX): Must connect to GPIO 17 (TX2)");
    showOLED("SENSOR WIRING", "Green->16, White->17", "VCC->VIN(5V) GND");
    delay(1500);
  }
  Serial.flush();

  // 3. Connect to Wi-Fi
  Serial.println("[3/3] Starting Wi-Fi initialization...");
  Serial.flush();
  connectToWiFi();

  if (sensorReady) {
    beep(100);
    showReadyScreen();
  }
  Serial.println(">> Setup complete. Entering main loop. <<");
  Serial.flush();
}

void showReadyScreen() {
  showOLED("WELLCARE ATTENDANCE", "Ready for Scan", ">> Place Finger <<");
}

// =========================================================================
// MAIN LOOP
// =========================================================================
void loop() {
  yield(); // Feed watchdog timer

  // 1. Ensure Wi-Fi stays connected (throttled retry)
  if (WiFi.status() != WL_CONNECTED) {
    if (millis() - lastWiFiRetry > WIFI_RETRY_INTERVAL) {
      connectToWiFi();
    }
  }

  // 2. If sensor was not found during boot, retry non-blockingly every 3s
  if (!sensorReady) {
    if (millis() - lastSensorRetry > 3000) {
      lastSensorRetry = millis();
      showOLED("CHECK SENSOR", "Green->16, White->17", "VCC->5V, GND->GND");
      if (tryConnectSensor()) {
        beep(100);
        showOLED("SENSOR DETECTED!", "Ready to use", "");
        delay(1000);
        showReadyScreen();
      }
    }
    delay(100);
    return;
  }

  // 3. Poll for Web Enrollment session (Staff Portal '+ Add Client' or 'Enroll Fingerprint')
  if (millis() - lastEnrollPoll > POLL_INTERVAL_MS) {
    lastEnrollPoll = millis();
    checkPendingEnrollment();
  }

  // 4. Check for Fingerprint Verification (Daily Attendance)
  checkFingerprintVerification();

  delay(30);
}

// =========================================================================
// SCAN NEARBY 2.4 GHz WI-FI NETWORKS (DIAGNOSTIC)
// =========================================================================
void scanNearbyNetworks() {
  Serial.println("\n========================================");
  Serial.println("  SCANNING 2.4 GHz WI-FI NETWORKS       ");
  Serial.println("========================================");
  showOLED("SCANNING WIFI...", "Searching 2.4GHz", "Please wait...");

  int n = WiFi.scanNetworks();
  if (n == 0) {
    Serial.println("No networks found nearby.");
  } else {
    bool foundRedmi = false;
    bool foundRealme = false;
    Serial.printf("Found %d networks:\n", n);
    for (int i = 0; i < n; ++i) {
      Serial.printf("  [%d] %s (%d dBm)\n", i + 1, WiFi.SSID(i).c_str(), WiFi.RSSI(i));
      if (WiFi.SSID(i) == WIFI_SSID_1) foundRedmi = true;
      if (WiFi.SSID(i) == WIFI_SSID_2) foundRealme = true;
    }
    if (!foundRedmi && !foundRealme) {
      Serial.println("\n⚠️ WARNING: Neither 'Redmi 14C' nor 'Realme' was found in 2.4 GHz scan!");
      Serial.println("👉 Make sure Hotspot is turned ON.");
      Serial.println("👉 In phone hotspot settings, ensure AP Band is set to 2.4 GHz (NOT 5.0 GHz)!\n");
      showOLED("HOTSPOT NOT FOUND", "Turn on 2.4GHz", "Redmi 14C or Realme");
      delay(3000);
    } else {
      if (foundRedmi) Serial.println("✓ 'Redmi 14C' is visible in 2.4 GHz!");
      if (foundRealme) Serial.println("✓ 'Realme' is visible in 2.4 GHz!");
    }
  }
  WiFi.scanDelete();
}

// =========================================================================
// WI-FI CONNECT (THROTTLED & ROBUST VIA WIFIMULTI)
// =========================================================================
void connectToWiFi() {
  if (WiFi.status() == WL_CONNECTED) {
    wifiFailCount = 0;
    return;
  }

  lastWiFiRetry = millis();

  Serial.println("\nConnecting to Wi-Fi (Trying 'Realme' / 'Redmi 14C')...");
  showOLED("WIFI CONNECTING", "Realme / Redmi 14C", "Please wait...");

  // Setup WiFiMulti APs
  static bool apAdded = false;
  if (!apAdded) {
    WiFi.persistent(false);
    WiFi.mode(WIFI_STA);
    WiFi.setSleep(false);
    WiFi.setAutoReconnect(true);
    wifiMulti.addAP(WIFI_SSID_1, WIFI_PASS_1);
    wifiMulti.addAP(WIFI_SSID_2, WIFI_PASS_2);
    apAdded = true;
  }

  Serial.print("Connecting to Wi-Fi");
  for (int i = 0; i < 12; i++) {
    yield();
    if (wifiMulti.run() == WL_CONNECTED) {
      break;
    }
    Serial.print(".");
    delay(1000);
  }

  if (WiFi.status() == WL_CONNECTED) {
    wifiFailCount = 0;
    Serial.printf("\n✓ Wi-Fi Connected to '%s'!\n", WiFi.SSID().c_str());
    Serial.print("ESP32 IP: ");
    Serial.println(WiFi.localIP());
    showOLED("WIFI CONNECTED!", "SSID: " + WiFi.SSID(), "IP: " + WiFi.localIP().toString());
    delay(2000);
  } else {
    wifiFailCount++;
    Serial.println("\n✗ Could not connect to hotspot yet. Retrying in 8s...");
    showOLED("WIFI RETRYING", "Turn ON Hotspot:", "Realme / Redmi 14C");

    if (wifiFailCount >= 2) {
      scanNearbyNetworks();
      wifiFailCount = 0;
    }
  }
}

// =========================================================================
// ATTENDANCE VERIFICATION
// =========================================================================
void checkFingerprintVerification() {
  uint8_t p = finger.getImage();
  if (p != FINGERPRINT_OK) {
    return; // No finger placed
  }

  showOLED("SCANNING...", "Reading finger...", "Hold still");
  p = finger.image2Tz();
  if (p != FINGERPRINT_OK) {
    showOLED("SCAN ERROR", "Messy image", "Try again");
    delay(1000);
    showReadyScreen();
    return;
  }

  p = finger.fingerSearch();
  if (p == FINGERPRINT_OK) {
    beep(80);
    Serial.printf("✓ MATCH FOUND! Slot ID: #%d (Confidence: %d)\n", finger.fingerID, finger.confidence);
    showOLED("MATCH FOUND!", "ID: #" + String(finger.fingerID), "Logging check-in...");
    sendAttendanceCheckIn(finger.fingerID);
  } else if (p == FINGERPRINT_NOTFOUND) {
    showOLED("NOT RECOGNIZED", "No match in system", "Register client 1st");
    Serial.println("! Finger scanned but not found in sensor database. Please register client on Web first.");
    delay(2000);
    showReadyScreen();
  } else {
    showOLED("MATCH ERROR", "Please try again", "");
    delay(1000);
    showReadyScreen();
  }

  // Wait until finger is lifted
  unsigned long liftTimeout = millis() + 3000;
  while (finger.getImage() != FINGERPRINT_NOFINGER && millis() < liftTimeout) {
    delay(60);
    yield();
  }
}

// =========================================================================
// SEND CHECK-IN TO SERVER
// =========================================================================
void sendAttendanceCheckIn(int fingerprintId) {
  if (WiFi.status() != WL_CONNECTED) {
    wifiMulti.run();
    delay(300);
  }

  HTTPClient http;
  WiFiClient client;
  String url = String(SERVER_BASE_URL) + "/fingerprint/verify";

  http.begin(client, url);
  http.addHeader("Content-Type", "application/json");

  StaticJsonDocument<200> doc;
  doc["fingerprint_id"] = fingerprintId;
  doc["device_key"] = DEVICE_KEY;

  String requestBody;
  serializeJson(doc, requestBody);

  int httpCode = http.POST(requestBody);
  if (httpCode > 0) {
    String payload = http.getString();
    StaticJsonDocument<512> responseDoc;
    DeserializationError error = deserializeJson(responseDoc, payload);

    if (!error && responseDoc["success"] == true) {
      const char* clientName = responseDoc["client"]["full_name"] | "Client";
      int checkins = responseDoc["client"]["total_checkins"] | 0;

      // Double beep for welcome
      beep(60); delay(60); beep(60);
      showOLED("CHECK-IN LOGGED!", String(clientName), "Visits: " + String(checkins));
      Serial.printf(">>> WELCOME %s! Total Visits: %d <<<\n\n", clientName, checkins);
      delay(3000);
    } else {
      showOLED("CHECK-IN ERROR", "Client not found", "in database");
      delay(2000);
    }
  } else {
    showOLED("SERVER OFFLINE", "HTTP Error", http.errorToString(httpCode));
    Serial.printf("HTTP Post failed: %s\n", http.errorToString(httpCode).c_str());
    delay(2000);
  }

  http.end();
  showReadyScreen();
}

// =========================================================================
// POLL SERVER FOR WEB ENROLLMENT SESSIONS
// =========================================================================
void checkPendingEnrollment() {
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  WiFiClient client;
  String url = String(SERVER_BASE_URL) + "/fingerprint/enroll/pending?device_key=" + String(DEVICE_KEY);

  http.begin(client, url);

  int httpCode = http.GET();
  if (httpCode == HTTP_CODE_OK) {
    String payload = http.getString();
    StaticJsonDocument<512> doc;
    DeserializationError err = deserializeJson(doc, payload);

    if (!err && doc["success"] == true && doc["pending"] == true) {
      String sessionId = doc["session_id"].as<String>();
      String clientName = doc["client_name"].as<String>();

      Serial.println("\n========================================");
      Serial.println(">> WEB ENROLLMENT REQUEST RECEIVED <<");
      Serial.println("Client: " + clientName);
      Serial.println("========================================");
      beep(150);

      int newId = getNextFreeId();
      if (newId < 0) {
        showOLED("MEMORY FULL", "Cannot enroll", "Sensor is full!");
        delay(2500);
        http.end();
        showReadyScreen();
        return;
      }

      bool success = enrollFingerprint(newId, clientName);
      if (success) {
        sendEnrollmentSuccess(sessionId, newId);
        showOLED("ENROLL SUCCESS!", "ID #" + String(newId), "Registered to Web!");
        delay(3000);
      } else {
        showOLED("ENROLL FAILED", "Scan cancelled", "Try again from Web");
        delay(2500);
      }
      showReadyScreen();
    }
  }

  http.end();
}

int getNextFreeId() {
  for (int id = 1; id <= 127; id++) {
    yield();
    if (finger.loadModel(id) != FINGERPRINT_OK) {
      return id;
    }
  }
  return -1;
}

// =========================================================================
// ENROLLMENT PROCESS (2-STEP SCAN WITH OLED PROMPTS & TIMEOUTS)
// =========================================================================
bool enrollFingerprint(int id, const String &clientName) {
  int p = -1;
  String shortName = clientName.length() > 12 ? clientName.substring(0, 12) : clientName;

  showOLED("ENROLL: " + shortName, "Step 1/2: Scan", ">> Place Finger <<");
  Serial.printf("Enrolling for %s into Slot #%d. Waiting for finger...\n", clientName.c_str(), id);

  // Step 1: First scan
  unsigned long timeout = millis() + 25000;
  while (p != FINGERPRINT_OK) {
    p = finger.getImage();
    if (millis() > timeout) {
      Serial.println("Enrollment step 1 timed out.");
      return false;
    }
    delay(50);
    yield();
  }

  p = finger.image2Tz(1);
  if (p != FINGERPRINT_OK) {
    Serial.println("Image conversion 1 failed.");
    return false;
  }

  beep(80);
  showOLED("ENROLL: STEP 1 OK", "Lift finger now...", "Hold on...");

  // Wait for finger removal
  delay(800);
  unsigned long liftTimeout = millis() + 10000;
  while (finger.getImage() != FINGERPRINT_NOFINGER && millis() < liftTimeout) {
    delay(50);
    yield();
  }

  // Step 2: Second scan
  showOLED("ENROLL: " + shortName, "Step 2/2: Confirm", "Place SAME finger");
  Serial.println("Place SAME finger to confirm...");
  timeout = millis() + 25000;
  p = -1;
  while (p != FINGERPRINT_OK) {
    p = finger.getImage();
    if (millis() > timeout) {
      Serial.println("Enrollment step 2 timed out.");
      return false;
    }
    delay(50);
    yield();
  }

  p = finger.image2Tz(2);
  if (p != FINGERPRINT_OK) {
    Serial.println("Image conversion 2 failed.");
    return false;
  }

  // Create & Store model
  p = finger.createModel();
  if (p != FINGERPRINT_OK) {
    showOLED("ENROLL FAILED", "Prints did not match", "Try again!");
    Serial.println("Fingerprints did not match.");
    delay(2000);
    return false;
  }

  p = finger.storeModel(id);
  if (p == FINGERPRINT_OK) {
    beep(80); delay(50); beep(80);
    Serial.printf("✓ Fingerprint successfully saved in Slot #%d!\n", id);
    return true;
  } else {
    Serial.println("Failed to store model in sensor memory.");
    return false;
  }
}

// =========================================================================
// NOTIFY SERVER OF ENROLLMENT CAPTURE
// =========================================================================
void sendEnrollmentSuccess(String sessionId, int fingerprintId) {
  // Ensure Wi-Fi is connected before posting
  int retryCount = 0;
  while (WiFi.status() != WL_CONNECTED && retryCount < 10) {
    wifiMulti.run();
    delay(400);
    yield();
    retryCount++;
  }

  HTTPClient http;
  WiFiClient client;
  String url = String(SERVER_BASE_URL) + "/fingerprint/enroll/capture";

  http.begin(client, url);
  http.addHeader("Content-Type", "application/json");

  StaticJsonDocument<256> doc;
  doc["session_id"] = sessionId;
  doc["fingerprint_id"] = fingerprintId;
  doc["device_key"] = DEVICE_KEY;

  String body;
  serializeJson(doc, body);

  int httpCode = http.POST(body);
  Serial.printf("Server enrollment notify HTTP status: %d\n", httpCode);
  http.end();
}
