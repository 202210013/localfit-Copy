import { Routes } from '@angular/router';
import { LoginECommComponent } from './login/login.component';
import { RegisterECommComponent } from './register/register.component';
import { AuthGuard } from './guards/auth.guard';
import { ProductComponent } from './product/product.component';
import { CartComponent } from './cart/cart.component';
import { AllProductsComponent } from './product-listing/product-listing.component';
import { ProductsMainComponent } from './product-main/product-main.component';
import { MessageComponent } from './message/message.component';
import { AdminComponent } from './admin/admin.component'; 
import { LoginECommComponent as AdminLoginComponent } from './admin-login/admin-login.component';
import { OrdersComponent } from './orders/orders.component';

export const routes: Routes = [
    { path: '', redirectTo: 'product-main', pathMatch: 'full' },
    { path: 'product-listing', component: AllProductsComponent, canActivate: [AuthGuard] },
    { path: 'cart', component: CartComponent, canActivate: [AuthGuard] },
    { path: 'product', component: ProductComponent, canActivate: [AuthGuard] },
    { path: 'login', component: LoginECommComponent },
    { path: 'admin-login', component: AdminLoginComponent },
    { path: 'register', component: RegisterECommComponent },
    { path: 'messages', component: MessageComponent, canActivate: [AuthGuard] },
    { path: 'admin', component: AdminComponent, canActivate: [AuthGuard] },
    { path: 'orders', component: OrdersComponent },
    { path: '', component: ProductsMainComponent }
];
