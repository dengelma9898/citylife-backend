import { Browser, LaunchOptions, Page } from 'puppeteer';

export interface PuppeteerConfig {
  launchOptions: LaunchOptions;
  viewport: {
    width: number;
    height: number;
    deviceScaleFactor: number;
    isMobile: boolean;
    hasTouch: boolean;
  };
  userAgent: string;
  timeout: number;
}

export const defaultPuppeteerConfig: PuppeteerConfig = {
  launchOptions: {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--window-size=375x812',
    ],
  },
  viewport: {
    width: 375,
    height: 812,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  },
  userAgent:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
  timeout: 60000,
};

export class PuppeteerManager {
  private static instance: PuppeteerManager;
  private browser: Browser | null = null;
  private config: PuppeteerConfig;

  private constructor(config: PuppeteerConfig = defaultPuppeteerConfig) {
    this.config = config;
  }

  public static getInstance(config?: PuppeteerConfig): PuppeteerManager {
    if (!PuppeteerManager.instance) {
      PuppeteerManager.instance = new PuppeteerManager(config);
    }
    return PuppeteerManager.instance;
  }

  public async getPage(): Promise<Page> {
    if (!this.browser) {
      const puppeteer = await import('puppeteer');
      this.browser = await puppeteer.default.launch(this.config.launchOptions);
    }

    const page = await this.browser.newPage();
    await page.setViewport(this.config.viewport);
    await page.setUserAgent(this.config.userAgent);
    await page.setJavaScriptEnabled(true);
    return page;
  }

  public async closeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  public getConfig(): PuppeteerConfig {
    return this.config;
  }
} 