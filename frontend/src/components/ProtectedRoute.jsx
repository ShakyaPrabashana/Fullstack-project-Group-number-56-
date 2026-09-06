import { Navigate } from 'react-router-dom';
import { currentUser } from '../api/client';

function ProtectedRoute({ children }) {
  const user = currentUser();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export default ProtectedRoute;