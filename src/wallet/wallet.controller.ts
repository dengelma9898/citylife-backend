import { Controller, Post, Body, Get, Param, Res, Logger } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { Response } from 'express';

@Controller('wallet')
export class WalletController {
  private readonly logger = new Logger(WalletController.name);

  constructor(private readonly walletService: WalletService) {}

  @Get('test')
  public async testEndpoint(): Promise<{ status: string; timestamp: number }> {
    return {
      status: 'Wallet Service is running',
      timestamp: Date.now(),
    };
  }

  @Get('passes/:id')
  async getPass(@Param('id') id: string, @Res() res: Response) {
    this.logger.log(`GET /wallet/passes/${id}`);
    
    const passData = {
      id,
      description: 'Test Pass Description',
      logoText: 'Test App',
      barcode: `PASS-${id}`
    };

    const passBuffer = await this.walletService.generatePass(passData);

    res.set({
      'Content-Type': 'application/vnd.apple.pkpass',
      'Content-Disposition': `attachment; filename=pass-${id}.pkpass`
    });
    
    return res.send(passBuffer);
  }

/*   @Post('signature')
  public async generateSignature(@Body('userId') userId: string): Promise<{ signature: string }> {
    return this.walletService.generateWalletSignature(userId);
  } */
} 