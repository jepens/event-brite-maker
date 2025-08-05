import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ImportWizard } from '../ImportWizard';
import { ImportService } from '@/lib/import-service';
import { ImportTemplateService } from '@/lib/import-template-service';

// Mock services
vi.mock('@/lib/import-service');
vi.mock('@/lib/import-template-service');
vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn()
}));

// Mock file
const createMockFile = (name: string, content: string): File => {
  const file = new File([content], name, { type: 'text/csv' });
  Object.defineProperty(file, 'size', { value: content.length });
  return file;
};

// Mock templates
const mockTemplates = [
  {
    id: '1',
    name: 'Basic Template',
    description: 'Basic import template',
    category: 'basic',
    field_mapping: {
      name: 'Nama',
      email: 'Email',
      phone: 'Telepon'
    },
    validation_rules: {
      email: { required: true, type: 'email' },
      name: { required: true, minLength: 2 }
    },
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    created_by: 'user1',
    created_by_name: 'Test User',
    usage_count: 5
  }
];

// Mock import result
const mockImportResult = {
  status: 'completed' as const,
  totalRecords: 10,
  successfulImports: 8,
  failedImports: 2,
  errors: []
};

describe('ImportWizard', () => {
  const mockEventId = 'event-123';
  const mockOnImportComplete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock service implementations
    vi.mocked(ImportService.parseFileHeaders).mockResolvedValue(['Nama', 'Email', 'Telepon']);
    vi.mocked(ImportService.parseFile).mockResolvedValue([
      { Nama: 'John Doe', Email: 'john@example.com', Telepon: '123456789' }
    ]);
    vi.mocked(ImportService.validateData).mockResolvedValue({
      headers: ['Nama', 'Email', 'Telepon'],
      data: [{ Nama: 'John Doe', Email: 'john@example.com', Telepon: '123456789' }],
      totalRows: 1,
      validRows: 1,
      invalidRows: 0,
      errors: []
    });
    vi.mocked(ImportService.importData).mockResolvedValue(mockImportResult);
    
    vi.mocked(ImportTemplateService.getTemplates).mockResolvedValue(mockTemplates);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initial Render', () => {
    it('renders import button', () => {
      render(<ImportWizard eventId={mockEventId} onImportComplete={mockOnImportComplete} />);
      
      expect(screen.getByRole('button', { name: /import data/i })).toBeInTheDocument();
    });

    it('shows dialog when button is clicked', async () => {
      const user = userEvent.setup();
      render(<ImportWizard eventId={mockEventId} onImportComplete={mockOnImportComplete} />);
      
      const button = screen.getByRole('button', { name: /import data/i });
      await user.click(button);
      
      expect(screen.getByText('Import Data Peserta')).toBeInTheDocument();
      expect(screen.getByText('Import data peserta dari file CSV atau Excel')).toBeInTheDocument();
    });

    it('shows advanced features buttons', async () => {
      const user = userEvent.setup();
      render(<ImportWizard eventId={mockEventId} onImportComplete={mockOnImportComplete} />);
      
      const button = screen.getByRole('button', { name: /import data/i });
      await user.click(button);
      
      expect(screen.getByRole('button', { name: /template library/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /import history/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /batch processor/i })).toBeInTheDocument();
    });
  });

  describe('File Upload Step', () => {
    it('handles file upload successfully', async () => {
      const user = userEvent.setup();
      render(<ImportWizard eventId={mockEventId} onImportComplete={mockOnImportComplete} />);
      
      const button = screen.getByRole('button', { name: /import data/i });
      await user.click(button);
      
      const file = createMockFile('test.csv', 'Nama,Email,Telepon\nJohn Doe,john@example.com,123456789');
      const fileInput = screen.getByLabelText(/upload file/i);
      
      await user.upload(fileInput, file);
      
      await waitFor(() => {
        expect(screen.getByText('Pilih Template')).toBeInTheDocument();
      });
    });

    it('shows error for invalid file', async () => {
      const user = userEvent.setup();
      vi.mocked(ImportService.parseFileHeaders).mockRejectedValue(new Error('Invalid file'));
      
      render(<ImportWizard eventId={mockEventId} onImportComplete={mockOnImportComplete} />);
      
      const button = screen.getByRole('button', { name: /import data/i });
      await user.click(button);
      
      const file = createMockFile('invalid.txt', 'invalid content');
      const fileInput = screen.getByLabelText(/upload file/i);
      
      await user.upload(fileInput, file);
      
      await waitFor(() => {
        expect(screen.getByText(/gagal membaca file/i)).toBeInTheDocument();
      });
    });
  });

  describe('Template Selection Step', () => {
    it('shows available templates', async () => {
      const user = userEvent.setup();
      render(<ImportWizard eventId={mockEventId} onImportComplete={mockOnImportComplete} />);
      
      const button = screen.getByRole('button', { name: /import data/i });
      await user.click(button);
      
      // Upload file first
      const file = createMockFile('test.csv', 'Nama,Email,Telepon\nJohn Doe,john@example.com,123456789');
      const fileInput = screen.getByLabelText(/upload file/i);
      await user.upload(fileInput, file);
      
      await waitFor(() => {
        expect(screen.getByText('Basic Template')).toBeInTheDocument();
        expect(screen.getByText('Basic import template')).toBeInTheDocument();
      });
    });

    it('allows template selection', async () => {
      const user = userEvent.setup();
      render(<ImportWizard eventId={mockEventId} onImportComplete={mockOnImportComplete} />);
      
      const button = screen.getByRole('button', { name: /import data/i });
      await user.click(button);
      
      // Upload file first
      const file = createMockFile('test.csv', 'Nama,Email,Telepon\nJohn Doe,john@example.com,123456789');
      const fileInput = screen.getByLabelText(/upload file/i);
      await user.upload(fileInput, file);
      
      await waitFor(() => {
        expect(screen.getByText('Basic Template')).toBeInTheDocument();
      });
      
      const templateCard = screen.getByText('Basic Template').closest('div');
      await user.click(templateCard!);
      
      await waitFor(() => {
        expect(screen.getByText('Field Mapping')).toBeInTheDocument();
      });
    });
  });

  describe('Field Mapping Step', () => {
    it('shows field mapping interface', async () => {
      const user = userEvent.setup();
      render(<ImportWizard eventId={mockEventId} onImportComplete={mockOnImportComplete} />);
      
      const button = screen.getByRole('button', { name: /import data/i });
      await user.click(button);
      
      // Navigate to field mapping step
      const file = createMockFile('test.csv', 'Nama,Email,Telepon\nJohn Doe,john@example.com,123456789');
      const fileInput = screen.getByLabelText(/upload file/i);
      await user.upload(fileInput, file);
      
      await waitFor(() => {
        expect(screen.getByText('Basic Template')).toBeInTheDocument();
      });
      
      const templateCard = screen.getByText('Basic Template').closest('div');
      await user.click(templateCard!);
      
      await waitFor(() => {
        expect(screen.getByText('Field Mapping')).toBeInTheDocument();
        expect(screen.getByText('Nama')).toBeInTheDocument();
        expect(screen.getByText('Email')).toBeInTheDocument();
        expect(screen.getByText('Telepon')).toBeInTheDocument();
      });
    });
  });

  describe('Data Preview Step', () => {
    it('shows data preview', async () => {
      const user = userEvent.setup();
      render(<ImportWizard eventId={mockEventId} onImportComplete={mockOnImportComplete} />);
      
      const button = screen.getByRole('button', { name: /import data/i });
      await user.click(button);
      
      // Navigate through steps
      const file = createMockFile('test.csv', 'Nama,Email,Telepon\nJohn Doe,john@example.com,123456789');
      const fileInput = screen.getByLabelText(/upload file/i);
      await user.upload(fileInput, file);
      
      await waitFor(() => {
        expect(screen.getByText('Basic Template')).toBeInTheDocument();
      });
      
      const templateCard = screen.getByText('Basic Template').closest('div');
      await user.click(templateCard!);
      
      // Complete field mapping
      const continueButton = screen.getByRole('button', { name: /continue/i });
      await user.click(continueButton);
      
      await waitFor(() => {
        expect(screen.getByText('Preview Data')).toBeInTheDocument();
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('john@example.com')).toBeInTheDocument();
      });
    });
  });

  describe('Validation Step', () => {
    it('shows validation errors', async () => {
      const user = userEvent.setup();
      
      // Mock validation with errors
      vi.mocked(ImportService.validateData).mockResolvedValue({
        headers: ['Nama', 'Email', 'Telepon'],
        data: [{ Nama: 'John Doe', Email: 'invalid-email', Telepon: '123456789' }],
        totalRows: 1,
        validRows: 0,
        invalidRows: 1,
        errors: [
          { row: 1, field: 'Email', message: 'Invalid email format', value: 'invalid-email' }
        ]
      });
      
      render(<ImportWizard eventId={mockEventId} onImportComplete={mockOnImportComplete} />);
      
      const button = screen.getByRole('button', { name: /import data/i });
      await user.click(button);
      
      // Navigate through steps
      const file = createMockFile('test.csv', 'Nama,Email,Telepon\nJohn Doe,invalid-email,123456789');
      const fileInput = screen.getByLabelText(/upload file/i);
      await user.upload(fileInput, file);
      
      await waitFor(() => {
        expect(screen.getByText('Basic Template')).toBeInTheDocument();
      });
      
      const templateCard = screen.getByText('Basic Template').closest('div');
      await user.click(templateCard!);
      
      const continueButton = screen.getByRole('button', { name: /continue/i });
      await user.click(continueButton);
      
      // Continue to validation
      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      await user.click(confirmButton);
      
      await waitFor(() => {
        expect(screen.getByText('Validasi')).toBeInTheDocument();
        expect(screen.getByText(/invalid email format/i)).toBeInTheDocument();
      });
    });
  });

  describe('Import Process', () => {
    it('completes import successfully', async () => {
      const user = userEvent.setup();
      render(<ImportWizard eventId={mockEventId} onImportComplete={mockOnImportComplete} />);
      
      const button = screen.getByRole('button', { name: /import data/i });
      await user.click(button);
      
      // Navigate through all steps
      const file = createMockFile('test.csv', 'Nama,Email,Telepon\nJohn Doe,john@example.com,123456789');
      const fileInput = screen.getByLabelText(/upload file/i);
      await user.upload(fileInput, file);
      
      await waitFor(() => {
        expect(screen.getByText('Basic Template')).toBeInTheDocument();
      });
      
      const templateCard = screen.getByText('Basic Template').closest('div');
      await user.click(templateCard!);
      
      const continueButton = screen.getByRole('button', { name: /continue/i });
      await user.click(continueButton);
      
      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      await user.click(confirmButton);
      
      const importButton = screen.getByRole('button', { name: /start import/i });
      await user.click(importButton);
      
      await waitFor(() => {
        expect(screen.getByText('Import Berhasil!')).toBeInTheDocument();
        expect(screen.getByText('10')).toBeInTheDocument(); // Total records
        expect(screen.getByText('8')).toBeInTheDocument(); // Successful imports
      });
      
      expect(mockOnImportComplete).toHaveBeenCalled();
    });

    it('handles import failure', async () => {
      const user = userEvent.setup();
      
      // Mock import failure
      vi.mocked(ImportService.importData).mockRejectedValue(new Error('Import failed'));
      
      render(<ImportWizard eventId={mockEventId} onImportComplete={mockOnImportComplete} />);
      
      const button = screen.getByRole('button', { name: /import data/i });
      await user.click(button);
      
      // Navigate through steps
      const file = createMockFile('test.csv', 'Nama,Email,Telepon\nJohn Doe,john@example.com,123456789');
      const fileInput = screen.getByLabelText(/upload file/i);
      await user.upload(fileInput, file);
      
      await waitFor(() => {
        expect(screen.getByText('Basic Template')).toBeInTheDocument();
      });
      
      const templateCard = screen.getByText('Basic Template').closest('div');
      await user.click(templateCard!);
      
      const continueButton = screen.getByRole('button', { name: /continue/i });
      await user.click(continueButton);
      
      const confirmButton = screen.getByRole('button', { name: /confirm/i });
      await user.click(confirmButton);
      
      const importButton = screen.getByRole('button', { name: /start import/i });
      await user.click(importButton);
      
      await waitFor(() => {
        expect(screen.getByText(/gagal melakukan import/i)).toBeInTheDocument();
      });
    });
  });

  describe('Advanced Features', () => {
    it('opens template library', async () => {
      const user = userEvent.setup();
      render(<ImportWizard eventId={mockEventId} onImportComplete={mockOnImportComplete} />);
      
      const button = screen.getByRole('button', { name: /import data/i });
      await user.click(button);
      
      const templateLibraryButton = screen.getByRole('button', { name: /template library/i });
      await user.click(templateLibraryButton);
      
      await waitFor(() => {
        expect(screen.getByText('Template Library')).toBeInTheDocument();
      });
    });

    it('opens import history', async () => {
      const user = userEvent.setup();
      render(<ImportWizard eventId={mockEventId} onImportComplete={mockOnImportComplete} />);
      
      const button = screen.getByRole('button', { name: /import data/i });
      await user.click(button);
      
      const importHistoryButton = screen.getByRole('button', { name: /import history/i });
      await user.click(importHistoryButton);
      
      await waitFor(() => {
        expect(screen.getByText('Import History')).toBeInTheDocument();
      });
    });

    it('opens batch processor', async () => {
      const user = userEvent.setup();
      render(<ImportWizard eventId={mockEventId} onImportComplete={mockOnImportComplete} />);
      
      const button = screen.getByRole('button', { name: /import data/i });
      await user.click(button);
      
      const batchProcessorButton = screen.getByRole('button', { name: /batch processor/i });
      await user.click(batchProcessorButton);
      
      await waitFor(() => {
        expect(screen.getByText('Batch Import Processor')).toBeInTheDocument();
        expect(screen.getByText(/silakan upload file terlebih dahulu/i)).toBeInTheDocument();
      });
    });
  });

  describe('Navigation', () => {
    it('allows going back to previous steps', async () => {
      const user = userEvent.setup();
      render(<ImportWizard eventId={mockEventId} onImportComplete={mockOnImportComplete} />);
      
      const button = screen.getByRole('button', { name: /import data/i });
      await user.click(button);
      
      // Upload file to get to template selection
      const file = createMockFile('test.csv', 'Nama,Email,Telepon\nJohn Doe,john@example.com,123456789');
      const fileInput = screen.getByLabelText(/upload file/i);
      await user.upload(fileInput, file);
      
      await waitFor(() => {
        expect(screen.getByText('Pilih Template')).toBeInTheDocument();
      });
      
      // Go back to upload step
      const backButton = screen.getByRole('button', { name: /sebelumnya/i });
      await user.click(backButton);
      
      await waitFor(() => {
        expect(screen.getByText('Upload File')).toBeInTheDocument();
      });
    });

    it('disables back button on first step', async () => {
      const user = userEvent.setup();
      render(<ImportWizard eventId={mockEventId} onImportComplete={mockOnImportComplete} />);
      
      const button = screen.getByRole('button', { name: /import data/i });
      await user.click(button);
      
      const backButton = screen.getByRole('button', { name: /sebelumnya/i });
      expect(backButton).toBeDisabled();
    });
  });

  describe('Error Handling', () => {
    it('shows error messages', async () => {
      const user = userEvent.setup();
      vi.mocked(ImportService.parseFileHeaders).mockRejectedValue(new Error('File parsing failed'));
      
      render(<ImportWizard eventId={mockEventId} onImportComplete={mockOnImportComplete} />);
      
      const button = screen.getByRole('button', { name: /import data/i });
      await user.click(button);
      
      const file = createMockFile('invalid.csv', 'invalid content');
      const fileInput = screen.getByLabelText(/upload file/i);
      await user.upload(fileInput, file);
      
      await waitFor(() => {
        expect(screen.getByText(/gagal membaca file/i)).toBeInTheDocument();
      });
    });

    it('clears errors when navigating', async () => {
      const user = userEvent.setup();
      vi.mocked(ImportService.parseFileHeaders).mockRejectedValueOnce(new Error('File parsing failed'));
      
      render(<ImportWizard eventId={mockEventId} onImportComplete={mockOnImportComplete} />);
      
      const button = screen.getByRole('button', { name: /import data/i });
      await user.click(button);
      
      const file = createMockFile('invalid.csv', 'invalid content');
      const fileInput = screen.getByLabelText(/upload file/i);
      await user.upload(fileInput, file);
      
      await waitFor(() => {
        expect(screen.getByText(/gagal membaca file/i)).toBeInTheDocument();
      });
      
      // Upload valid file
      const validFile = createMockFile('valid.csv', 'Nama,Email,Telepon\nJohn Doe,john@example.com,123456789');
      await user.upload(fileInput, validFile);
      
      await waitFor(() => {
        expect(screen.queryByText(/gagal membaca file/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels', async () => {
      const user = userEvent.setup();
      render(<ImportWizard eventId={mockEventId} onImportComplete={mockOnImportComplete} />);
      
      const button = screen.getByRole('button', { name: /import data/i });
      await user.click(button);
      
      expect(screen.getByLabelText(/upload file/i)).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<ImportWizard eventId={mockEventId} onImportComplete={mockOnImportComplete} />);
      
      const button = screen.getByRole('button', { name: /import data/i });
      await user.click(button);
      
      // Test tab navigation
      await user.tab();
      expect(screen.getByRole('button', { name: /template library/i })).toHaveFocus();
      
      await user.tab();
      expect(screen.getByRole('button', { name: /import history/i })).toHaveFocus();
    });
  });
}); 