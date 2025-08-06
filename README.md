# Event Brite Maker

A modern event registration and management application built with React, TypeScript, and Supabase.

## 🚀 Features

- **Event Management**: Create, edit, and manage events
- **Registration System**: Handle participant registrations
- **QR Code Scanner**: Scan QR codes for check-ins
- **Admin Dashboard**: Comprehensive admin interface
- **Real-time Updates**: Live data synchronization
- **PWA Support**: Progressive Web App capabilities
- **Mobile Responsive**: Works on all devices

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
