# Generador PDF - Infinito Body Piercing

## Proyecto
Generador de catálogos PDF visuales para la tienda Shopify "Infinito Body Piercing".
El usuario selecciona colecciones de Shopify, el sistema genera un PDF estético y minimalista tipo catálogo con cards de productos, y lo descarga directamente.

## Stack
- **Frontend**: Next.js 14 (App Router, TypeScript, Tailwind CSS)
- **Backend**: Express.js + TypeScript
- **PDF**: Puppeteer (HTML + Tailwind CSS → PDF)
- **Shopify**: Admin REST API (2024-01)
- **Infra**: DigitalOcean Droplet (Ubuntu)
- **Monorepo**: frontend/ + backend/ en la raíz

## Flujo
1. Usuario abre frontend → ve colecciones de Shopify
2. Selecciona colección(es)
3. Click "Generar PDF"
4. Backend consulta Shopify API → obtiene productos + imágenes
5. Renderiza template HTML/Tailwind como catálogo
6. Puppeteer convierte HTML → PDF
7. Se devuelve el PDF como descarga directa (sin almacenamiento permanente)

## Estructura
```
generador-pdf-infinito/
├── backend/                 # Express.js + TypeScript
│   ├── src/
│   │   ├── index.ts         # Entry point
│   │   ├── routes/          # API routes
│   │   ├── services/        # Shopify + PDF services
│   │   └── templates/       # HTML templates para catálogo
│   ├── package.json
│   └── tsconfig.json
├── frontend/                # Next.js 14
│   ├── src/app/             # App Router
│   ├── package.json
│   └── tsconfig.json
├── .env                     # Variables de entorno (NO commitear)
├── .gitignore
└── CLAUDE.md
```

## Configuración Shopify
- Las credenciales van SIEMPRE en `.env`
- Nunca hardcodear tokens en el código
- Usar Shopify Admin REST API

## Convenciones
- TypeScript estricto en ambos proyectos
- Tailwind para todo el styling (templates PDF + frontend)
- Nombres de archivos en kebab-case
- Funciones y variables en camelCase
