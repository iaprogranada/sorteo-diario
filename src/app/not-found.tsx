import Link from "next/link";
export default function NotFound() {
  return (
    <main className="mx-auto max-w-md px-4 py-20 text-center">
      <p className="text-6xl">🎟️</p>
      <h1 className="h1 mt-4">Página no encontrada</h1>
      <Link href="/" className="btn-primary mt-6">Ver sorteos</Link>
    </main>
  );
}
