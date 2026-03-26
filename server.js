const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

const API_URL = "https://backend.api-wa.co/campaign/neodove/api/v2";
const API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5MTcxNjE0OGQyZDk2MGQzZmVhZjNmMSIsIm5hbWUiOiJCWFEgPD4gTWlnaHR5IEh1bmRyZWQgVGVjaG5vbG9naWVzIFB2dCBMdGQiLCJhcHBOYW1lIjoiQWlTZW5zeSIsImNsaWVudElkIjoiNjkxNzE2MTQ4ZDJkOTYwZDNmZWFmM2VhIiwiYWN0aXZlUGxhbiI6Ik5PTkUiLCJpYXQiOjE3NjMxMjA2NjB9.8jOtIkz5c455LWioAa7WNzvjXlqCN564TzM12yQQ5Cw";
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzP0-EFmdkhRBs9DiT7PJUPHk_qfIR88vPyFl_0VQvcFKc2wsurlbSmNDodpha3JpOy/exec";

let otpStore = {};
let activeSessions = {}; // Stores the LATEST deviceId for each phone number

app.post("/send-otp", async (req, res) => {
    const { phoneNumber } = req.body;
    try {
        const checkRes = await axios.get(GOOGLE_SCRIPT_URL + "?phone=" + phoneNumber);
        if (checkRes.data !== "allowed") return res.json({ success: false, error: true });

        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        otpStore[phoneNumber] = { otp: otpCode, expiry: Date.now() + 60000 };

        await axios.post(API_URL, {
            apiKey: API_KEY, campaignName: "OTP5", destination: phoneNumber,
            userName: "Student", templateParams: [otpCode], source: "login-system"
        });
        res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false }); }
});

app.post("/verify-otp", (req, res) => {
    const { phoneNumber, otp, deviceId } = req.body;
    if (otpStore[phoneNumber] && otpStore[phoneNumber].otp === otp) {
        // This line is the "Kill Switch": It replaces any old ID with the NEW one
        activeSessions[phoneNumber] = deviceId; 
        delete otpStore[phoneNumber];
        res.json({ success: true });
    } else {
        res.json({ success: false, message: "Invalid OTP" });
    }
});

// Security Check Endpoint
app.get("/check-session", (req, res) => {
    const { phone, deviceId } = req.query;
    if (activeSessions[phone] && activeSessions[phone] !== deviceId) {
        return res.json({ active: false }); // KICK OUT
    }
    res.json({ active: true });
});

app.listen(process.env.PORT || 3000);
