import  { Suspense, lazy } from "react";
import { Routes, Route } from "react-router-dom";

// Simple fallback component (replace with Skeleton or Spinner if desired)
// Lazy-loaded components
import { ClipLoader } from "react-spinners";
const Home = lazy(() => import("../Pages/Home"));
const NotFound = lazy(() => import("../Componets/NotFound"));
const OrderForm = lazy(() => import("../Orders/OrderForm"));
const AselarAI = lazy(() => import("../AselarGPT/AselarAI"));
const Banking = lazy(() => import("../Banking/Banking"));
const Survey = lazy(() => import("../Componets/Survey"));
const SignUp = lazy(() => import("../Auth/SignUp"));
const SignIn = lazy(() => import("../Auth/SignIn"));
const DashboardLayout = lazy(() => import("../DashboardLayout/DashboardLayout"));
const Receipt = lazy(() => import("../Materials/Receipt"));
const Invoice = lazy(() => import("../DashboardScreens/Invoice"));
const Quote = lazy(() => import("../DashboardScreens/Quote"));
//const FeedBack = lazy(() => import("../FeedBack/FeedBack"));
const PasscodePage = lazy(() => import("../Passcode/PasscodePage"));
const AllReceipts = lazy(() => import("../Documents/AllReceipts"));
const AllQuotes = lazy(() => import("../Documents/AllQuotes"));
const AllInvoices = lazy(() => import("../Documents/AllInvoices"));
const AllExpenses = lazy(() => import("../Documents/AllExpenses"));
const AllCategoryReceipts = lazy(() => import("../Documents/AllCategoryReceipts"));
const InvoiceTemplate = lazy(() => import("../Invoice/InvoiceTemplate"));
const RecentLedgerView = lazy(() => import("../ledgerTemplate/RecentLedgerView"));
const AllLedgers = lazy(() => import("../ledgerTemplate/AllLedgers"));
const DetailedReceipt = lazy(() => import("../Templates/DetailedReceipt"));
const PaySlip = lazy(() => import("../Slip/PaySlip"));
const Agreements = lazy(() => import("../Agreements/Agreements"));
const BalanceSheet = lazy(() => import("../Templates/BalanceSheet"));
const POSContainer = lazy(() => import("../POSContainer/POSContainer"));
const IncomeStatements = lazy(() => import("../Statements/IncomeStatement"));
//const Board = lazy(() => import("../Board/Board"));
const DashboardStats = lazy(() => import("../DashboardStat/DashboardStats"));
const DeleteAccountButton = lazy(() => import("../Profile/DeleteAccountButton"));
const GoodbyePage = lazy(() => import("../Profile/GoodbyePage"));
const Inventory = lazy(() => import("../IVM/Inventory"));
const Ledger = lazy(() => import("../Ledger/Ledger"));
//const IncomeStatement = lazy(() => import("../Templates/IncomeStatement"));
const FileUpload = lazy(() => import("../Uploads/FileUpload"));
const ReceiptTemplate = lazy(() => import("../Templates/Receipt"));

