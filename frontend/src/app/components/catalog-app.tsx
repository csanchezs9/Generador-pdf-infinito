"use client";

import { useState, useEffect, useRef, useCallback } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const LOGO_URL = "/logo-infinito.png";

interface Collection {
  id: number;
  title: string;
  body_html: string;
  image?: { src: string; alt: string | null };
  products_count?: number;
}

interface NavCategory {
  label: string;
  collections: Collection[];
}

// Colecciones padre vacías que no se deben mostrar
const PARENT_ONLY_TITLES = [
  "ACCESORIOS",
  "ALTA-JOYERÍA",
  "MATERIAL",
  "PIERCING",
  "Página de inicio",
];

// Nombres de perfo individuales
const PERFO_NAMES = [
  "Ceja", "Conch", "Daith", "Flat", "Helix", "Lobulo",
  "Medusa", "Microdermal", "Monroe", "Navel", "Nipple",
  "Nostril", "Septum", "Side Labret", "Tragus",
];

function groupCollections(collections: Collection[]): NavCategory[] {
  const filtered = collections.filter(
    (c) => !PARENT_ONLY_TITLES.includes(c.title)
  );

  const piercing = filtered.filter((c) => c.title.startsWith("PIERCING-"));
  const accesorios = filtered.filter((c) => c.title.startsWith("ACCESORIOS-"));
  const material = filtered.filter((c) => c.title.startsWith("MATERIAL-"));
  const altaJoyeria = filtered.filter((c) => c.title.startsWith("ALTAJOYERIA-"));
  const perfos = filtered.filter((c) => PERFO_NAMES.includes(c.title));

  // HOMBRE duplicado: tomar el que tenga imagen (el que tiene productos)
  const hombre = filtered.filter(
    (c) => c.title === "HOMBRE" && c.image?.src
  );

  const grouped = new Set([
    ...piercing.map((c) => c.id),
    ...accesorios.map((c) => c.id),
    ...material.map((c) => c.id),
    ...altaJoyeria.map((c) => c.id),
    ...perfos.map((c) => c.id),
    ...hombre.map((c) => c.id),
  ]);

  const destacados = filtered.filter(
    (c) =>
      !grouped.has(c.id) &&
      ["Lo Más Vendido", "NUEVOS", "SALE"].includes(c.title)
  );

  return [
    { label: "Piercing", collections: piercing },
    { label: "Accesorios", collections: accesorios },
    { label: "Material", collections: material },
    { label: "Alta Joyería", collections: altaJoyeria },
    { label: "Tipo de Perfo", collections: perfos },
    { label: "Hombre", collections: hombre },
    { label: "Destacados", collections: destacados },
  ].filter((cat) => cat.collections.length > 0);
}

const KNOWN_NAMES: Record<string, string> = {
  ESMERALDAORO: "Esmeralda Oro",
  ESMERALDAPLATA: "Esmeralda Plata",
  ALTAJOYERIA: "Alta Joyería",
};

function formatCollectionName(title: string): string {
  const parts = title.split("-");
  const name = parts.length > 1 ? parts.slice(1).join("-") : parts[0];

  if (KNOWN_NAMES[name]) return KNOWN_NAMES[name];

  // ALL-CAPS word: just Title Case it
  if (name === name.toUpperCase() && name.length > 1) {
    return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  }

  return name
    .replace(/([A-Z])/g, " $1")
    .replace(/^[\s]/, "")
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ")
    .trim();
}

