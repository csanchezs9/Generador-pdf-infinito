import { readFileSync } from 'fs';
import { join } from 'path';
import type { ShopifyProduct, ShopifyCollection } from '../services/shopify';

// Logo con fondo transparente embebido como data URI (el webp de Shopify tiene fondo blanco)
const LOGO_URL = `data:image/png;base64,${readFileSync(
  join(__dirname, '../../assets/logo-infinito.png')
).toString('base64')}`;

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatPrice(price: string | null | undefined): string {
  if (!price) return '';
  const num = parseFloat(price);
  if (!num || isNaN(num) || num === 0) return '';
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
}

function formatCollectionTitle(title: string): string {
  const parts = title.split('-');
  if (parts.length > 1) {
    return parts.slice(1).join(' ');
  }
  return title;
}

function getBestPrice(product: ShopifyProduct): { price: string; compareAt: string } {
  const variants = product.variants || [];
  let bestPrice = '';
  let bestCompare = '';

  for (const v of variants) {
    const p = parseFloat(v.price || '0');
    if (p > 0) {
      if (!bestPrice || p < parseFloat(bestPrice)) {
        bestPrice = v.price;
        bestCompare = v.compare_at_price || '';
      }
    }
  }

  if (!bestPrice && variants.length > 0) {
    bestPrice = variants[0].price || '';
    bestCompare = variants[0].compare_at_price || '';
  }

  return { price: bestPrice, compareAt: bestCompare };
}

function buildOptionsHtml(product: ShopifyProduct): string {
  const options = product.options || [];
  if (options.length === 0) return '';

  const lines = options
    .filter(o => o.values.length > 0 && o.name !== 'Title')
    .map(o => `<span class="product-option"><span class="product-option-label">${escapeHtml(o.name)}:</span> ${o.values.map(v => escapeHtml(v)).join(', ')}</span>`);

  if (lines.length === 0) return '';
  return `<div class="product-options">${lines.join('')}</div>`;
}

// Shopify CDN: ?width= redimensiona server-side (evita PDFs gigantes) y
// format=pjpg convierte a JPEG aplanando transparencias a blanco — muchas fotos
// de producto son PNG con el fondo removido a medias y dejan manchas blancas
function resizeShopifyImage(src: string, width: number): string {
  if (!src) return src;
  const sep = src.includes('?') ? '&' : '?';
  return `${src}${sep}width=${width}&format=pjpg`;
}

function productCard(product: ShopifyProduct): string {
  const image = resizeShopifyImage(product.images?.[0]?.src || '', 900);
  const { price, compareAt } = getBestPrice(product);
  const formattedPrice = formatPrice(price);
  const formattedCompare = formatPrice(compareAt);

  return `
    <div class="product-card">
      <div class="product-image-container">
        ${image
          ? `<div class="product-image" style="background-image: url('${image}')" role="img" aria-label="${escapeHtml(product.title)}"></div>`
          : `<div class="product-image-placeholder">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#ddd" stroke-width="1">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
            </div>`
        }
      </div>
      <div class="product-info">
        <h3 class="product-title">${escapeHtml(product.title)}</h3>
        ${buildOptionsHtml(product)}
        <div class="product-price-row">
          ${formattedPrice
            ? `<span class="product-price">${formattedPrice}</span>`
            : `<span class="product-price product-price--consult">Consultar precio</span>`
          }
          ${formattedCompare ? `<span class="product-compare-price">${formattedCompare}</span>` : ''}
        </div>
      </div>
    </div>
  `;
}

function formatDate(): string {
  const months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const now = new Date();
  return `${months[now.getMonth()]} ${now.getFullYear()}`;
}

