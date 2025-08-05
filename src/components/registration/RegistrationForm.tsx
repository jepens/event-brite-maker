import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar, AlertCircle, CheckCircle } from 'lucide-react';
import { Event, CustomField } from './types';
import { useState, useEffect } from 'react';
import { useRegistrationRateLimit } from '@/hooks/useRateLimit';
import { RateLimitIndicator } from '@/components/RateLimitIndicator';
import { RateLimitBadge } from '@/components/RateLimitIndicator';
import { useMobile } from '@/hooks/use-mobile';
import { toast } from '@/hooks/use-toast';

interface RegistrationFormProps {
  event: Event;
  submitting: boolean;
  onSubmit: (formData: FormData) => void;
  checkEmailExists?: (email: string) => Promise<boolean>;
  checkingEmail?: boolean;
  emailExists?: boolean;
  checkMemberNumberExists?: (memberNumber: string) => Promise<boolean>;
  checkMemberNumberRegistered?: (memberNumber: string) => Promise<boolean>;
  checkingMemberNumber?: boolean;
  memberNumberExists?: boolean;
  memberNumberValid?: boolean;
}

export function RegistrationForm({ 
  event, 
  submitting, 
  onSubmit, 
  checkEmailExists, 
  checkingEmail = false, 
  emailExists = false,
  checkMemberNumberExists,
  checkMemberNumberRegistered,
  checkingMemberNumber = false,
  memberNumberExists = false,
  memberNumberValid = false
}: RegistrationFormProps) {
  const [email, setEmail] = useState('');
  const [emailValidated, setEmailValidated] = useState(false);
  const [emailValidationTimeout, setEmailValidationTimeout] = useState<NodeJS.Timeout | null>(null);
  const [memberNumbers, setMemberNumbers] = useState<Record<string, string>>({});
  const [memberNumberValidated, setMemberNumberValidated] = useState<Record<string, boolean>>({});
  const [memberNumberValidationTimeouts, setMemberNumberValidationTimeouts] = useState<Record<string, NodeJS.Timeout>>({});
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [whatsappValidated, setWhatsappValidated] = useState(false);
  const [whatsappValidationTimeout, setWhatsappValidationTimeout] = useState<NodeJS.Timeout | null>(null);
  const { isMobile } = useMobile();
  
  // Rate limiting
  const rateLimit = useRegistrationRateLimit();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Check rate limit before submission
    const isAllowed = await rateLimit.isAllowed();
    if (!isAllowed) {
      return; // Rate limit exceeded, don't submit
    }
    
    try {
      // Create FormData directly from the event target
      const formData = new FormData(e.target as HTMLFormElement);
      
      // Record the attempt
      const canProceed = await rateLimit.recordAttempt();
      if (!canProceed) {
        return; // Rate limit exceeded after recording
      }
      
      onSubmit(formData);
    } catch (error) {
      console.error('Error creating FormData:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit form. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Real-time email validation with caching and increased debounce
  useEffect(() => {
    if (emailValidationTimeout) {
      clearTimeout(emailValidationTimeout);
    }

    if (email && checkEmailExists) {
      const timeout = setTimeout(async () => {
        if (email.length > 0) {
          // Check cache first to reduce API calls
          const cacheKey = `email_validation_${email.toLowerCase()}`;
          const cached = localStorage.getItem(cacheKey);
          
          if (cached) {
            const { result, timestamp } = JSON.parse(cached);
            const cacheAge = Date.now() - timestamp;
            const cacheValid = cacheAge < 5 * 60 * 1000; // 5 minutes cache
            
            if (cacheValid) {
              // Use cached result - emailExists is handled by parent component
              setEmailValidated(true);
              return;
            }
          }
          
          // If not cached or expired, make API call
          await checkEmailExists(email);
          setEmailValidated(true);
          
          // Cache the result - don't use emailExists state here to avoid infinite loop
          localStorage.setItem(cacheKey, JSON.stringify({
            result: false, // We'll let the parent component handle the actual result
            timestamp: Date.now()
          }));
        }
      }, 2000); // Increased debounce from 1s to 2s

      setEmailValidationTimeout(timeout);
    }

    return () => {
      if (emailValidationTimeout) {
        clearTimeout(emailValidationTimeout);
      }
    };
  }, [email, checkEmailExists]); // Removed emailValidationTimeout to prevent infinite loop

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEmail = e.target.value;
    setEmail(newEmail);
    setEmailValidated(false);
  };

  // WhatsApp number validation function
  const validateWhatsAppNumber = (phoneNumber: string): { isValid: boolean; formatted: string; message: string } => {
    if (!phoneNumber.trim()) {
      return { isValid: true, formatted: '', message: '' }; // Empty is valid (optional field)
    }

    const digitsOnly = phoneNumber.replace(/\D/g, '');
    
    // Indonesian mobile number validation rules:
    // - Total length: 10-13 digits (including country code)
    // - Valid formats: 628xxxxxxxxxx (13 digits), 08xxxxxxxxxx (12 digits), 8xxxxxxxxx (11 digits), xxxxxxxxxx (10 digits)
    
    if (digitsOnly.startsWith('62') && digitsOnly.length === 13) {
      // Already in correct format: 628xxxxxxxxxx (13 digits)
      return { 
        isValid: true, 
        formatted: digitsOnly, 
        message: 'WhatsApp number format is valid' 
      };
    } else if (digitsOnly.startsWith('08') && digitsOnly.length === 12) {
      // Convert from 08xxxxxxxxxx to 628xxxxxxxxxx (12 digits -> 13 digits)
      const formatted = '62' + digitsOnly.substring(1);
      return { 
        isValid: true, 
        formatted, 
        message: `Will be formatted as: ${formatted}` 
      };
    } else if (digitsOnly.startsWith('8') && digitsOnly.length === 11) {
      // Convert from 8xxxxxxxxx to 628xxxxxxxxxx (11 digits -> 13 digits)
      const formatted = '62' + digitsOnly;
      return { 
        isValid: true, 
        formatted, 
        message: `Will be formatted as: ${formatted}` 
      };
    } else if (digitsOnly.length === 10 && !digitsOnly.startsWith('0') && !digitsOnly.startsWith('8')) {
      // Convert from xxxxxxxxxx to 628xxxxxxxxxx (10 digits -> 13 digits)
      // Only for numbers that don't start with 0 or 8
      const formatted = '62' + digitsOnly;
      return { 
        isValid: true, 
        formatted, 
        message: `Will be formatted as: ${formatted}` 
      };
    } else {
      return { 
        isValid: false, 
        formatted: '', 
        message: 'Please enter a valid Indonesian phone number. Examples: 081314942012, 81314942012, or 6281314942012' 
      };
    }
  };

  // Handle WhatsApp number change
  const handleWhatsAppChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newNumber = e.target.value;
    setWhatsappNumber(newNumber);
    setWhatsappValidated(false);

    // Clear existing timeout
    if (whatsappValidationTimeout) {
      clearTimeout(whatsappValidationTimeout);
    }

    // Set new timeout for validation
    if (newNumber.trim()) {
      const timeout = setTimeout(() => {
        const validation = validateWhatsAppNumber(newNumber);
        setWhatsappValidated(true);
        
        if (validation.isValid && validation.formatted) {
          // Update the input with formatted number
          e.target.value = validation.formatted;
          setWhatsappNumber(validation.formatted);
        }
      }, 1000); // Debounce for 1 second

      setWhatsappValidationTimeout(timeout);
    }
  };

  // Handle member number validation with caching and increased debounce
  const handleMemberNumberChange = (fieldName: string, value: string) => {
    setMemberNumbers(prev => ({ ...prev, [fieldName]: value }));
    setMemberNumberValidated(prev => ({ ...prev, [fieldName]: false }));

    // Clear existing timeout
    if (memberNumberValidationTimeouts[fieldName]) {
      clearTimeout(memberNumberValidationTimeouts[fieldName]);
    }

    // Set new timeout for validation
    if (value && checkMemberNumberExists && checkMemberNumberRegistered) {
      const timeout = setTimeout(async () => {
        if (value.length === 10) {
          console.log(`Validating member number: ${value}`);
          
          // Check cache first to reduce API calls
          const cacheKey = `member_validation_${value}`;
          const cached = localStorage.getItem(cacheKey);
          
          if (cached) {
            const { exists, registered, timestamp } = JSON.parse(cached);
            const cacheAge = Date.now() - timestamp;
            const cacheValid = cacheAge < 60 * 60 * 1000; // 1 hour cache for member data
            
            if (cacheValid) {
              console.log(`Using cached member validation for: ${value}`);
              setMemberNumberValidated(prev => ({ ...prev, [fieldName]: true }));
              return;
            }
          }
          
          // If not cached or expired, make API calls
          const exists = await checkMemberNumberExists(value);
          console.log(`Member number exists in database: ${exists}`);
          
          let registered = false;
          if (exists) {
            // Check if already registered for this event
            registered = await checkMemberNumberRegistered(value);
            console.log(`Member number already registered for this event: ${registered}`);
          }
          
          // Cache the results
          localStorage.setItem(cacheKey, JSON.stringify({
            exists,
            registered,
            timestamp: Date.now()
          }));
          
          setMemberNumberValidated(prev => ({ ...prev, [fieldName]: true }));
        }
      }, 2000); // Increased debounce from 1s to 2s

      setMemberNumberValidationTimeouts(prev => ({ ...prev, [fieldName]: timeout }));
    }
  };

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      Object.values(memberNumberValidationTimeouts).forEach(timeout => {
        if (timeout) clearTimeout(timeout);
      });
      if (whatsappValidationTimeout) {
        clearTimeout(whatsappValidationTimeout);
      }
    };
  }, []); // Empty dependency array - only run on unmount

  return (
    <div className="space-y-6">
      {/* Rate Limit Indicator */}
      <RateLimitIndicator 
        state={rateLimit} 
        action="registration" 
        onReset={rateLimit.reset}
        showDetails={false}
      />
      
      <Card className={`mx-auto ${isMobile ? 'w-full' : 'max-w-3xl'} mobile-card border-0 shadow-xl bg-white/90 backdrop-blur-sm`}>
        <CardHeader className="pb-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <CardTitle className="text-2xl lg:text-3xl font-bold text-gray-900">
                Event Registration Form
              </CardTitle>
              <p className="text-gray-600 text-sm lg:text-base">
                Please fill in your details to complete the registration
              </p>
            </div>
            <RateLimitBadge state={rateLimit} action="registration" />
          </div>
        </CardHeader>
        
        <CardContent className="px-8 pb-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            
            {/* Personal Information Section */}
            <section className="space-y-6">
              <div className="flex items-center gap-3 pb-4 border-b border-gray-200">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-semibold text-sm">1</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900">Personal Information</h3>
              </div>
              
              <div className="grid gap-6 lg:grid-cols-2">
                {/* Full Name */}
                <div className="space-y-3 lg:col-span-2">
                  <Label htmlFor="participantName" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <span>Full Name</span>
                    <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="participantName"
                    name="participantName"
                    type="text"
                    placeholder="Enter your full name"
                    required
                    className="h-14 text-base border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all rounded-xl"
                  />
                </div>

                {/* Email Address */}
                <div className="space-y-3 lg:col-span-2">
                  <Label htmlFor="participantEmail" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <span>Email Address</span>
                    <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="participantEmail"
                      name="participantEmail"
                      type="email"
                      placeholder="Enter your email address"
                      required
                      value={email}
                      onChange={handleEmailChange}
                      className={`h-14 text-base border-2 focus:ring-4 transition-all rounded-xl pr-12 ${
                        emailValidated && emailExists
                          ? 'border-red-300 focus:border-red-500 focus:ring-red-100 bg-red-50'
                          : emailValidated && !emailExists
                          ? 'border-green-300 focus:border-green-500 focus:ring-green-100 bg-green-50'
                          : 'border-gray-200 focus:border-blue-500 focus:ring-blue-100'
                      }`}
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-4">
                      {checkingEmail && (
                        <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      )}
                      {emailValidated && !checkingEmail && (
                        <>
                          {emailExists ? (
                            <AlertCircle className="h-5 w-5 text-red-500" />
                          ) : (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  {emailValidated && emailExists && (
                    <p className="text-sm text-red-600 flex items-center gap-2 bg-red-50 p-3 rounded-lg border border-red-200">
                      <AlertCircle className="h-4 w-4 flex-shrink-0" />
                      This email is already registered for this event
                    </p>
                  )}
                  {emailValidated && !emailExists && email.length > 0 && (
                    <p className="text-sm text-green-600 flex items-center gap-2 bg-green-50 p-3 rounded-lg border border-green-200">
                      <CheckCircle className="h-4 w-4 flex-shrink-0" />
                      Email is available for registration
                    </p>
                  )}
                </div>

                {/* WhatsApp Phone Number Field */}
                {event?.whatsapp_enabled && (
                  <div className="space-y-3 lg:col-span-2">
                    <Label htmlFor="participantPhone" className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <span>WhatsApp Number</span>
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">Active</span>
                    </Label>
                    <div className="relative">
                      <Input
                        id="participantPhone"
                        name="participantPhone"
                        type="tel"
                        placeholder="6281234567890"
                        value={whatsappNumber}
                        onChange={handleWhatsAppChange}
                        className={`text-base border-2 focus:ring-4 transition-all rounded-xl pr-12 ${isMobile ? 'mobile-input h-14' : 'h-14'} ${
                          whatsappValidated && whatsappNumber.trim()
                            ? validateWhatsAppNumber(whatsappNumber).isValid
                              ? 'border-green-300 focus:border-green-500 focus:ring-green-100 bg-green-50'
                              : 'border-red-300 focus:border-red-500 focus:ring-red-100 bg-red-50'
                            : 'border-gray-200 focus:border-blue-500 focus:ring-blue-100'
                        }`}
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-4">
                        {whatsappValidated && whatsappNumber.trim() && (
                          <>
                            {validateWhatsAppNumber(whatsappNumber).isValid ? (
                              <CheckCircle className="h-5 w-5 text-green-500" />
                            ) : (
                              <AlertCircle className="h-5 w-5 text-red-500" />
                            )}
                          </>
                        )}
                      </div>
                    </div>
                    {whatsappValidated && whatsappNumber.trim() && (
                      <>
                        {validateWhatsAppNumber(whatsappNumber).isValid ? (
                          <p className="text-sm text-green-600 flex items-center gap-2 bg-green-50 p-3 rounded-lg border border-green-200">
                            <CheckCircle className="h-4 w-4 flex-shrink-0" />
                            {validateWhatsAppNumber(whatsappNumber).message}
                          </p>
                        ) : (
                          <p className="text-sm text-red-600 flex items-center gap-2 bg-red-50 p-3 rounded-lg border border-red-200">
                            <AlertCircle className="h-4 w-4 flex-shrink-0" />
                            {validateWhatsAppNumber(whatsappNumber).message}
                          </p>
                        )}
                      </>
                    )}
                    <p className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
                      <strong>Examples:</strong> 081314942012, 81314942012, or 6281314942012
                    </p>
                  </div>
                )}
              </div>
            </section>
            

            {/* Dynamic Custom Fields */}
            {event.custom_fields && event.custom_fields.length > 0 && (
              <section className="space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b border-gray-200">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <span className="text-purple-600 font-semibold text-sm">2</span>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900">Additional Information</h3>
                </div>
                
                <div className="grid gap-6 lg:grid-cols-2">
                  {event.custom_fields.map((field: CustomField, index: number) => (
                    <div key={index} className={`space-y-3 ${field.type === 'textarea' ? 'lg:col-span-2' : ''}`}>
                      <Label htmlFor={field.name} className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <span>{field.label}</span>
                        {field.required && <span className="text-red-500">*</span>}
                      </Label>
                      {field.type === 'textarea' ? (
                        <Textarea
                          id={field.name}
                          name={field.name}
                          placeholder={field.placeholder || ''}
                          required={field.required}
                          rows={4}
                          className="text-base border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all rounded-xl resize-none"
                        />
                      ) : field.type === 'member_number' ? (
                        <>
                          <div className="relative">
                            <Input
                              id={field.name}
                              name={field.name}
                              type="text"
                              placeholder={field.placeholder || 'Enter 10-digit member number'}
                              required={field.required}
                              maxLength={10}
                              value={memberNumbers[field.name] || ''}
                              onChange={(e) => handleMemberNumberChange(field.name, e.target.value)}
                              className={`text-base border-2 focus:ring-4 transition-all rounded-xl pr-12 ${
                                memberNumberValidated[field.name] && !memberNumberValid
                                  ? 'border-red-300 focus:border-red-500 focus:ring-red-100 bg-red-50'
                                  : memberNumberValidated[field.name] && memberNumberValid && !memberNumberExists
                                  ? 'border-green-300 focus:border-green-500 focus:ring-green-100 bg-green-50'
                                  : 'border-gray-200 focus:border-blue-500 focus:ring-blue-100'
                              }`}
                            />
                            <div className="absolute inset-y-0 right-0 flex items-center pr-4">
                              {checkingMemberNumber && memberNumbers[field.name]?.length === 10 && (
                                <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                              )}
                              {memberNumberValidated[field.name] && !checkingMemberNumber && memberNumbers[field.name]?.length === 10 && (
                                <>
                                  {!memberNumberValid ? (
                                    <AlertCircle className="h-5 w-5 text-red-500" />
                                  ) : memberNumberExists ? (
                                    <AlertCircle className="h-5 w-5 text-red-500" />
                                  ) : (
                                    <CheckCircle className="h-5 w-5 text-green-500" />
                                  )}
                                </>
                              )}
                            </div>
                          </div>
                          {/* Member number validation messages */}
                          {memberNumberValidated[field.name] && memberNumbers[field.name]?.length === 10 && (
                            <>
                              {!memberNumberValid && (
                                <p className="text-sm text-red-600 flex items-center gap-2 bg-red-50 p-3 rounded-lg border border-red-200">
                                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                                  Member number not found in database
                                </p>
                              )}
                              {memberNumberValid && memberNumberExists && (
                                <p className="text-sm text-red-600 flex items-center gap-2 bg-red-50 p-3 rounded-lg border border-red-200">
                                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                                  This member number is already registered for this event
                                </p>
                              )}
                              {memberNumberValid && !memberNumberExists && (
                                <p className="text-sm text-green-600 flex items-center gap-2 bg-green-50 p-3 rounded-lg border border-green-200">
                                  <CheckCircle className="h-4 w-4 flex-shrink-0" />
                                  Member number is valid and available
                                </p>
                              )}
                            </>
                          )}
                        </>
                      ) : (
                        <Input
                          id={field.name}
                          name={field.name}
                          type={field.type || 'text'}
                          placeholder={field.placeholder || ''}
                          required={field.required}
                          className={`text-base border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all rounded-xl ${isMobile ? 'mobile-input h-14' : 'h-14'}`}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Submit Section */}
            <section className="pt-8 border-t border-gray-200 space-y-6">
              <div className="flex items-center gap-3 pb-4">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-green-600 font-semibold text-sm">3</span>
                </div>
                <h3 className="text-xl font-semibold text-gray-900">Complete Registration</h3>
              </div>
              
              <Button 
                type="submit" 
                className={`w-full text-lg font-semibold shadow-lg transition-all duration-200 transform hover:-translate-y-1 border-0 rounded-xl ${
                  isMobile ? 'mobile-button h-16' : 'h-16'
                } ${
                  submitting 
                    ? 'bg-gray-400 cursor-not-allowed text-gray-600' 
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white hover:shadow-2xl'
                }`}
                disabled={submitting}
              >
                {submitting ? (
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span className="font-semibold">Submitting Registration...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <Calendar className="h-6 w-6" />
                    <span className="font-semibold">Register for Event</span>
                  </div>
                )}
              </Button>

              <div className="text-center space-y-3">
                <div className="flex items-center justify-center gap-4 text-sm text-gray-500">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>Secure</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span>Instant</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <span>Confidential</span>
                  </div>
                </div>
                <p className="text-sm text-gray-500">
                  By registering, you agree to receive email notifications about this event.
                </p>
                <p className="text-sm text-gray-500">
                  Your registration will be reviewed and you'll receive confirmation via email or whatsapp.
                </p>
              </div>
            </section>
          </form>
        </CardContent>
      </Card>
    </div>
  );
} 