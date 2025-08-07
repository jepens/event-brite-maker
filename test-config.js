/**
 * Test Configuration for Import Feature Tests
 * ES Module format
 */

// Supabase Configuration
export const SUPABASE_CONFIG = {
  url: 'https://mjolfjoqfnszvvlbzhjn.supabase.co',
  anonKey: 'your-anon-key-here' // Replace with your actual anon key
};

// Test Event Configuration
export const TEST_EVENT_CONFIG = {
  eventId: '52f0450a-d27a-4f8e-9b0c-37fa7aa46acf', // Replace with actual event ID
  name: 'Test Event',
  maxParticipants: 1000,
  registrationStatus: 'open'
};

// Test Data Configuration
export const TEST_DATA_CONFIG = {
  // Test emails (will be used for duplicate testing)
  emails: [
    'test1@example.com',
    'test2@example.com',
    'test3@example.com',
    'duplicate@example.com', // This will be used to test duplicate checking
    'duplicate@example.com'  // Duplicate email
  ],
  
  // Test CSV data
  csvData: `Nama,Email,Telepon
John Doe,test1@example.com,081234567890
Jane Smith,test2@example.com,081234567891
Bob Johnson,test3@example.com,081234567892
Alice Brown,duplicate@example.com,081234567893
Charlie Wilson,duplicate@example.com,081234567894`,
  
  // Test Excel data (simulated)
  excelData: [
    { Nama: 'John Doe', Email: 'test1@example.com', Telepon: '081234567890' },
    { Nama: 'Jane Smith', Email: 'test2@example.com', Telepon: '081234567891' },
    { Nama: 'Bob Johnson', Email: 'test3@example.com', Telepon: '081234567892' },
    { Nama: 'Alice Brown', Email: 'duplicate@example.com', Telepon: '081234567893' },
    { Nama: 'Charlie Wilson', Email: 'duplicate@example.com', Telepon: '081234567894' }
  ]
};

// Test Settings
export const TEST_SETTINGS = {
  // Delays between operations (in milliseconds)
  delays: {
    betweenTests: 500,
    betweenBatches: 200,
    betweenInserts: 100,
    processingSimulation: 50
  },
  
  // Batch processing settings
  batchProcessing: {
    batchSize: 2, // Small batch size for testing
    successRate: 0.9, // 90% success rate for simulation
    maxRetries: 3
  },
  
  // Validation settings
  validation: {
    emailRegex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    phoneRegex: /^[\+]?[0-9\s\-\(\)]{8,}$/,
    requiredFields: ['participant_name', 'participant_email']
  },
  
  // Logging settings
  logging: {
    enableColors: true,
    enableTimestamps: true,
    logLevel: 'info' // 'debug', 'info', 'warning', 'error'
  }
};

// Test Scenarios
export const TEST_SCENARIOS = {
  // Quick test (basic functionality)
  quick: [
    'event',
    'count',
    'csv',
    'mapping',
    'error'
  ],
  
  // Integration test (full workflow)
  integration: [
    'event',
    'count',
    'csv',
    'mapping',
    'duplicate',
    'validation',
    'insertion',
    'cleanup',
    'batch',
    'error'
  ],
  
  // Duplicate testing scenario
  duplicate: [
    'event',
    'count',
    'csv',
    'mapping',
    'duplicate',
    'validation'
  ],
  
  // Batch processing scenario
  batch: [
    'event',
    'csv',
    'mapping',
    'batch'
  ]
};

// Error test cases
export const ERROR_TEST_CASES = {
  invalidEmails: [
    'invalid-email',
    'test@',
    '@test.com',
    'test.com',
    'test@test',
    'test@.com'
  ],
  
  invalidPhones: [
    '123',
    'abc',
    '123-456',
    '+123',
    '12345678901234567890'
  ],
  
  emptyFields: [
    { name: '', email: 'test@example.com', phone: '081234567890' },
    { name: 'John Doe', email: '', phone: '081234567890' },
    { name: '   ', email: 'test@example.com', phone: '081234567890' },
    { name: 'John Doe', email: 'test@example.com', phone: '' }
  ],
  
  invalidEventIds: [
    'invalid-uuid',
    'not-a-uuid',
    '12345678-1234-1234-1234-123456789012',
    ''
  ]
};

// Expected results for validation
export const EXPECTED_RESULTS = {
  csvParsing: {
    headers: ['Nama', 'Email', 'Telepon'],
    rowCount: 5
  },
  
  fieldMapping: {
    participant_name: 'Nama',
    participant_email: 'Email',
    phone_number: 'Telepon'
  },
  
  duplicateChecking: {
    originalRows: 5,
    expectedFilteredRows: 3, // Assuming 2 duplicates
    duplicateEmails: ['duplicate@example.com']
  },
  
  validation: {
    validRows: 3,
    expectedErrors: 2 // 2 duplicate emails
  }
};

// Export all configurations
export default {
  SUPABASE_CONFIG,
  TEST_EVENT_CONFIG,
  TEST_DATA_CONFIG,
  TEST_SETTINGS,
  TEST_SCENARIOS,
  ERROR_TEST_CASES,
  EXPECTED_RESULTS
};
