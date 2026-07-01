'use client';

/**
 * Global Error Boundary
 * Catches errors in root layout — must provide its own <html>/<body>
 * since it replaces the root layout when triggered.
 * Cannot use next-intl (outside locale provider).
 */
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-white">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Something went wrong
          </h1>
          <p className="text-gray-500 mb-8 text-center max-w-md">
            An unexpected error occurred. Please try again.
          </p>
          <button
            onClick={reset}
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  );
}
