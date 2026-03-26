const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

/* ===============================
   CONFIGURATION
=============================== */
const API_URL = "https://backend.api-wa.co/campaign/neodove/api/v2";
const API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5MTcxNjE0OGQyZDk2MGQzZmVhZjNmMSIsIm5hbWUiOiJCWFEgPD4gTWlnaHR5IEh1bmRyZWQgVGVjaG5vbG9naWVzIFB2dCBMdGQiLCJhcHBOYW1lIjoiQWlTZW5zeSIsImNsaWVudElkIjoiNjkxNzE2MTQ4ZDJkOTYwZDNmZWFmM2VhIiwiYWN0aXZlUGxhbiI6Ik5PTkUiLCJpYXQiOjE3NjMxMjA2NjB9.8jOtIkz5c455LWioAa7WNzvjXlqCN564TzM12yQQ5Cw";
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzP0-EFmdkhRBs9DiT7PJUPHk_qfIR88vPyFl_0VQvcFKc2wsurlbSmNDodpha3JpOy/exec";

let otpStore = {};
let deviceStore = {}; // Memory-based storage for active device IDs

function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

/* ===============================
   SEND OTP (With Sheet Check)
=============================== */
app.post("/send-otp", async (req, res) => {
    const { phoneNumber } = req.body;
    try {
        const checkResponse = await axios.get(GOOGLE_SCRIPT_URL + "?phone=" + phoneNumber);
        
        // This triggers the "Not Registered" message in your frontend
        if (checkResponse.data !== "allowed") {
            return res.json({ success: false, error: true, message: "Not registered" });
        }

        const otpCode = generateOTP();
        otpStore[phoneNumber] = { otp: otpCode, expiry: Date.now() + 60000 };

        const payload = {
            apiKey: API_KEY,
            campaignName: "OTP5",
            destination: phoneNumber,
            userName: "Student",
            templateParams: [otpCode],
            source: "login-system",
            buttons: [{ type: "button", sub_type: "url", index: 0, parameters: [{ type: "text", text: otpCode }] }]
        };

        await axios.post(API_URL, payload);
        res.json({ success: true, message: "OTP sent" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});

/* ===============================
   VERIFY OTP + LOCK DEVICE
=============================== */
app.post("/verify-otp", (req, res) => {
    const { phoneNumber, otp, deviceId } = req.body;
    const storedData = otpStore[phoneNumber];

    if (!storedData || storedData.otp !== otp) {
        return res.json({ success: false, message: "Invalid OTP" });
    }

    // UPDATE MASTER DEVICE ID: This kicks out any previous device
    deviceStore[phoneNumber] = { deviceId: deviceId, time: new Date().toLocaleString() };

    delete otpStore[phoneNumber];
    res.json({ success: true, message: "Login successful" });
});

/* ===============================
   SESSION SECURITY CHECK
=============================== */
app.get("/check-device", (req, res) => {
    const { phone, deviceId } = req.query;
    
    // If the deviceId in browser doesn't match the LATEST one in our store
    if (deviceStore[phone] && deviceStore[phone].deviceId !== deviceId) {
        return res.json({ allowed: false });
    }
    res.json({ allowed: true });
});

app.get("/", (req, res) => res.send("Security Server Active"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
