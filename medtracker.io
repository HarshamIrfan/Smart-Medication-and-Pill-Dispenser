#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include <RTClib.h>
#include <Keypad.h>
#include <ESP32Servo.h>
#include <EEPROM.h>
#include <WiFi.h>
#include <WebServer.h>

// LCD and RTC setup
LiquidCrystal_I2C lcd(0x27, 16, 2);
RTC_DS3231 rtc;
Servo myservo;

// Pins
#define IR_PIN 32
#define BUZZER_PIN 23
#define SERVO_PIN 12
#define EEPROM_SIZE 512

// Variables
String lastState = "Not Taken";
int tablet1Hour = 8, tablet1Minute = 0;
int tablet2Hour = 20, tablet2Minute = 0;
bool tablet1Taken = false, tablet2Taken = false;
int currentMenu = 0; // 0: Main, 1: Tablet 1 Time, 2: Tablet 2 Time
int cursorPosition = 0; // Position within time-setting menu
unsigned long irLastDetected = 0;
const unsigned long irCooldown = 5000; // 5 seconds cooldown between dispenses

// Keypad configuration
const byte ROWS = 4;
const byte COLS = 4;
char keys[ROWS][COLS] = {
  {'1', '2', '3', 'A'},
  {'4', '5', '6', 'B'},
  {'7', '8', '9', 'C'},
  {'*', '0', '#', 'D'}
};
byte rowPins[ROWS] = {19, 18, 5, 17};
byte colPins[COLS] = {16, 4, 0, 2};
Keypad keypad = Keypad(makeKeymap(keys), rowPins, colPins, ROWS, COLS);

// Web Server Setup
WebServer server(80);  // Create a web server object that listens on port 80

// Helper Functions
String formatTime(int hour, int minute) {
  char buffer[6];
  sprintf(buffer, "%02d:%02d", hour, minute);
  return String(buffer);
}

void dispenseTablet() {
  Serial.println("Dispensing tablet...");
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Dispensing...");

  myservo.write(180);  // Rotate to dispense position
  delay(1000);        // Hold for 1 second
  myservo.write(0);   // Return to initial position
  delay(500);         // Wait before resetting

  lastState = "Taken";
  lcd.setCursor(0, 1);
  lcd.print("Tablet Taken");
  delay(2000);
  lcd.clear();
  Serial.println("Tablet dispensed.");
}

void displayTime(int hour, int minute) {
  static unsigned long lastUpdateTime = 0;
  static bool showDashes = true;

  lcd.setCursor(0, 0);
  lcd.print("Set Tablet ");
  lcd.print(currentMenu);

  unsigned long currentMillis = millis();

  // Toggle dashes visibility every second
  if (currentMillis - lastUpdateTime >= 500) {
    lastUpdateTime = currentMillis;
    showDashes = !showDashes; // Toggle dashes on/off
  }

  if (showDashes) {
    if (cursorPosition == 0) {
      lcd.setCursor(0, 1);
      lcd.print("  ");  // Dashes under hour
    } else {
      lcd.setCursor(3, 1);
      lcd.print("  ");  // Dashes under minute
    }
  } else {
    lcd.setCursor(0, 1);
    lcd.print(formatTime(hour, minute) + "  "); // Ensure padding for clearing previous characters
  }
}

void handleRoot() { ( 
Your html code for website 
  )rawliteral";
  server.send(200, "text/html", html);
}
void setup() {
  Serial.begin(115200);
  // Initialize LCD
  lcd.begin();
  lcd.backlight();
  lcd.setCursor(0, 0);
  lcd.print("Initializing...");
  // Initialize RTC
  Wire.begin();
  if (!rtc.begin()) {
    lcd.setCursor(0, 1);
    lcd.print("RTC Fail!");
    while (1);
  }
  // Pin setup
  pinMode(IR_PIN, INPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  myservo.attach(SERVO_PIN, 500, 2500);
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("Ready...");
  // Set up Wi-Fi as Access Point
  WiFi.softAP("MedicationTracker", "123456789");  // AP Name and Password
  Serial.println("Access Point Started");
  Serial.print("IP Address: ");
  Serial.println(WiFi.softAPIP());  // Print the IP address of the ESP32
  // Set up web server to handle root requests
  server.on("/", HTTP_GET, handleRoot);
  server.begin();
}
void loop() {
  server.handleClient();  // Handle incoming client requests
  char key = keypad.getKey();
  if (currentMenu == 0) {
    // Main menu: Display date, time, and tablet status
    DateTime now = rtc.now();
    lcd.setCursor(0, 0);
    if (tablet1Taken) {
      lcd.print("T1: Taken   ");
    } else {
      lcd.print("T1:" + formatTime(tablet1Hour, tablet1Minute) + " ");
    }
    lcd.setCursor(0, 1);
    if (tablet2Taken) {
      lcd.print("T2: Taken   ");
    } else {
      lcd.print("T2:" + formatTime(tablet2Hour, tablet2Minute) + " ");
    }
    lcd.setCursor(11, 0);
    lcd.print(String(now.day()) + "/" + String(now.month()) + " ");
    lcd.setCursor(11, 1);
    lcd.print(String(now.hour()) + ":" + String(now.minute()) + " ");
    // Check if it's time for tablet 1 or tablet 2
    if (now.hour() == tablet1Hour && now.minute() == tablet1Minute && !tablet1Taken) {
      dispenseTablet();
      tablet1Taken = true;
    }
    if (now.hour() == tablet2Hour && now.minute() == tablet2Minute && !tablet2Taken) {
      dispenseTablet();
      tablet2Taken = true;
    }
    // Reset tablet status at midnight
    if (now.hour() == 0 && now.minute() == 0) {
      tablet1Taken = false;
      tablet2Taken = false;
    }
    // IR Sensor Logic
    if (digitalRead(IR_PIN) == LOW) {  // Hand detected
      unsigned long currentMillis = millis();
      if (currentMillis - irLastDetected >= irCooldown) {
        Serial.println("Hand detected. Dispensing tablet...");
        irLastDetected = currentMillis;
        dispenseTablet();
        digitalWrite(BUZZER_PIN, HIGH);
        delay(200);
        digitalWrite(BUZZER_PIN, LOW);
      }
    }
    // Navigate to the menu
    if (key == 'A') {
      currentMenu = 1;
      lcd.clear();
    } else if (key == 'B') {
      currentMenu = 2;
      lcd.clear();
    }
  } else if (currentMenu == 1 || currentMenu == 2) {
    // Tablet time-setting menu
    int &hour = (currentMenu == 1) ? tablet1Hour : tablet2Hour;
    int &minute = (currentMenu == 1) ? tablet1Minute : tablet2Minute;
    displayTime(hour, minute);
    if (key == 'C') {
      // Move cursor left
      cursorPosition = (cursorPosition == 0) ? 1 : 0;
    } else if (key == 'D') {
      // Move cursor right
      cursorPosition = (cursorPosition == 1) ? 0 : 1;
    } else if (key == 'A') {
      // Increment hour/minute
      if (cursorPosition == 0) {
        hour = (hour + 1) % 24;
      } else {
        minute = (minute + 1) % 60;
      }
    } else if (key == 'B') {
      // Decrement hour/minute
      if (cursorPosition == 0) {
        hour = (hour == 0) ? 23 : hour - 1;
      } else {
        minute = (minute == 0) ? 59 : minute - 1;
      }
    } else if (key == '#') {
      // Exit menu
      currentMenu = 0;
      cursorPosition = 0; // Reset cursor position
      lcd.clear();
    }
  }
}
