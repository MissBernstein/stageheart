import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import PageLayout from '@/ui/PageLayout';

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <PageLayout container={false} className="bg-background" footerProps={{ hideLegal: false }}>
      <div className="flex flex-1 items-center justify-center px-4 py-20 text-center">
        <h1 className="mb-4 text-4xl font-bold">404</h1>
        <p className="mb-4 text-xl text-gray-600">Oops! Page not found</p>
        <a href="/" className="text-blue-500 underline hover:text-blue-700">
          Return to Home
        </a>
      </div>
    </PageLayout>
  );
};

export default NotFound;
