import puppeteer from 'puppeteer';
import { buildCatalogHtml } from '../templates/catalog';
import type { ShopifyProduct, ShopifyCollection } from './shopify';

export async function generateCatalogPdf(
  collection: ShopifyCollection,
  products: ShopifyProduct[]
): Promise<Buffer> {
  const html = buildCatalogHtml(collection, products);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 60000 });

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
      timeout: 60000,
    });

    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
