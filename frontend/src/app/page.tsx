import { CatalogApp } from "./components/catalog-app";

export default function Home() {
  return (
    <main className="flex-1 flex flex-col min-h-screen">
      {/* Header */}
      <header className="px-6 py-5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-wide">INFINITO</h1>
            <p className="text-xs text-gold tracking-[0.2em] uppercase mt-0.5">
              Body Piercing
            </p>
          </div>
          <span className="text-xs text-white/40 tracking-wider uppercase">
            Generador de Catálogos
          </span>
        </div>
      </header>

      {/* Main content */}
      <CatalogApp />

      {/* Footer */}
      <footer className="border-t border-white/10 px-6 py-4 mt-auto">
        <div className="max-w-6xl mx-auto text-center text-xs text-white/30">
          Infinito Body Piercing &middot; Generador de Catálogos &middot;{" "}
          {new Date().getFullYear()}
        </div>
      </footer>
    </main>
  );
}
