import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { Layout } from './components/Layout';
import Overview from './pages/Overview';
import History from './pages/History';
import Analytics from './pages/Analytics';
import Costs from './pages/Costs';
import Research from './pages/Research';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Overview /> },
      { path: 'history', element: <History /> },
      { path: 'analytics', element: <Analytics /> },
      { path: 'costs', element: <Costs /> },
      { path: 'research', element: <Research /> },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}
