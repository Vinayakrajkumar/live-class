const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

/* CONFIGURATION */
const API_URL = "https://backend.api-wa.co/campaign/neodove/api/v2";
const API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5MTcxNjE0OGQyZDk2MGQzZmVhZjNmMSIsIm5hbWUiOiJCWFEgPD4gTWlnaHR5IEh1bmRyZWQgVGVjaG5vbG9naWVzIFB2dCBMdGQiLCJhcHBOYW1lIjoiQWlTZW5zeSIsImNsaWVudElkIjoiNjkxNzE2MTQ4ZDJkOTYwZDNmZWFmM2VhIiwiYWN0aXZlUGxhbiI6Ik5PTkUiLCJpYXQiOjE3NjMxMjA2NjB9.8jOtIkz5c455LWioAa7WNzvjXlqCN564TzM12yQQ5Cw";
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzP0-EFmdkhRBs9DiT7PJUPHk_qfIR88vPyFl_0VQvcFKc2wsurlbSmNDodpha3JpOy/exec";

let otpStore = {};
let activeSessions = {}; // Stores the latest session ID per phone

/* SEND OTP */
app.post("/send-otp", async (req, res) => {
    const { phoneNumber } = req.body;
    try {
        const checkRes = await axios.get(GOOGLE_SCRIPT_URL + "?phone=" + phoneNumber);
        if (checkRes.data !== "allowed") {
            return res.json({ success: false, error: true });
        }

        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        otpStore[phoneNumber] = { otp: otpCode, expiry: Date.now() + 60000 };

        const payload = {
            apiKey: API_KEY,
            campaignName: "OTP5",
            destination: phoneNumber,
            userName: "Student",
            templateParams: [otpCode],
            source: "login-system",
            media: {},
            buttons: [{
                type: "button", sub_type: "url", index: 0,
                parameters: [{ type: "text", text: otpCode }]
            }],
            carouselCards: [], location: {}, attributes: {},
            paramsFallbackValue: { FirstName: "user" }
        };

        await axios.post(API_URL, payload, { headers: { "Content-Type": "application/json" } });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false });
    }
});

/* VERIFY OTP */
app.post("/verify-otp", (req, res) => {
    const { phoneNumber, otp, deviceId } = req.body;
    const stored = otpStore[phoneNumber];

    if (stored && stored.otp === otp) {
        activeSessions[phoneNumber] = deviceId; // Update latest session
        delete otpStore[phoneNumber];
        res.json({ success: true });
    } else {
        res.json({ success: false, message: "Invalid OTP" });
    }
});

/* SESSION CHECK */
app.get("/check-session", (req, res) => {
    const { phone, deviceId } = req.query;
    if (activeSessions[phone] && activeSessions[phone] !== deviceId) {
        return res.json({ active: false });
    }
    res.json({ active: true });
});

app.listen(process.env.PORT || 3000);
