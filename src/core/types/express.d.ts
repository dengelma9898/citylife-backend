import { Firestore } from 'firebase-admin/firestore';

declare global {
  namespace Express {
    interface Request {
      firestore?: Firestore;
    }
  }
}
