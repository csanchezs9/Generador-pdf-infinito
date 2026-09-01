import { chromium } from 'playwright';
import { buildCatalogHtml } from '../templates/catalog';
import type { ShopifyProduct, ShopifyCollection } from './shopify';

export async function generateCatalogPdf(
  collection: ShopifyCollection,
  products: ShopifyProduct[]
): Promise<Buffer> {
  const html = buildCatalogHtml(collection, products);

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle', timeout: 120000 });

    // Esperar fuentes cargadas y todas las imágenes decodificadas (listas para pintar).
    // networkidle no garantiza decode: imágenes a medio decodificar salen en blanco en el PDF.
    await page.evaluate(`(async () => {
      await document.fonts.ready;

      // <img> tags
      const imgWaits = Array.from(document.images).map(async (img) => {
        if (!img.complete) {
          await new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve;
          });
        }
        await img.decode().catch(() => {});
      });

      // background-images (cards de producto)
      const bgUrls = new Set();
      for (const el of document.querySelectorAll('[style*="background-image"]')) {
        const match = getComputedStyle(el).backgroundImage.match(/url\\("(.+?)"\\)/);
        if (match) bgUrls.add(match[1]);
      }
      const bgWaits = Array.from(bgUrls).map(async (url) => {
        const img = new Image();
        img.src = url;
        if (!img.complete) {
          await new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve;
          });
        }
        await img.decode().catch(() => {});
      });

      await Promise.all([...imgWaits, ...bgWaits]);
    })()`);

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    });

    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
