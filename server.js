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
"YOUR_API_KEY";

// Google Sheet API
const GOOGLE_SCRIPT_URL =
"https://script.google.com/macros/s/AKfycbxTSQgkZQOMZH9dHBP-ehP42Nuu5vjcZRMig0wacg_TOrxHdv6PFecFC2xiw4IXw3id/exec";


/* ===============================
   OTP STORAGE
=============================== */

let otpStore = {};


/* ===============================
   DEVICE STORAGE (NEW)
=============================== */

let deviceStore = {};


/* ===============================
   LIVE CLASS STORAGE
=============================== */

let liveClassLink = "";


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

/* Generate OTP */

const otpCode =
generateOTP();

console.log(
`Generated OTP ${otpCode} for ${phoneNumber}`
);

/* Store OTP */

otpStore[phoneNumber] = {

otp: otpCode,

expiry:
Date.now() + 60000

};


/* WhatsApp Payload */

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


/* Send WhatsApp */

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
   VERIFY OTP (UPDATED)
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

deviceStore[phoneNumber] = deviceId;


/* SUCCESS */

delete otpStore[phoneNumber];

res.json({

success: true,
message: "Login successful"

});

});


/* ===============================
   CHECK DEVICE (NEW)
=============================== */

app.get("/check-device", (req,res)=>{

const phone =
req.query.phone;

const device =
req.query.deviceId;

if(deviceStore[phone] !== device){

return res.json({

allowed:false

});

}

res.json({

allowed:true

});

});


/* ===============================
   SET LIVE CLASS
=============================== */

app.post("/set-class", (req, res) => {

const { link } = req.body;

if (!link) {

return res.json({
success: false,
message: "No link provided"
});

}

liveClassLink = link;

console.log(
"Live class started:",
link
);

res.json({

success: true,
message: "Class started"

});

});


/* ===============================
   GET LIVE CLASS
=============================== */

app.get("/get-class", (req, res) => {

res.json({

link: liveClassLink

});

});


/* ===============================
   STOP LIVE CLASS
=============================== */

app.post("/stop-class", (req, res) => {

liveClassLink = "";

console.log(
"Live class stopped"
);

res.json({

success: true,
message: "Class stopped"

});

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
