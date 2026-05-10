import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/Layout";
import { HomePage } from "@/pages/Home";
import { ShopPage } from "@/pages/Shop";
import { ProductDetailPage } from "@/pages/ProductDetail";
import { CartPage } from "@/pages/Cart";
import { OrderDetailPage } from "@/pages/OrderDetail";
import { ChatPage } from "@/pages/Chat";
import { TrackPage } from "@/pages/Track";
import { WishlistPage } from "@/pages/Wishlist";
import { GeneratePage } from "@/pages/Generate";
import { BatchPage } from "@/pages/Batch";
import { AdminPage } from "@/pages/Admin";
import { QuickOrderPage } from "@/pages/QuickOrder";
import { LoginPage } from "@/pages/Login";
import { RegisterPage } from "@/pages/Register";
import { AccountPage } from "@/pages/Account";
import NotFound from "@/pages/not-found";
import { queryClient } from "@/lib/queryClient";

function Routes() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/shop" component={ShopPage} />
      <Route path="/p/:slug" component={ProductDetailPage} />
      <Route path="/cart" component={CartPage} />
      <Route path="/orders/:id" component={OrderDetailPage} />
      <Route path="/track" component={TrackPage} />
      <Route path="/wishlist" component={WishlistPage} />
      <Route path="/chat" component={ChatPage} />
      <Route path="/generate" component={GeneratePage} />
      <Route path="/batch" component={BatchPage} />
      <Route path="/admin" component={AdminPage} />
      <Route path="/quick-order" component={QuickOrderPage} />
      <Route path="/login" component={LoginPage} />
      <Route path="/register" component={RegisterPage} />
      <Route path="/account" component={AccountPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Layout>
            <Routes />
          </Layout>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
