import { Controller, Post, Body, Get } from '@nestjs/common';
import { WalletService } from './wallet.service';

@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get('test')
  public async testEndpoint(): Promise<{ status: string; timestamp: number }> {
    return {
      status: 'Wallet Service is running',
      timestamp: Date.now(),
    };
  }

/*   @Post('signature')
  public async generateSignature(@Body('userId') userId: string): Promise<{ signature: string }> {
    return this.walletService.generateWalletSignature(userId);
  } */
} 