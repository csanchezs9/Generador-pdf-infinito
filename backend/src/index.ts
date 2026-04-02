import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import { catalogRouter } from './routes/catalog';

// Cargar .env desde la raíz del monorepo
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/catalog', catalogRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`Backend corriendo en http://localhost:${PORT}`);
});
