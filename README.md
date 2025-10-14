# Event Brite Maker

A modern event registration and management system built with React, TypeScript, and Supabase.

## Features

- **Event Management**: Create and manage events with custom branding
- **Registration System**: Handle participant registrations with approval workflow
- **QR Code Tickets**: Generate and manage QR code tickets for events
- **Email Notifications**: Send ticket emails to participants
- **WhatsApp Integration**: Send ticket notifications via WhatsApp
- **Admin Dashboard**: Comprehensive admin interface for managing events and registrations
- **Mobile Responsive**: Works seamlessly on desktop and mobile devices
- **PWA Support**: Progressive Web App capabilities
- **Import/Export**: Bulk import and export registration data
- **QR Scanner**: Scan QR codes for check-in
- **Reports**: Generate check-in reports and analytics

## Recent Updates

### WhatsApp Resend Feature
- Added "Resend WhatsApp" button next to "Resend Email" in the registration table
- Button only appears when WhatsApp is enabled for the event and phone number is provided
- Uses existing `send-whatsapp-ticket` Supabase function
- Available in both desktop and mobile views
- Shows success/error notifications

## Troubleshooting

### WhatsApp Issues
If you encounter errors when resending WhatsApp tickets:

1. **Check Event Settings**: Ensure WhatsApp is enabled for the event
2. **Verify Phone Number**: Make sure the registration has a valid phone number
3. **Environment Variables**: Verify these are set in Supabase:
   - `WHATSAPP_ACCESS_TOKEN`
   - `WHATSAPP_PHONE_NUMBER_ID`
   - `WHATSAPP_TEMPLATE_NAME`
4. **Phone Number Format**: Supported formats (all will be converted to 628xxxxxxxxxx):
   - `628xxxxxxxxxxx` (14 digits) - Already correct format
   - `628xxxxxxxxxx` (13 digits) - Already correct format
   - `628xxxxxxxxx` (11 digits) - Already correct format
   - `08xxxxxxxxxxx` (13 digits) - Will be converted to 628xxxxxxxxxx
   - `08xxxxxxxxxx` (12 digits) - Will be converted to 628xxxxxxxxxx
   - `08xxxxxxxxx` (11 digits) - Will be converted to 628xxxxxxxxxx
   - `08xxxxxxxx` (10 digits) - Will be converted to 628xxxxxxxxxx
   - `8xxxxxxxxx` (11 digits) - Will be converted to 628xxxxxxxxxx
   - `xxxxxxxxxx` (10 digits) - Will be converted to 628xxxxxxxxxx
   - Also supports: spaces, dashes, plus signs (e.g., `+6281314942012`, `0813-149-42012`)
5. **Rate Limiting**: WhatsApp API has rate limits, wait a few minutes between sends
6. **Template Issues**: Ensure the WhatsApp template is approved and active
7. **Database Schema**: Phone number is stored as `text` type, which is correct

### Common Error Messages
- "WhatsApp is not enabled for this event" → Enable WhatsApp in event settings
- "Phone number not provided" → Add phone number to registration
- "Invalid phone number format" → Use supported phone number format
- "Phone number is required" → Phone number is null, undefined, or empty
- "WhatsApp API error" → Check environment variables and template status

### Testing Phone Numbers
Run the test script to validate phone number formats:
```bash
node test-phone-validation.js
```

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **UI Framework**: shadcn/ui, Tailwind CSS, Radix UI
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **State Management**: TanStack Query (React Query)
- **Routing**: React Router DOM
- **QR Code**: qr-scanner, qrcode.react
- **PDF Generation**: jsPDF
- **Data Handling**: xlsx (Excel/CSV import/export)

## 📋 Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account and project

## 🔧 Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd event-brite-maker
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:8080`

## 🗄️ Database Setup

The application uses Supabase with the following main tables:

- `profiles`: User profiles and authentication
- `events`: Event information and details
- `registrations`: Participant registrations
- `tickets`: QR code tickets for check-ins

Database migrations are located in `supabase/migrations/`.

## 📱 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## 🌐 Application Structure

```
src/
├── components/          # React components
│   ├── admin/          # Admin dashboard components
│   ├── auth/           # Authentication components
│   ├── events/         # Event-related components
│   ├── registration/   # Registration components
│   └── ui/             # Reusable UI components
├── hooks/              # Custom React hooks
├── integrations/       # External service integrations
├── lib/                # Utility functions
├── pages/              # Page components
└── types/              # TypeScript type definitions
```

## 🔐 Authentication

The application uses Supabase Authentication with:
- Email/password authentication
- Role-based access control
- Protected admin routes

## 📊 Admin Dashboard

Access the admin dashboard at `/admin` with admin credentials:
- Event management
- Registration management
- QR code scanner
- Reports and analytics
- PWA status monitoring

## 🚀 Deployment

### Development
```bash
npm run dev
```

### Production
```bash
npm run build
npm run preview
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
1. Check the documentation
2. Review existing issues
3. Create a new issue with detailed information

---

**Built with ❤️ using modern web technologies**
