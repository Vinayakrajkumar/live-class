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

// Your API Key
const API_KEY =
"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY5MTcxNjE0OGQyZDk2MGQzZmVhZjNmMSIsIm5hbWUiOiJCWFEgPD4gTWlnaHR5IEh1bmRyZWQgVGVjaG5vbG9naWVzIFB2dCBMdGQiLCJhcHBOYW1lIjoiQWlTZW5zeSIsImNsaWVudElkIjoiNjkxNzE2MTQ4ZDJkOTYwZDNmZWFmM2VhIiwiYWN0aXZlUGxhbiI6Ik5PTkUiLCJpYXQiOjE3NjMxMjA2NjB9.8jOtIkz5c455LWioAa7WNzvjXlqCN564TzM12yQQ5Cw";

// Google Sheet Script URL
const GOOGLE_SCRIPT_URL =
"https://script.google.com/macros/s/AKfycbxTSQgkZQOMZH9dHBP-ehP42Nuu5vjcZRMig0wacg_TOrxHdv6PFecFC2xiw4IXw3id/exec";


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

if (response.data === "allowed") {

res.json({
allowed: true
});

} else {

res.json({
allowed: false
});

}

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
   SEND OTP
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


/* SEND WHATSAPP */

const payload = {

apiKey: API_KEY,

campaignName: "OTP5",

destination: phoneNumber,

userName: "Student",

templateParams: [
otpCode
],

source: "login-system",

media: {},

buttons: [

{
type: "button",
sub_type: "url",
index: 0,

parameters: [

{
type: "text",
text: otpCode
}

]

}

],

carouselCards: [],

location: {},

attributes: {},

paramsFallbackValue: {
FirstName: "user"
}

};


await axios.post(

API_URL,
payload,

{
headers: {
"Content-Type":
"application/json"
}
}

);

res.json({

success: true,
message: "OTP sent successfully"

});

}

catch (error) {

console.error(
"Error sending OTP:",
error.response
? error.response.data
: error.message
);

res.status(500).json({

success: false,
message: "Failed to send OTP"

});

}

});


/* ===============================
   VERIFY OTP + SAVE DEVICE
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
new Date().toLocaleString(),

userAgent:
req.headers["user-agent"],

ip:
req.headers["x-forwarded-for"] ||
req.socket.remoteAddress

};


/* DEVICE TYPE DETECTION */

let agent =
req.headers["user-agent"];

let deviceType =
agent.includes("Android")
? "Android Mobile"
: agent.includes("iPhone")
? "iPhone"
: agent.includes("Windows")
? "Windows PC"
: agent.includes("Mac")
? "Mac"
: "Unknown Device";


/* LOG INFO */

console.log("========== LOGIN ==========");

console.log(
"Phone:",
phoneNumber
);

console.log(
"Device:",
deviceType
);

console.log(
"Browser:",
agent
);

console.log(
"IP:",
req.headers["x-forwarded-for"] ||
req.socket.remoteAddress
);

console.log(
"Time:",
new Date().toLocaleString()
);

console.log("===========================");


/* SUCCESS */

delete otpStore[phoneNumber];

res.json({

success: true,
message: "Login successful"

});

});


/* ===============================
   CHECK DEVICE (ONE DEVICE LOGIN)
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
   GET LIVE CLASS FROM SHEET2
=============================== */

app.get("/get-class", async (req, res) => {

try {

const response =
await axios.get(
GOOGLE_SCRIPT_URL
);

/* RETURNS link FROM Sheet2 */

res.json({

link:
response.data.link

});

}

catch(error){

console.error(
"Live class sheet error:",
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
`Server running on port ${PORT}`
)

);
