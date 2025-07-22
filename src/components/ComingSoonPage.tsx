"use client";

interface ComingSoonPageProps {
  title: string;
  description: string;
  icon: string;
}

export default function ComingSoonPage({
  title = "Feature",
  description = "This feature is currently in development",
  icon = "🚧",
}: ComingSoonPageProps) {
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-8">
      <div className="max-w-md mx-auto text-center">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
          <div className="text-6xl mb-6">{icon}</div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            {title}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6 leading-relaxed">
            {description}
          </p>
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <p className="text-blue-800 dark:text-blue-200 text-sm">
              This feature is currently under development and will be available
              in a future update.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