const Profile = lazy(() => import("../Profile/Profile"));
const Delivery = lazy(() => import("../Delivery/Delivery"));
const DebtCollectionTemplate = lazy(() => import("../Delivery/DebtCollectionTemplate"));
//const ScannerComponent = lazy(() => import("../Pages/ScannerComponent"));
const Folder = lazy(() => import("../Folders/Folder"));
const PayslipTemplate = lazy(() => import("../Slip/PayslipTemplate"));
const Billing = lazy(() => import("../Billing/Billing"));
const GPTS = lazy(() => import("../GPT/GPT"));
const AgingReport = lazy(() => import("../Reports/AgingReport"));
const ReconciliationView = lazy(() => import("../Reports/ReconciliationView"));
const QuotationComponent = lazy(() => import("../Quotation/QuotationComponent"));
const IncomeStatementGenerator = lazy(() => import("../Generator/IncomeStatementGenerator"));
const ForgotPasswordForm = lazy(() => import("../Auth/ForgotPasswordForm"));
const ChangePasswordForm = lazy(() => import("../Auth/ChangePasswordForm"));
const ResetPasswordForm = lazy(() => import("../Auth/ResetPasswordForm"));
import { ProtectedRoute } from "../Auth/ProtectedRoute";
const Screens = () => {
  return (
    <Suspense fallback={<ClipLoader />}>
    
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/get-started" element={<Survey />} />
        <Route path="/goodbye" element={<GoodbyePage />} />
        <Route path="/delete-account" element={<DeleteAccountButton />} />
        <Route path="/current-receipt" element={<DetailedReceipt />} />
        <Route path="/all-receipts" element={<AllReceipts />} />
       
        <Route path="/all-quotes" element={<AllQuotes/>} />
        <Route path="/all-invoices" element={<AllInvoices/>} />
        <Route path="/total-expenses" element={<AllExpenses/>} />
        <Route path="/inventory-receipts" element={<AllCategoryReceipts/>} />
        <Route path="/aging-report" element={<AgingReport />} />
        <Route path="/recon" element={<ReconciliationView />} />
        <Route path="/ledgers" element={<AllLedgers />} />
        <Route path="/sign-up" element={<SignUp />} />
        <Route path="/sign-in" element={<SignIn />} />
        <Route path="/receipt-template" element={<ReceiptTemplate />} />
        <Route path="/balance-sheet" element={<BalanceSheet />} />
        <Route path="/user-agreements" element={<Agreements />} />
        <Route path="/files-bunker" element={<Folder />} />
        <Route path="/create-passcode" element={<PasscodePage />} />
        {/*<Route path="/use-scanner" element={<ScannerComponent />} /> */}
        
        <Route path="/files-uploads" element={<FileUpload />} />
        <Route path="/payments" element={<Billing />} />
        <Route path="/banking" element={<Banking />} />
        <Route path="/quotation-template" element={<QuotationComponent />} />
        <Route path="/all-search" element={<GPTS />} />
        <Route path="/financial-statements" element={<IncomeStatements />} />
        <Route path="/generate-statement" element={<IncomeStatementGenerator />} />
        <Route path="/payslip-template" element={<PayslipTemplate />} />
        <Route path="/invoice-template" element={<InvoiceTemplate />} />
        <Route path="/recent-ledgers" element={<RecentLedgerView />} />
        <Route path="/forgot-password" element={<ForgotPasswordForm />} />
        <Route path="/reset-password/:token" element={<ResetPasswordForm />} />
        <Route path="/password-change" element={<ChangePasswordForm />} />
         <Route path="/debt-delivery" element={<DebtCollectionTemplate />} />
         <Route path="*" element={<NotFound />} />

 <Route element={
<ProtectedRoute>

  <DashboardLayout />
  </ProtectedRoute>
  }>
          <Route path="/inside-dashboard" element={<DashboardStats />} />
          <Route path="/quick-receipt" element={<Receipt />} />
          <Route path="/user-profiles" element={<Profile />} />
          <Route path="/generative-scanner" element={<POSContainer />} />
          <Route path="/invoice" element={<Invoice />} />
          <Route path="/debt-note" element={<Delivery />} />
         
          {/* <Route path="/aselar-chat-ai" element={<GPT />} />*/}
          <Route path="/ledger" element={<Ledger />} />
          <Route path="/pay-slip" element={<PaySlip />} />
         {/*<Route path="/feedback" element={<FeedBack />} /> */} 
          <Route path="/quote" element={<Quote />} />
        </Route>
  
       
          <Route path="/aselar-chat-ai" element={<AselarAI />} />
           <Route path="/orders" element={<OrderForm />} />
        <Route path="/manage-inventory" element={<Inventory />} />
        
      </Routes>
     
    </Suspense>
  );
};

export default Screens;
