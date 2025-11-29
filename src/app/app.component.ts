import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { LoginECommComponent } from './login/login.component';
import { RegisterECommComponent } from './register/register.component';
import { BodyComponent } from './body/body.component';
import { ProductComponent } from './product/product.component';
import { CartComponent } from './cart/cart.component';
import { AllProductsComponent } from './product-listing/product-listing.component';
import { ProductsMainComponent } from './product-main/product-main.component';


@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet,
    LoginECommComponent,
    RegisterECommComponent,
    BodyComponent,
    ProductComponent,
    CartComponent,
    AllProductsComponent,
    ProductsMainComponent
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'e-comm';
}
