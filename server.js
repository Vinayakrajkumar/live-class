const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();

app.use(express.json());
app.use(cors());

/* ===============================
   CONFIG
=============================== */

const API_URL =
"https://backend.api-wa.co/campaign/neodove/api/v2";

const API_KEY =
"YOUR_API_KEY_HERE";

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

function generateOTP(){

return Math.floor(
100000 + Math.random()*900000
).toString();

}

/* ===============================
   SEND OTP (FAST VERSION)
=============================== */

app.post("/send-otp", async (req,res)=>{

const { phoneNumber } = req.body;

try{

/* CHECK NUMBER */

const checkResponse =
await axios.get(
GOOGLE_SCRIPT_URL +
"?phone=" + phoneNumber
);

if(checkResponse.data !== "allowed"){

return res.json({
success:false,
message:"Login not available"
});

}

/* GENERATE OTP */

const otpCode =
generateOTP();

console.log(
`Generated OTP ${otpCode} for ${phoneNumber}`
);

/* STORE OTP */

otpStore[phoneNumber]={

otp: otpCode,
expiry: Date.now()+60000

};

/* SEND RESPONSE FIRST ⚡ */

res.json({

success:true,
message:"OTP sending"

});


/* SEND WHATSAPP IN BACKGROUND */

const payload={

apiKey:API_KEY,

campaignName:"OTP5",

destination:phoneNumber,

userName:"Student",

templateParams:[
otpCode
],

source:"login-system"

};

/* NO AWAIT HERE ⚡ */

axios.post(

API_URL,
payload,
{
headers:{
"Content-Type":"application/json"
}
}

).then(()=>{

console.log("OTP sent successfully");

}).catch(err=>{

console.error(
"OTP send error:",
err.message
);

});

}

catch(error){

console.error(
"Error sending OTP:",
error.message
);

res.status(500).json({

success:false,
message:"Failed to send OTP"

});

}

});

/* ===============================
   VERIFY OTP
=============================== */

app.post("/verify-otp",(req,res)=>{

const {
phoneNumber,
otp,
deviceId
}=req.body;

const storedData=
otpStore[phoneNumber];

if(!storedData){

return res.json({
success:false,
message:"OTP not found"
});

}

if(Date.now()>storedData.expiry){

delete otpStore[phoneNumber];

return res.json({
success:false,
message:"OTP expired"
});

}

if(storedData.otp!==otp){

return res.json({
success:false,
message:"Invalid OTP"
});

}

/* SAVE DEVICE */

deviceStore[phoneNumber]={

deviceId:deviceId,

loginTime:
new Date().toLocaleString()

};

/* SUCCESS */

delete otpStore[phoneNumber];

res.json({

success:true,
message:"Login successful"

});

});

/* ===============================
   ROOT
=============================== */

app.get("/",(req,res)=>{

res.send(
"Server running successfully"
);

});

/* ===============================
   START SERVER
=============================== */

const PORT=
process.env.PORT||3000;

app.listen(PORT,()=>{

console.log(
`Server running on port ${PORT}`
);

});
