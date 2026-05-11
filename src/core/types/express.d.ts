/// <reference types="multer" />
import { DecodedIdToken } from 'firebase-admin/auth';
import { Firestore } from 'firebase-admin/firestore';

declare global {
  namespace Express {
    interface Request {
      firestore?: Firestore;
      /** Gesetzt durch Auth-Middleware (Firebase DecodedIdToken) */
      user?: DecodedIdToken;
    }
  }
}
