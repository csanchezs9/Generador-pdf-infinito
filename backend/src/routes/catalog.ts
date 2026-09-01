import { Router } from 'express';
import { getCollections, getCollectionProducts, getCollectionProductCount } from '../services/shopify';
import { generateCatalogPdf } from '../services/pdf';

export const catalogRouter = Router();

// GET /api/catalog/collections - listar todas las colecciones
catalogRouter.get('/collections', async (_req, res) => {
  try {
    const collections = await getCollections();
    res.json({ collections });
  } catch (error) {
    console.error('Error fetching collections:', error);
    res.status(500).json({ error: 'Error al obtener colecciones' });
  }
});

// GET /api/catalog/collections/:id/count - conteo de productos
catalogRouter.get('/collections/:id/count', async (req, res) => {
  try {
    const collectionId = parseInt(req.params.id, 10);
    const { count, image } = await getCollectionProductCount(collectionId);
    res.json({ count, image });
  } catch (error) {
    console.error('Error fetching count:', error);
    res.status(500).json({ error: 'Error al obtener conteo' });
  }
});

// GET /api/catalog/collections/:id/products - productos de una colección
catalogRouter.get('/collections/:id/products', async (req, res) => {
  try {
    const collectionId = parseInt(req.params.id, 10);
    const products = await getCollectionProducts(collectionId);
    res.json({ products });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Error al obtener productos' });
  }
});

// POST /api/catalog/generate - generar PDF de una colección
catalogRouter.post('/generate', async (req, res) => {
  try {
    const { collectionId, collectionTitle } = req.body;
    if (!collectionId) {
      return res.status(400).json({ error: 'collectionId es requerido' });
    }

    const products = await getCollectionProducts(collectionId);
    if (products.length === 0) {
      return res.status(404).json({ error: 'La colección no tiene productos' });
    }

    const collection = { id: collectionId, title: collectionTitle || `Colección ${collectionId}`, body_html: '' };

    const pdfBuffer = await generateCatalogPdf(collection, products);

    const filename = `catalogo-${collection.title.toLowerCase().replace(/\s+/g, '-')}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ error: 'Error al generar el PDF' });
  }
});
