import { Injectable } from '@nestjs/common';
import { FirebaseService } from '../firebase/firebase.service';
import * as crypto from 'crypto';

@Injectable()
export class WalletService {
  constructor(private readonly firebaseService: FirebaseService) {}

/*   public async generateWalletSignature(userId: string): Promise<string> {
    const timestamp = Date.now();
    const data = `${userId}-${timestamp}`;
    const privateKey = process.env.WALLET_PRIVATE_KEY;
    const sign = crypto.createSign('SHA256');
    sign.update(data);
    return sign.sign(privateKey, 'base64');
  } */
} 