export function buildCatalogHtml(
  collection: ShopifyCollection,
  products: ShopifyProduct[]
): string {
  const collectionName = formatCollectionTitle(collection.title);

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Catálogo - ${collectionName}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Assistant:wght@300;400;500;600;700;800&display=swap');

    @page {
      size: A4;
      margin: 0;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Assistant', 'Helvetica Neue', sans-serif;
      background: #ffffff;
      color: #121212;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    /* ─── COVER PAGE (white, minimal, soft shapes) ─── */
    .cover {
      width: 100%;
      height: 296.5mm;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      background: #ffffff;
      color: #121212;
      text-align: center;
      position: relative;
      page-break-after: always;
      overflow: hidden;
    }

    /* Soft decorative circles */
    .cover-bg-circle {
      position: absolute;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(0,0,0,0.03) 0%, rgba(0,0,0,0.01) 60%, transparent 100%);
    }
    .cover-bg-circle--1 {
      width: 500px;
      height: 500px;
      top: -120px;
      right: -100px;
    }
    .cover-bg-circle--2 {
      width: 350px;
      height: 350px;
      bottom: -80px;
      left: -60px;
    }
    .cover-bg-circle--3 {
      width: 200px;
      height: 200px;
      top: 50%;
      left: 10%;
      transform: translateY(-50%);
    }
    .cover-bg-circle--4 {
      width: 280px;
      height: 280px;
      bottom: 15%;
      right: 8%;
    }
    .cover-bg-circle--5 {
      width: 140px;
      height: 140px;
      top: 20%;
      left: 30%;
    }

    .cover-content {
      position: relative;
      z-index: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .cover-logo {
      width: 320px;
      height: auto;
      margin-bottom: 60px;
    }

    .cover-line {
      width: 40px;
      height: 1px;
      background: #ccc;
      margin-bottom: 40px;
    }

    .cover-collection {
      font-size: 18px;
      font-weight: 700;
      letter-spacing: 6px;
      text-transform: uppercase;
      color: #121212;
      margin-bottom: 32px;
    }

    .cover-meta {
      display: flex;
      align-items: center;
      gap: 16px;
      font-size: 10px;
      font-weight: 400;
      letter-spacing: 2px;
      text-transform: uppercase;
      color: #bbb;
    }

    .cover-meta-sep {
      color: #ddd;
    }

    /* ─── PRODUCT PAGES ─── */
    .page {
      width: 100%;
      height: 296.5mm;
      padding: 40px 44px;
      display: flex;
      flex-direction: column;
      page-break-after: always;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 14px;
      border-bottom: 1px solid #e8e8e8;
      flex-shrink: 0;
    }

    .page-header-brand {
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 4px;
      text-transform: uppercase;
      color: #121212;
    }

    .page-header-collection {
      font-size: 10px;
      font-weight: 400;
      letter-spacing: 2px;
      text-transform: uppercase;
      color: #999;
    }

    /* ─── 2x2 GRID ─── */
    .products-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      grid-template-rows: repeat(2, minmax(0, 1fr));
      gap: 24px;
      flex: 1;
      min-height: 0;
      padding-top: 24px;
    }

    /* ─── PRODUCT CARD ─── */
    .product-card {
      background: #fafafa;
      border-radius: 14px;
      overflow: hidden;
      border: 1px solid #eeeeee;
      display: flex;
      flex-direction: column;
      break-inside: avoid;
      min-height: 0;
    }

    .product-image-container {
      width: 100%;
      flex: 1;
      min-height: 0;
      overflow: hidden;
      background: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    /* background-image en vez de <img> con object-fit: Chromium ignora
       object-fit al imprimir a PDF y estira la imagen (deformación) */
    .product-image {
      width: 100%;
      height: 100%;
      background-size: cover;
      background-position: center;
      background-repeat: no-repeat;
    }

    .product-image-placeholder {
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .product-info {
      padding: 18px 20px;
      flex-shrink: 0;
    }

    .product-title {
      font-size: 15px;
      font-weight: 600;
      color: #121212;
      margin-bottom: 6px;
      line-height: 1.4;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .product-options {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-bottom: 12px;
    }

    .product-option {
      font-size: 10px;
      font-weight: 400;
      color: #666;
      background: #f0f0f0;
      padding: 3px 8px;
      border-radius: 4px;
      line-height: 1.4;
    }

    .product-option-label {
      font-weight: 600;
      color: #444;
    }

    .product-price-row {
      display: flex;
      align-items: baseline;
      gap: 10px;
    }

    .product-price {
      font-size: 18px;
      font-weight: 700;
      color: #121212;
    }

    .product-price--consult {
      font-size: 13px;
      font-weight: 400;
      color: #999;
      font-style: italic;
    }

    .product-compare-price {
      font-size: 13px;
      font-weight: 400;
      color: #bbb;
      text-decoration: line-through;
    }

    @media print {
      .page { page-break-after: always; }
      .cover { page-break-after: always; }
    }
  </style>
</head>
<body>

  <!-- COVER -->
  <div class="cover">
    <!-- Decorative soft circles -->
    <div class="cover-bg-circle cover-bg-circle--1"></div>
    <div class="cover-bg-circle cover-bg-circle--2"></div>
    <div class="cover-bg-circle cover-bg-circle--3"></div>
    <div class="cover-bg-circle cover-bg-circle--4"></div>
    <div class="cover-bg-circle cover-bg-circle--5"></div>

    <div class="cover-content">
      <img src="${LOGO_URL}" alt="Infinito Piercing" class="cover-logo" />
      <div class="cover-line"></div>
      <div class="cover-collection">${escapeHtml(collectionName)}</div>
      <div class="cover-meta">
        <span>${formatDate()}</span>
        <span class="cover-meta-sep">&middot;</span>
        <span>${products.length} productos</span>
        <span class="cover-meta-sep">&middot;</span>
        <span>Medellín</span>
      </div>
    </div>
  </div>

  <!-- PRODUCT PAGES -->
  ${buildProductPages(collection, products)}


</body>
</html>`;
}

function buildProductPages(collection: ShopifyCollection, products: ShopifyProduct[]): string {
  const productsPerPage = 4;
  const pages: string[] = [];

  for (let i = 0; i < products.length; i += productsPerPage) {
    const pageProducts = products.slice(i, i + productsPerPage);
    const pageNum = Math.floor(i / productsPerPage) + 1;
    const totalPages = Math.ceil(products.length / productsPerPage);

    pages.push(`
      <div class="page">
        <div class="page-header">
          <span class="page-header-brand">Infinito Piercing</span>
          <span class="page-header-collection">${formatCollectionTitle(collection.title)} &mdash; ${pageNum}/${totalPages}</span>
        </div>
        <div class="products-grid">
          ${pageProducts.map(p => productCard(p)).join('')}
        </div>
      </div>
    `);
  }

  return pages.join('');
}
