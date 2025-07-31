import { useQRScanner } from './useQRScanner';
import { ScannerInterface } from './ScannerInterface';
import { ManualEntry } from './ManualEntry';
import { ScanResult } from './ScanResult';

export function QRScanner() {
  const {
    scanning,
    scanResult,
    manualCode,
    setManualCode,
    videoRef,
    startScanning,
    stopScanning,
    handleManualVerification,
    resetScanner,
  } = useQRScanner();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">QR Code Scanner</h2>
        <p className="text-muted-foreground">Scan QR codes or enter codes manually to check in participants</p>
      </div>

      {scanResult ? (
        <ScanResult result={scanResult} onReset={resetScanner} />
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          <ScannerInterface
            scanning={scanning}
            videoRef={videoRef}
            onStartScanning={startScanning}
            onStopScanning={stopScanning}
          />
          <ManualEntry
            manualCode={manualCode}
            setManualCode={setManualCode}
            onVerify={handleManualVerification}
          />
        </div>
      )}
    </div>
  );
} 