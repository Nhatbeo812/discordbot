// src/utils/firebaseClient.js
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore }                  from 'firebase-admin/firestore';
import { logger }                        from './logger.js';

function initFirebase() {
  if (getApps().length > 0) return getFirestore();

  const projectId   = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey  = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    logger.error('[Firebase] Thieu bien moi truong FIREBASE_PROJECT_ID / CLIENT_EMAIL / PRIVATE_KEY');
    process.exit(1);
  }

  // Xu ly tat ca truong hop Render luu private key:
  // TH1: Render luu \n literal  -> replace thanh newline that
  // TH2: Render luu \\n          -> replace thanh newline that
  // TH3: Render giu multiline    -> giu nguyen
  let parsedKey = privateKey;
  if (!privateKey.includes('\n')) {
    parsedKey = privateKey.replace(/\\n/g, '\n');
  }

  // Validate key co dung format PEM khong
  if (!parsedKey.includes('-----BEGIN PRIVATE KEY-----')) {
    logger.error('[Firebase] FIREBASE_PRIVATE_KEY sai format. Can co "-----BEGIN PRIVATE KEY-----"');
    logger.error('[Firebase] Kiem tra lai Render Environment Variables -> FIREBASE_PRIVATE_KEY');
    process.exit(1);
  }

  initializeApp({
    credential: cert({ projectId, clientEmail, privateKey: parsedKey }),
  });

  logger.ok('[Firebase] Ket noi Firestore thanh cong.');
  return getFirestore();
}

export const db = initFirebase();
