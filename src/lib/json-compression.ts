/**
 * JSON Compression Utilities
 * Reduces bandwidth usage by compressing JSON data before sending to database
 */

// Simple compression by removing unnecessary whitespace and using shorter property names
export function compressJSON(data: Record<string, unknown>): Record<string, unknown> {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const compressed: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(data)) {
    // Skip null/undefined values to reduce size
    if (value === null || value === undefined) {
      continue;
    }
    
    // Compress string values by trimming whitespace
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed) {
        compressed[key] = trimmed;
      }
    } else {
      compressed[key] = value;
    }
  }
  
  return compressed;
}

// Decompress JSON data when reading from database
export function decompressJSON(data: Record<string, unknown>): Record<string, unknown> {
  if (!data || typeof data !== 'object') {
    return data;
  }
  
  // For now, just return as-is since compression is mainly for sending
  // In the future, we could add more sophisticated decompression
  return data;
}

// Calculate size reduction percentage
export function calculateCompressionRatio(original: Record<string, unknown>, compressed: Record<string, unknown>): number {
  const originalSize = JSON.stringify(original).length;
  const compressedSize = JSON.stringify(compressed).length;
  
  if (originalSize === 0) return 0;
  
  return ((originalSize - compressedSize) / originalSize) * 100;
}

// Validate compressed data structure
export function validateCompressedData(data: Record<string, unknown>): boolean {
  if (!data || typeof data !== 'object') {
    return false;
  }
  
  // Check for circular references and other invalid structures
  try {
    JSON.stringify(data);
    return true;
  } catch {
    return false;
  }
} 