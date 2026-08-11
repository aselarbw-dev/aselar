import Screens from "./Screens/Screens"
import { ToastContainer} from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import NetworkNotification from "./Notification/NetworkNotification";
import 'react-loading-skeleton/dist/skeleton.css'
import GlobalErrorHandler from "./Global/GlobalErrorHandler";
import { AuthProvider } from "./context/AuthContext";
import {SessionWarningModal}  from "./Modals/SessionWarningModal";
import { useAuth } from './context/AuthContext';


const AppContent = () => {
  const { showWarning, extendSession, logout, dismissWarning } = useAuth();

  return (
    <>
      <GlobalErrorHandler/>
      <NetworkNotification/>
      <ToastContainer/>
      <Screens/>
     
      <SessionWarningModal
        isOpen={showWarning}
        onExtend={() => {
          extendSession();
          dismissWarning();
        }}
        onLogout={() => logout()}
      />
    </>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App