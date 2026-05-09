import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-black text-white px-4">
      <div className="text-center space-y-6">
        <h1 className="text-9xl font-black tracking-tighter opacity-20">404</h1>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight sm:text-4xl">
            Signal Lost
          </h2>
          <p className="text-gray-400 max-w-xs mx-auto">
            The profile or page you're looking for doesn't exist in our verified database.
          </p>
        </div>
        <Link
          href="/"
          className="inline-flex h-12 items-center justify-center rounded-full bg-blue-600 px-8 text-sm font-medium transition-colors hover:bg-blue-700 focus:outline-none"
        >
          Return to Hub
        </Link>
      </div>
    </main>
  );
}
