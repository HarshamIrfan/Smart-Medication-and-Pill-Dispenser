# 💊 Smart Medication Reminder

A smart IoT-based device that reminds users to take their medicine and tracks medication adherence — with a **physical dispenser** and a **web interface**!

## 🔥 Features

🌐 Web Interface (HTML/CSS/JS)  
✅ Log medications  
✅ View dose logs  
✅ Responsive and simple design

🔌 Hardware (ESP32 + Sensors)  
✅ Real-time clock-based dispense  
✅ IR sensor to detect hand  
✅ Servo motor to drop tablets  
✅ LCD to show status  
✅ Keypad to set times  
✅ Buzzer for alert 

## 🧱 Hardware Components

| Component       | Qty | 💰 Cost (INR) |
|----------------|-----|---------------|
| ESP32 Board     | 1   | ₹400          |
| RTC Module      | 1   | ₹120          |
| LCD (I2C)       | 1   | ₹180          |
| IR Sensor       | 1   | ₹60           |
| Servo Motor     | 1   | ₹150          |
| Keypad (4x4)    | 1   | ₹100          |
| Buzzer          | 1   | ₹20           |
| Others (wires, breadboard) | - | ₹100 |

**💡 Total Estimated Cost:** ₹1200 – ₹1400

## 🛠️ How It Works

1. ⏰ User sets medication time using keypad.
2. 🕒 At the right time, the device:
   - Dispenses tablet (servo).
   - Shows alert on LCD.
   - Activates buzzer.
   - Logs data.
3. 📱 Web interface allows manual logging and viewing records.

## 🚀 Getting Started

1. Upload `med_tracker.ino` to ESP32 via Arduino IDE.
2. Connect hardware as per the code.
3. Open `index.html` in any browser to use the web interface.
4. Done!

## 🎯 Goals for Future

- 🧠 Add cloud sync (Firebase etc.)
- 📲 Push notifications
- 👤 Add user login to web interface
- 📈 Visual charts for logs

## 🙌 Made With Love

By a student who’s exploring **IoT, coding, and hardware hacking** 💚  
Feel free to fork, star ⭐, or suggest improvements!

