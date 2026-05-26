**Firebase Admin Node.js SDK có trên npm. Nếu bạn chưa có tệp package.json, hãy tạo một tệp thông qua npm init. Tiếp theo, hãy cài đặt gói firebase-admin npm và lưu gói đó vào package.json của bạn:**
npm i firebase-admin
HOẶC 
npm install --save firebase-admin


**Để sử dụng mô-đun này trong ứng dụng, hãy require mô-đun này từ bất kỳ tệp JavaScript nào:**
const { initializeApp } = require('firebase-admin/app');

**Nếu đang dùng ES2015, bạn có thể import mô-đun:** 
import { initializeApp } from 'firebase-admin/app';

**FIREBASE ADMIN SDK :**
var admin = require("firebase-admin");

var serviceAccount = require("path/to/serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

**FIREBASE PRIVATE KEY :**
{
  "type": "service_account",
  "project_id": "thom-33487",
  "private_key_id": "b9126b48987b5e758c8042c90a68ead94eb21589",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDBgOJ/TbApIDIK\n7mnKoOHHRJs6c/27yK3JEWjOjoLX635EDkMv2hu+sON6F5N+dtkJGqv37MnlQDhy\nfL2acjQUhJUuxVFt3Lwm5AF+Y4k7Lh586e35pEB1SIiexzv7mWrhO+L9aMsjftcE\nEDaQOXSbPbDHaKWITXP5DNk01llBMQ2n3Trnwy+pQxy5a63e/pacp+Egu8uMwBCZ\n0LfFZK4mAEG9fMwcLQYhWpT3AVN72tgQzLxEypQKZ/IrTpnAvyasUPMOJD20y406\n8uaheH+zga0gbDBYTMn4Ob90j9Gy58ENhj1KpKaN4OYAV/rD2BqC2TncRS037XmN\nc4maiqL/AgMBAAECggEAONWTMRLvZ9Tl/eHyvqosRmv3L977qpkRuhnb77dZ5PNt\nHa4Wu8pTFdo8phKgpqdfrdXgpqwszKHlMnNC+UcL1u7uJlOcTClmNgIIEkhH+VLd\nb5EB7a35pLkOL5yTGJ4CD2+Yhxetepp5qt7cN9Y4UpR3BMrOu88L/h1w+pzukD/G\nPWaiWXear2MIQI1T1kwtKC0WJeNrikZTJrNeMz0G63YqM6Up4ei7+Epw046ZhOT3\nKfrkI4HV8Y+wPGgL/DMvgt58iq6SoF6o4FYCHTGlzcQt+Dr49Um5lb+M44cPU995\nLlL4jHwJ12NYL83NNIWw7DJWGT31sMXn93DKFYZn8QKBgQDpu3OL7yK9Q5xUV9y/\nMzrDcCRPQyVqzurJpp/mYFWB00OSxWpBg3SFfxf3gPTTEbiZk7tAaMMnhdLcZfDD\nFaFOOQHgcHnAdJ+2bopCKiwONtO8+w0nJCoDpiMbRJIul+90Pk7IZSh43IgcPuEo\nfYtHvLkdyTfUGYUm+IWFbAQoqQKBgQDT8EjdKJyPuOw5QjDOrXeSzNW6p7eiTF1P\nm4cKCsesapu7aA/O2Ruw4jmOf9Tehx64DxuyONvty8dmOyRoFKiFqTYasx3Kd7t4\nHsKX8tb/FITR4mjZMHuTkFq5zEXJy08oW8agU4DNZkTwEb1LdFE/AYD3GCvwB9E0\nfnGX8nVvZwKBgQDMsN8GI4z21yknLDMkNwc1dRY3XAR+v2sa4hOSu7bmlU/OT5k4\nepkm+CDTHlpKJnDV/my0gYq3KBl77sKk9mJnkME1/wqBIyFjsPbf7vLaF+Xi0LG6\nH4+z1mFUVf73UxPfZ1mzYfPJtMh2hBLHVPsO/hXYIgoEc70KXgcAy5Hw0QKBgGbQ\njXiEiBcM/cP1QVoyOuzDY/ft/x7D7wx8hbEwc5dIDI6IuAp/tnhD9uoTR4BAin1+\nDtCR1tdwYSZOEKZRR0O4R+AB/rTHCvIF8h7mlrgeCyUKshSS+ZAnmmvCFiUD9T29\n8Ai9GaILN+xCntMo9XUcVKUKW95Q3IObx52P6LqHAoGBAMACTvSYZ7D31YK7lAHC\nDf+TTQfuIjxNdiRBLPG5RhgH7Q3fwLEXLURtgLZUPYZhDAn18t/Y4vlBNT1K1IRr\n/IztQutMj7JHGw0NAqr4KNybNuwsqHPHJCpN8Ji/ePrg+W6xkjFZsC+qIYiyVoyd\ndmw6S7LVE9SolV7R+bbF5c6u\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-fbsvc@thom-33487.iam.gserviceaccount.com",
  "client_id": "114622369531309295892",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40thom-33487.iam.gserviceaccount.com",
  "universe_domain": "googleapis.com"
}


**PHÍA DƯỚI NÀY LÀ DÙNG CHO FIREBASE WEB SDK:**
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAtBdUE5pVxiZjZ3VHQHPOL8uaAYKXrCZo",
  authDomain: "thom-33487.firebaseapp.com",
  projectId: "thom-33487",
  storageBucket: "thom-33487.firebasestorage.app",
  messagingSenderId: "211167399038",
  appId: "1:211167399038:web:6df1d980ec94f474e11c2f",
  measurementId: "G-K1FCEFT6JC"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);