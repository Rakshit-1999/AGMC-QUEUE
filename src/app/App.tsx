import { RouterProvider } from 'react-router-dom';
import { ToastProvider } from '@/components/ui';
import { router } from './routes';

export function App() {
  return (
    <ToastProvider>
      <RouterProvider router={router} />
    </ToastProvider>
  );
}
