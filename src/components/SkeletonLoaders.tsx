export function PageSkeleton() {
  return (
    <div className="animate-pulse space-y-6 p-6">
      {/* Hero skeleton */}
      <div className="space-y-4">
        <div className="h-12 bg-gray-200 rounded-lg w-3/4" />
        <div className="h-6 bg-gray-200 rounded-lg w-full" />
        <div className="h-6 bg-gray-200 rounded-lg w-5/6" />
      </div>

      {/* Content blocks */}
      <div className="space-y-4 mt-12">
        <div className="h-4 bg-gray-200 rounded w-full" />
        <div className="h-4 bg-gray-200 rounded w-full" />
        <div className="h-4 bg-gray-200 rounded w-3/4" />
      </div>

      {/* Cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-12">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="space-y-2">
            <div className="h-48 bg-gray-200 rounded-lg" />
            <div className="h-4 bg-gray-200 rounded w-3/4" />
            <div className="h-4 bg-gray-200 rounded w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ButtonSkeleton() {
  return (
    <div className="h-10 bg-gray-200 rounded-lg animate-pulse w-40" />
  );
}

export function CardSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="h-48 bg-gray-200 rounded-lg" />
      <div className="h-6 bg-gray-200 rounded w-3/4" />
      <div className="h-4 bg-gray-200 rounded w-full" />
      <div className="h-4 bg-gray-200 rounded w-5/6" />
    </div>
  );
}
