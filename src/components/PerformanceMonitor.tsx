import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useCache } from '@/lib/cache-manager';
import { errorHandler } from '@/lib/error-handler';
import { Activity, Database, HardDrive, Zap, AlertTriangle } from 'lucide-react';

interface PerformanceMetrics {
  cacheStats: {
    totalItems: number;
    totalSize: number;
    expiredItems: number;
  };
  errorCount: number;
  memoryUsage: number;
  loadTime: number;
}

export function PerformanceMonitor() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    cacheStats: { totalItems: 0, totalSize: 0, expiredItems: 0 },
    errorCount: 0,
    memoryUsage: 0,
    loadTime: 0
  });
  const [isVisible, setIsVisible] = useState(false);
  const { getStats } = useCache();

  useEffect(() => {
    const updateMetrics = () => {
      // Cache statistics
      const cacheStats = getStats();
      
      // Error count
      const errorLog = errorHandler.getErrorLog();
      
      // Memory usage (if available)
      const memoryUsage = (performance as Performance & { memory?: { usedJSHeapSize: number } }).memory 
        ? Math.round((performance as Performance & { memory?: { usedJSHeapSize: number } }).memory!.usedJSHeapSize / 1024 / 1024)
        : 0;
      
      // Page load time
      const loadTime = performance.timing 
        ? performance.timing.loadEventEnd - performance.timing.navigationStart
        : 0;

      setMetrics({
        cacheStats,
        errorCount: errorLog.length,
        memoryUsage,
        loadTime
      });
    };

    // Update metrics every 30 seconds
    const interval = setInterval(updateMetrics, 30000);
    updateMetrics(); // Initial update

    return () => clearInterval(interval);
  }, [getStats]);

  const getPerformanceStatus = () => {
    if (metrics.errorCount > 10) return 'critical';
    if (metrics.memoryUsage > 100) return 'warning';
    if (metrics.loadTime > 5000) return 'warning';
    return 'good';
  };

  const status = getPerformanceStatus();

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={() => setIsVisible(true)}
          size="sm"
          variant="outline"
          className="bg-white/80 backdrop-blur-sm"
        >
          <Activity className="h-4 w-4 mr-2" />
          Performance
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80">
      <Card className="bg-white/95 backdrop-blur-sm border shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm">Performance Monitor</CardTitle>
              <CardDescription className="text-xs">
                Real-time system metrics
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge 
                variant={status === 'good' ? 'default' : status === 'warning' ? 'secondary' : 'destructive'}
                className="text-xs"
              >
                {status === 'good' ? 'Good' : status === 'warning' ? 'Warning' : 'Critical'}
              </Badge>
              <Button
                onClick={() => setIsVisible(false)}
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0"
              >
                ×
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Cache Performance */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Database className="h-3 w-3 text-blue-500" />
              <span className="text-xs font-medium">Cache</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <div className="text-gray-500">Items</div>
                <div className="font-medium">{metrics.cacheStats.totalItems}</div>
              </div>
              <div>
                <div className="text-gray-500">Size</div>
                <div className="font-medium">{Math.round(metrics.cacheStats.totalSize / 1024)}KB</div>
              </div>
              <div>
                <div className="text-gray-500">Expired</div>
                <div className="font-medium">{metrics.cacheStats.expiredItems}</div>
              </div>
            </div>
          </div>

          {/* Error Count */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-3 w-3 text-red-500" />
              <span className="text-xs font-medium">Errors</span>
            </div>
            <div className="flex items-center gap-2">
              <Progress 
                value={Math.min(metrics.errorCount * 10, 100)} 
                className="h-2 flex-1"
              />
              <span className="text-xs font-medium">{metrics.errorCount}</span>
            </div>
          </div>

          {/* Memory Usage */}
          {metrics.memoryUsage > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <HardDrive className="h-3 w-3 text-green-500" />
                <span className="text-xs font-medium">Memory</span>
              </div>
              <div className="flex items-center gap-2">
                <Progress 
                  value={Math.min(metrics.memoryUsage, 100)} 
                  className="h-2 flex-1"
                />
                <span className="text-xs font-medium">{metrics.memoryUsage}MB</span>
              </div>
            </div>
          )}

          {/* Load Time */}
          {metrics.loadTime > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Zap className="h-3 w-3 text-yellow-500" />
                <span className="text-xs font-medium">Load Time</span>
              </div>
              <div className="flex items-center gap-2">
                <Progress 
                  value={Math.min(metrics.loadTime / 100, 100)} 
                  className="h-2 flex-1"
                />
                <span className="text-xs font-medium">{Math.round(metrics.loadTime)}ms</span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2 border-t">
            <Button
              size="sm"
              variant="outline"
              className="flex-1 text-xs"
              onClick={() => {
                errorHandler.clearErrorLog();
                setMetrics(prev => ({ ...prev, errorCount: 0 }));
              }}
            >
              Clear Errors
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="flex-1 text-xs"
              onClick={() => {
                window.location.reload();
              }}
            >
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 