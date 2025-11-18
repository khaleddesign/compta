export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">
          Automatisation Comptable
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Upload facture PDF → OCR Azure → Analyse IA Claude → Export Sage
        </p>
        <div className="flex gap-4 justify-center">
          <a
            href="/upload"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Commencer
          </a>
        </div>
      </div>
    </main>
  );
}
