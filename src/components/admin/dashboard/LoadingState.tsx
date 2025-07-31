import { Skeleton } from '@/components/ui/skeleton';

export function LoadingState() {
  return (
    <div className="min-h-screen bg-background animate-in fade-in-50">
      <div className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <Skeleton className="h-8 w-[200px]" />
            <div className="flex items-center gap-4">
              <Skeleton className="h-4 w-[150px]" />
              <Skeleton className="h-10 w-[100px]" />
            </div>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-6">
        <div className="space-y-6">
          <Skeleton className="h-10 w-full" />
          <div className="grid gap-6">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-[200px] w-full" />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
} 