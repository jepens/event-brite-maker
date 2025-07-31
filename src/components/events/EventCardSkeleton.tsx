import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useMobile } from '@/hooks/use-mobile';

export function EventCardSkeleton() {
  const { isMobile } = useMobile();
  
  return (
    <Card className={`${isMobile ? 'h-auto' : 'h-[400px]'} mobile-card`}>
      <CardHeader>
        <Skeleton className="w-full h-40" />
        <Skeleton className="h-6 w-3/4 mt-4" />
        <Skeleton className="h-4 w-full mt-2" />
        <Skeleton className="h-4 w-2/3 mt-1" />
      </CardHeader>
      <CardContent className="space-y-4">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-8 w-full mt-4" />
      </CardContent>
    </Card>
  );
} 