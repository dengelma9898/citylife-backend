import { Injectable, Logger } from '@nestjs/common';
import { Barcode, PKPass } from 'passkit-generator';
import * as path from 'path';
import * as fs from 'fs';
import { ConfigService } from '@nestjs/config';

interface PersonalizedPassData {
  customerId: string;
  userName: string;
  memberSince: string;
}

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(private readonly configService: ConfigService) {}

  async generatePersonalizedPass(data: PersonalizedPassData): Promise<Buffer> {
    this.logger.debug('Generating personalized wallet pass');

    try {
      // Load certificates from env
      const wwdrCert = this.configService.get<string>('WALLET_WWDR_CERT');
      const signerCertStr = this.configService.get<string>('WALLET_SIGNER_CERT');
      const signerKeyStr = this.configService.get<string>('WALLET_SIGNER_KEY');
      const passphrase = this.configService.get<string>('WALLET_KEY_PASSPHRASE');

      if (!wwdrCert || !signerCertStr || !signerKeyStr || !passphrase) {
        throw new Error('Missing wallet certificate configuration');
      }

      const wwdr = Buffer.from(wwdrCert, 'base64');
      const signerCert = Buffer.from(signerCertStr, 'base64');
      const signerKey = Buffer.from(signerKeyStr, 'base64');

      // Create pass from template
      const pass = await PKPass.from({
        model: path.join(process.cwd(), 'pass-templates', 'nuernbergspots.pass'),
        certificates: {
          wwdr,
          signerCert,
          signerKey,
          signerKeyPassphrase: passphrase
        }
      }, {
        serialNumber: data.customerId,
        description: 'Nuernbergspots Mitgliedskarte',
        backgroundColor: '#000000',
        foregroundColor: '#FFFFFF',
        labelColor: '#FFFFFF',
        logoText: 'Nuernbergspots',
        formatVersion: 1,
        organizationName: 'Nuernbergspots',
        teamIdentifier: '4T9BXP692G',
        passTypeIdentifier: 'pass.de.dengelma.nuernbergspots'
      });

      // Set pass type to generic
      pass.type = 'generic';

      // Add personalized data
      pass.primaryFields.push({
        key: 'name',
        label: 'Name',
        value: data.userName
      });

      // Format date to German format (MM.YYYY)
      const [year, month] = data.memberSince.split('-');
      const formattedDate = `${month}.${year}`;

      pass.secondaryFields.push({
        key: 'memberSince',
        label: 'Mitglied seit',
        value: formattedDate
      });

      pass.languages.push('de-DE');

      pass.auxiliaryFields.push({
        key: 'description',
        label: 'Deine Benefits',
        value: 'Lasse den Barcode bei teilnehmenden Unternehmen scannen und erhalte diverse Vorteile.'
      });

      pass.setBarcodes(({
        message: data.customerId,
        format: 'PKBarcodeFormatQR',
        messageEncoding: 'iso-8859-1'
      }));

      // Generate signed pass buffer
      const passBuffer = pass.getAsBuffer();
      
      this.logger.debug('Personalized pass generated successfully');
      return passBuffer;

    } catch (error) {
      this.logger.error('Error generating pass:', error.message);
      throw error;
    }
  }
} 