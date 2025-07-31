# USB QR Scanner Integration Guide

## Overview

The Event Registration System now supports USB QR code scanners through the Web Serial API. This feature allows you to connect physical QR scanners directly to your computer for faster and more reliable scanning.

## Features

- ✅ **USB Scanner Support**: Connect physical QR scanners via USB
- ✅ **Automatic Detection**: Auto-detect common USB-to-Serial adapters
- ✅ **Real-time Scanning**: Instant QR code processing
- ✅ **Scan History**: View recent scanned codes
- ✅ **Connection Testing**: Test USB scanner connectivity
- ✅ **Error Handling**: Comprehensive error messages and troubleshooting
- ✅ **Offline Support**: Works with offline check-in system

## Supported Devices

### USB-to-Serial Adapters
The system supports most USB QR scanners that use these common chipsets:

- **FTDI** (Vendor ID: 0x0403, Product ID: 0x6001)
- **Prolific** (Vendor ID: 0x067b, Product ID: 0x2303)
- **CP210x** (Vendor ID: 0x10c4, Product ID: 0xea60)
- **CH340** (Vendor ID: 0x1a86, Product ID: 0x7523)
- **PL2303** (Vendor ID: 0x196a, Product ID: 0x0220)

### QR Scanner Brands
Most QR scanners from these brands should work:
- Honeywell
- Symbol/Motorola
- Datalogic
- Zebra
- Unitech
- Generic USB QR scanners

## Browser Requirements

### Supported Browsers
- **Chrome** 89+ (Recommended)
- **Edge** 89+
- **Opera** 76+

### Not Supported
- Firefox
- Safari
- Internet Explorer

## Setup Instructions

### 1. Hardware Setup
1. Connect your USB QR scanner to your computer
2. Ensure the scanner is powered on
3. Check that the scanner appears in Device Manager (Windows) or System Information (Mac)

### 2. Software Setup
1. Open the Event Registration System in a supported browser
2. Navigate to Admin Dashboard → QR Scanner
3. Click on the "USB Scanner" tab
4. Click "Connect USB Scanner"
5. Select your USB scanner from the device list
6. Allow browser permissions when prompted

### 3. Configuration
The system automatically configures common settings:
- **Baud Rate**: 9600
- **Data Bits**: 8
- **Stop Bits**: 1
- **Parity**: None
- **Flow Control**: None

## Usage

### Basic Scanning
1. Ensure USB scanner is connected and ready
2. Point the scanner at a QR code
3. Press the scan button on your USB scanner
4. The scanned code will appear in the "Recent Scans" section
5. The system will automatically process the ticket

### Connection Testing
1. Click "Test Connection" to send a test signal
2. Check if your USB scanner responds
3. Verify the connection status indicator

### Disconnecting
1. Click "Disconnect" to safely close the connection
2. The scanner will be properly released

## Troubleshooting

### Common Issues

#### 1. "No USB scanner found"
**Solution:**
- Check if the scanner is properly connected
- Try a different USB port
- Restart the scanner
- Check Device Manager for driver issues

#### 2. "Permission denied"
**Solution:**
- Allow browser permissions when prompted
- Check if another application is using the scanner
- Close other applications that might be using the serial port

#### 3. "Web Serial API not supported"
**Solution:**
- Use Chrome or Edge browser
- Update your browser to the latest version
- Check if you're using HTTPS (required for Web Serial API)

#### 4. Scanner not responding
**Solution:**
- Check scanner power and connection
- Try the "Test Connection" feature
- Verify scanner settings (baud rate, etc.)
- Check if scanner needs driver installation

#### 5. Scanned codes not appearing
**Solution:**
- Check if the scanner is in the correct mode
- Verify scanner settings match system configuration
- Try scanning a test QR code
- Check browser console for errors

### Advanced Troubleshooting

#### Driver Issues
If your scanner isn't recognized:

1. **Windows:**
   ```cmd
   # Check Device Manager for unknown devices
   # Install appropriate USB-to-Serial drivers
   # Common drivers: FTDI, Prolific, CH340
   ```

2. **Mac:**
   ```bash
   # Check System Information > USB
   # Install CH340 or FTDI drivers if needed
   ```

3. **Linux:**
   ```bash
   # Most USB-to-Serial adapters work out of the box
   # Check /dev/ttyUSB* devices
   ls /dev/ttyUSB*
   ```

#### Scanner Configuration
If your scanner has configurable settings:

1. **Baud Rate**: Set to 9600
2. **Data Format**: 8N1 (8 data bits, no parity, 1 stop bit)
3. **Terminator**: CR/LF or CR
4. **Scan Mode**: Manual or continuous
5. **Prefix/Suffix**: None (or configure as needed)

## Technical Details

### Web Serial API
The system uses the Web Serial API to communicate with USB scanners:

```javascript
// Request port access
const port = await navigator.serial.requestPort({
  filters: [
    { usbVendorId: 0x0403, usbProductId: 0x6001 }, // FTDI
    // ... other supported devices
  ]
});

// Open port with standard settings
await port.open({
  baudRate: 9600,
  dataBits: 8,
  stopBits: 1,
  parity: 'none'
});
```

### Data Processing
Scanned data is processed to handle various terminators:
- `\r` (Carriage Return)
- `\n` (Line Feed)
- `\r\n` (CR+LF)
- `\0` (Null terminator)

### Error Handling
The system includes comprehensive error handling:
- Connection errors
- Permission errors
- Device not found errors
- Data processing errors

## Security Considerations

### Browser Permissions
- Web Serial API requires explicit user permission
- Permissions are granted per domain
- Permissions persist until manually revoked

### Data Security
- Scanned data is processed locally
- No scanned data is stored permanently
- Connection is encrypted when using HTTPS

## Performance Tips

### Optimal Setup
1. Use a dedicated USB port for the scanner
2. Keep the scanner close to the computer
3. Use high-quality USB cables
4. Avoid USB hubs when possible

### Scanning Speed
- Most USB scanners can scan 1-2 codes per second
- System processes codes instantly
- No delay between scan and verification

## Support

### Getting Help
If you encounter issues:

1. Check this troubleshooting guide
2. Verify browser compatibility
3. Test with a different USB scanner
4. Check system logs for errors
5. Contact support with detailed error information

### Logging
Enable browser developer tools to see detailed logs:
```javascript
// Check console for connection logs
console.log('USB Scanner connected');
console.log('Scanned code:', code);
```

## Future Enhancements

### Planned Features
- Support for Bluetooth scanners
- Custom scanner configuration
- Batch scanning mode
- Scanner firmware updates
- Advanced error recovery

### Compatibility
- Additional USB-to-Serial adapters
- More QR scanner brands
- Mobile device support
- Cross-platform compatibility 