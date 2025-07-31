import { Navigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuthPage } from './useAuth';
import { ConnectionStatus } from './ConnectionStatus';
import { SignInForm } from './SignInForm';
import { SignUpForm } from './SignUpForm';

export function Auth() {
  const {
    user,
    loading,
    isSubmitting,
    connectionStatus,
    checkConnection,
    handleSignIn,
    handleSignUp,
  } = useAuthPage();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/admin" replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Event Registration System</h1>
          <p className="text-gray-600">Admin Dashboard</p>
        </div>

        <ConnectionStatus status={connectionStatus} onCheckConnection={checkConnection} />

        <Tabs defaultValue="signin" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Sign In</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>

          <TabsContent value="signin" className="mt-6">
            <SignInForm isSubmitting={isSubmitting} onSubmit={handleSignIn} />
          </TabsContent>

          <TabsContent value="signup" className="mt-6">
            <SignUpForm isSubmitting={isSubmitting} onSubmit={handleSignUp} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
} 