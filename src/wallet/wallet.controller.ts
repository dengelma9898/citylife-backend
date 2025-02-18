import { Controller, Post, Body, Get, Param, Res, Logger, NotFoundException } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { UsersService } from '../users/users.service';

@Controller('wallet')
export class WalletController {
  private readonly logger = new Logger(WalletController.name);

  constructor(
    private readonly walletService: WalletService,
    private readonly usersService: UsersService,
  ) {}

  @Get('test')
  public async testEndpoint(): Promise<{ status: string; timestamp: number }> {
    return {
      status: 'Wallet Service is running',
      timestamp: Date.now(),
    };
  }

  @Get('coupon')
  async getCouponPass(@Res() res: Response) {
    this.logger.log('GET /wallet/coupon');
    
    const passPath = path.join(process.cwd(), 'nuernbergspots.pass', 'Coupon.pkpass');
    
    if (!fs.existsSync(passPath)) {
      this.logger.error(`Pass file not found at ${passPath}`);
      return res.status(404).send('Pass file not found');
    }

    const passFile = fs.readFileSync(passPath);

    res.set({
      'Content-Type': 'application/vnd.apple.pkpass',
      'Content-Disposition': 'attachment; filename=Coupon.pkpass'
    });
    
    return res.send(passFile);
  }

  @Post('personalized/:userId')
  async getPersonalizedPass(
    @Param('userId') userId: string,
    @Res() res: Response
  ) {
    this.logger.log(`POST /wallet/personalized/${userId}`);
    
    const user = await this.usersService.getUserProfile(userId);
    if (!user || !user.name) {
      throw new NotFoundException('User not found');
    }

    if (!user.customerId) {
      const customerId = `NSP-${userId}`;
      await this.usersService.update(userId, { customerId });
      user.customerId = customerId;
    }

    // Generate member since date if not exists
    if (!user.memberSince) {
      const date = new Date();
      const memberSince = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      await this.usersService.update(userId, { memberSince });
      user.memberSince = memberSince;
    }

    const passData = {
      customerId: user.customerId,
      userName: user.name,
      memberSince: user.memberSince
    };

    const passBuffer = await this.walletService.generatePersonalizedPass(passData);

    res.set({
      'Content-Type': 'application/vnd.apple.pkpass',
      'Content-Disposition': `attachment; filename=member-${user.customerId}.pkpass`
    });
    
    return res.send(passBuffer);
  }

} 