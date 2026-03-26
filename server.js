const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();

app.use(express.json());
app.use(cors());

/* ===============================
   CONFIGURATION
=============================== */

// WhatsApp API
const API_URL =
"https://backend.api-wa.co/campaign/neodove/api/v2";

// 🔴 PUT YOUR NEW API KEY HERE
const API_KEY =
"PUT_NEW_API_KEY_HERE";

// Google Sheet Script URL
const GOOGLE_SCRIPT_URL =
"https://script.google.com/macros/s/AKfycbzP0-EFmdkhRBs9DiT7PJUPHk_qfIR88vPyFl_0VQvcFKc2wsurlbSmNDodpha3JpOy/exec";


/* ===============================
   STORAGE
=============================== */

let otpStore = {};
let deviceStore = {};


/* ===============================
   GENERATE OTP
=============================== */

function generateOTP() {

return Math.floor(
100000 + Math.random() * 900000
).toString();

}


/* ===============================
   CHECK NUMBER
=============================== */

app.get("/check-number", async (req, res) => {

const phone = req.query.phone;

try {

const response =
await axios.get(
GOOGLE_SCRIPT_URL + "?phone=" + phone
);

res.json({
allowed: response.data === "allowed"
});

}

catch (error) {

console.error(
"Sheet error:",
error.message
);

res.status(500).json({
error: "Sheet check failed"
});

}

});


/* ===============================
   SEND OTP (FAST + FIXED)
=============================== */

app.post("/send-otp", async (req, res) => {

const { phoneNumber } = req.body;

try {

/* CHECK NUMBER */

const checkResponse =
await axios.get(
GOOGLE_SCRIPT_URL +
"?phone=" + phoneNumber
);

if (checkResponse.data !== "allowed") {

return res.json({
success: false,
message: "Login not available"
});

}


/* GENERATE OTP */

const otpCode =
generateOTP();

console.log(
`Generated OTP ${otpCode} for ${phoneNumber}`
);


/* STORE OTP */

otpStore[phoneNumber] = {

otp: otpCode,

expiry:
Date.now() + 60000

};


/* SEND RESPONSE IMMEDIATELY ⚡ */

res.json({

success: true,
message: "OTP sending"

});


/* ===============================
   SEND WHATSAPP (BACKGROUND)
=============================== */

const payload = {

apiKey: API_KEY,

campaignName: "OTP5",

destination: phoneNumber,

userName: "Student",

templateParams: [
otpCode
],

source: "login-system"

};


/* SEND WITHOUT WAIT ⚡ */

axios.post(
API_URL,
payload,
{
headers: {
"Content-Type":
"application/json"
}
}
)

.then(response => {

console.log(
"✅ OTP sent:",
response.data
);

})

.catch(error => {

console.error(
"❌ OTP error:",
error.response
? error.response.data
: error.message
);

});

}

catch (error) {

console.error(
"Send OTP error:",
error.message
);

res.status(500).json({

success: false,
message: "Failed to send OTP"

});

}

});


/* ===============================
   VERIFY OTP
=============================== */

app.post("/verify-otp", (req, res) => {

const {

phoneNumber,
otp,
deviceId

} = req.body;

const storedData =
otpStore[phoneNumber];

if (!storedData) {

return res.json({

success: false,
message: "OTP not found"

});

}

if (
Date.now() >
storedData.expiry
) {

delete otpStore[phoneNumber];

return res.json({

success: false,
message: "OTP expired"

});

}

if (storedData.otp !== otp) {

return res.json({

success: false,
message: "Invalid OTP"

});

}


/* SAVE DEVICE */

deviceStore[phoneNumber] = {

deviceId: deviceId,

loginTime:
new Date().toLocaleString()

};


/* LOG LOGIN */

console.log("========== LOGIN ==========");

console.log("Phone:", phoneNumber);

console.log("Device ID:", deviceId);

console.log("Time:",
new Date().toLocaleString());

console.log("===========================");


/* SUCCESS */

delete otpStore[phoneNumber];

res.json({

success: true,
message: "Login successful"

});

});


/* ===============================
   CHECK DEVICE
=============================== */

app.get("/check-device", (req,res)=>{

const phone =
req.query.phone;

const device =
req.query.deviceId;

if(deviceStore[phone]?.deviceId !== device){

return res.json({
allowed:false
});

}

res.json({
allowed:true
});

});


/* ===============================
   GET LIVE CLASS
=============================== */

app.get("/get-class", async (req, res) => {

try {

const response =
await axios.get(
GOOGLE_SCRIPT_URL
);

res.json({

link:
response.data.link || ""

});

}

catch(error){

console.error(
"Live class error:",
error.message
);

res.json({
link: ""
});

}

});


/* ===============================
   ROOT CHECK
=============================== */

app.get("/", (req, res) => {

res.send(
"Server running successfully"
);

});


/* ===============================
   START SERVER
=============================== */

const PORT =
process.env.PORT || 3000;

app.listen(PORT, () =>

console.log(
`🚀 Server running on port ${PORT}`
)

);