export function CatalogApp() {
  const [categories, setCategories] = useState<NavCategory[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [selected, setSelected] = useState<Collection | null>(null);
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [productCounts, setProductCounts] = useState<Record<number, number>>({});
  const [fallbackImages, setFallbackImages] = useState<Record<number, string>>({});
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/api/catalog/collections`)
      .then((res) => res.json())
      .then((data) => {
        const cols: Collection[] = data.collections || [];
        setCategories(groupCollections(cols));
        setLoading(false);
      })
      .catch(() => {
        setError("No se pudo conectar con el servidor");
        setLoading(false);
      });
  }, []);

  const fetchedIdsRef = useRef<Set<number>>(new Set());

  // Fetch product counts lazily when hovering a category
  const fetchCountsForCategory = useCallback((cat: NavCategory) => {
    cat.collections.forEach((col) => {
      if (fetchedIdsRef.current.has(col.id)) return;
      fetchedIdsRef.current.add(col.id);
      setProductCounts((prev) => ({ ...prev, [col.id]: -1 }));
      fetch(`${API_URL}/api/catalog/collections/${col.id}/count`)
        .then((r) => r.json())
        .then((data) => {
          setProductCounts((prev) => ({ ...prev, [col.id]: data.count }));
          if (data.image) {
            setFallbackImages((prev) => ({ ...prev, [col.id]: data.image }));
          }
        })
        .catch(() => {
          setProductCounts((prev) => ({ ...prev, [col.id]: -2 }));
        });
    });
  }, []);

  function handleMouseEnter(label: string) {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setActiveCategory(label);
    const cat = categories.find((c) => c.label === label);
    if (cat) fetchCountsForCategory(cat);
  }

  function handleMouseLeave() {
    timeoutRef.current = setTimeout(() => setActiveCategory(null), 250);
  }

  function handleSelect(col: Collection) {
    setSelected(col);
    setActiveCategory(null);
  }

  async function handleGenerate() {
    if (!selected) return;
    setGenerating(true);
    setError(null);

    try {
      const res = await fetch(`${API_URL}/api/catalog/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collectionId: selected.id, collectionTitle: selected.title }),
      });

      if (!res.ok) {
        let message = `Error ${res.status}: ${res.statusText}`;
        try {
          const data = await res.json();
          message = data.error || message;
        } catch {}
        throw new Error(message);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `catalogo-${selected.title.toLowerCase().replace(/\s+/g, "-")}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setGenerating(false);
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex items-center gap-3 text-neutral-400">
          <Spinner />
          <span>Cargando colecciones...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-16 w-full">
      {/* Island Navbar with logo */}
      <nav className="relative flex items-center gap-1 bg-white border border-black/[0.08] rounded-2xl px-2 py-2 shadow-xl shadow-black/[0.06]">
        {/* Logo */}
        <div className="px-3 pr-4 flex items-center border-r border-black/[0.08] mr-1">
          <img
            src={LOGO_URL}
            alt="Infinito Piercing"
            className="h-9 w-auto object-contain"
          />
        </div>

        {categories.map((cat) => (
          <NavItem
            key={cat.label}
            category={cat}
            isActive={activeCategory === cat.label}
            selected={selected}
            productCounts={productCounts}
            fallbackImages={fallbackImages}
            onMouseEnter={() => handleMouseEnter(cat.label)}
            onMouseLeave={handleMouseLeave}
            onSelect={handleSelect}
          />
        ))}
      </nav>

      {/* Selected collection + generate */}
      <div className="flex flex-col items-center gap-6">
        {error && (
          <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm max-w-md text-center">
            {error}
          </div>
        )}

        {selected ? (
          <>
            <div className="flex items-center gap-4 bg-white border border-black/[0.08] rounded-2xl px-6 py-4 shadow-lg shadow-black/[0.04]">
              {(selected.image?.src || fallbackImages[selected.id]) && (
                <div className="w-14 h-14 rounded-xl overflow-hidden bg-black/[0.04]">
                  <img
                    src={selected.image?.src || fallbackImages[selected.id]}
                    alt={selected.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div>
                <p className="text-xs text-neutral-400 uppercase tracking-wider mb-1">
                  Colección seleccionada
                </p>
                <h3 className="text-lg font-semibold text-neutral-900">
                  {formatCollectionName(selected.title)}
                </h3>
                {productCounts[selected.id] !== undefined &&
                  productCounts[selected.id] > 0 && (
                    <p className="text-xs text-gold mt-0.5">
                      {productCounts[selected.id]}{" "}
                      {productCounts[selected.id] === 1 ? "producto" : "productos"}
                    </p>
                  )}
              </div>
              <button
                onClick={() => setSelected(null)}
                className="ml-4 text-neutral-300 hover:text-neutral-500 transition-colors cursor-pointer"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <button
              onClick={handleGenerate}
              disabled={generating}
              className={`px-10 py-4 rounded-2xl font-medium text-sm tracking-wide transition-all duration-300 ${
                generating
                  ? "bg-black/[0.04] text-neutral-300 cursor-not-allowed"
                  : "bg-gold text-white hover:bg-gold/90 hover:shadow-lg hover:shadow-gold/25 cursor-pointer active:scale-95"
              }`}
            >
              {generating ? (
                <span className="flex items-center gap-2">
                  <Spinner />
                  Generando PDF...
                </span>
              ) : (
                "Generar Catálogo PDF"
              )}
            </button>
          </>
        ) : (
          <p className="text-neutral-400 text-sm">
            Selecciona una colección del menú para generar su catálogo
          </p>
        )}
      </div>
    </div>
  );
}

// ─── NavItem: cada botón del navbar con su propio dropdown posicionado ───

interface NavItemProps {
  category: NavCategory;
  isActive: boolean;
  selected: Collection | null;
  productCounts: Record<number, number>;
  fallbackImages: Record<number, string>;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onSelect: (col: Collection) => void;
}

function NavItem({
  category,
  isActive,
  selected,
  productCounts,
  fallbackImages,
  onMouseEnter,
  onMouseLeave,
  onSelect,
}: NavItemProps) {
  return (
    <div
      className="relative"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <button
        className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 cursor-pointer whitespace-nowrap ${
          isActive
            ? "bg-black/[0.06] text-neutral-900"
            : "text-neutral-500 hover:text-neutral-900 hover:bg-black/[0.03]"
        }`}
      >
        {category.label}
      </button>

      {/* Dropdown — positioned relative to THIS button */}
      {isActive && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 pt-3 z-50">
          <div className="relative">
            {/* Arrow */}
            <div className="absolute -top-[6px] left-1/2 -translate-x-1/2 w-3 h-3 bg-white border-l border-t border-black/[0.08] rotate-45" />

            <div
              className={`bg-white/95 backdrop-blur-xl border border-black/[0.08] rounded-2xl p-3 shadow-2xl shadow-black/[0.12] animate-dropdown ${
                category.collections.length > 10
                  ? "w-[780px]"
                  : category.collections.length > 6
                    ? "w-[560px]"
                    : "w-[300px]"
              }`}
            >
              <p className="text-[10px] text-neutral-400 uppercase tracking-widest px-3 pt-1 pb-2">
                {category.label}
              </p>
              <div
                className={`grid gap-1 ${
                  category.collections.length > 10
                    ? "grid-cols-3"
                    : category.collections.length > 6
                      ? "grid-cols-2"
                      : "grid-cols-1"
                }`}
              >
                {category.collections.map((col) => {
                  const count = productCounts[col.id];
                  const isLoading = count === -1;
                  const isEmpty = count === 0;
                  const thumbSrc = col.image?.src || fallbackImages[col.id];

                  return (
                    <button
                      key={col.id}
                      onClick={() => !isEmpty && onSelect(col)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-200 group ${
                        isEmpty
                          ? "opacity-35 cursor-not-allowed"
                          : selected?.id === col.id
                            ? "bg-gold/10 ring-1 ring-gold/30"
                            : "hover:bg-black/[0.04] cursor-pointer"
                      }`}
                    >
                      {/* Thumbnail */}
                      <div className="w-9 h-9 rounded-lg overflow-hidden bg-black/[0.04] shrink-0 flex items-center justify-center">
                        {thumbSrc ? (
                          <img
                            src={thumbSrc}
                            alt={col.title}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                          />
                        ) : (
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            className="text-black/20"
                          >
                            <rect x="3" y="3" width="18" height="18" rx="2" />
                            <circle cx="8.5" cy="8.5" r="1.5" />
                            <polyline points="21 15 16 10 5 21" />
                          </svg>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium text-neutral-800 block truncate">
                          {formatCollectionName(col.title)}
                        </span>
                        {isEmpty && (
                          <span className="text-[10px] text-red-500/70 uppercase tracking-wider whitespace-nowrap">
                            Sin productos
                          </span>
                        )}
                        {isLoading && (
                          <span className="text-[10px] text-neutral-300">
                            ...
                          </span>
                        )}
                        {count !== undefined && count > 0 && (
                          <span className="text-[11px] text-neutral-400 whitespace-nowrap">
                            {count} {count === 1 ? "producto" : "productos"}
                          </span>
                        )}
                      </div>

                      {selected?.id === col.id && (
                        <div className="w-2 h-2 rounded-full bg-gold shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
        className="opacity-20"
      />
      <path
        d="M12 2a10 10 0 0 1 10 10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
