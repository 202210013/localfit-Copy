import { Component, OnInit } from '@angular/core';
import { Product } from '../models/product.model';
import { FormGroup, FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ProductService } from '../services/e-comm.service';
import { CommonModule } from '@angular/common';
import { Cart } from '../models/cart.models';
import { AuthService } from '../services/auth.service';
import { Router, ActivatedRoute } from '@angular/router';
import Swal from 'sweetalert2';
import { environment } from '../../environments/environment';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './cart.component.html',
  styleUrls: ['./cart.component.css'],
})
export class CartComponent implements OnInit {
  products: Product[] | undefined;
  allProducts: Product[] | undefined;
  productForm: FormGroup = new FormGroup({});
  baseUrl: string = environment.imageBaseUrl;
  

  updateMode = false;
  updateForm: FormGroup = new FormGroup({});
  selectedProductId: number | null = null;
  carts: Cart[] | undefined;
  selectAll: boolean = false;
  selectedCarts: Cart[] = [];

  imageUrl = '';
  imageAlt = '';
  isModalOpen = false;
  selectedProduct: Product | undefined;

  selectedCartId: number | null = null;

  // Buy now flow detection
  isBuyNowFlow: boolean = false;
  isOrderSummaryMode: boolean = false;
  isCheckoutLoading: boolean = false; // Add loading state

  setSelectedCartId(cartId: number): void {
    this.selectedCartId = cartId;
  }



  openModal(product: Product) {
    this.selectedProduct = product;
    this.isModalOpen = true;
  }

  selectProduct(product: Product) {
    this.selectedProduct = product;
  }


  closeModal() {
    this.isModalOpen = false;
    this.selectedProduct = undefined;
  }

  selectAllCarts(event: any): void {
    this.carts?.forEach(cart => cart.selected = event.target.checked);
    this.selectedCarts = this.carts?.filter(cart => cart.selected) ?? [];
    this.calculateTotal();
  }

  updateSelectedCarts(cart: Cart): void {
    this.selectedCarts = this.carts?.filter(c => c.selected) ?? [];
    this.calculateTotal();
  }


  constructor(private productService: ProductService, public authService: AuthService, private router: Router, private route: ActivatedRoute) { }

  ngOnInit(): void {
    // Check if this is a buy now flow
    this.route.queryParams.subscribe(params => {
      this.isBuyNowFlow = params['buynow'] === 'true';
      this.isOrderSummaryMode = params['action'] === 'summary' || params['action'] === 'checkout';
      const directCheckout = params['directCheckout'] === 'true';
      
      if (this.isBuyNowFlow && directCheckout) {
        // Automatically select only the most recently added item for direct checkout
        setTimeout(() => {
          this.selectMostRecentItemForCheckout();
        }, 500); // Delay to ensure carts are loaded
      } else if (this.isBuyNowFlow && this.isOrderSummaryMode) {
        // For regular buy now flow - no popup needed
        setTimeout(() => {
          // Order summary ready - no alert needed
        }, 500);
      }
    });

    this.productForm = new FormGroup({
      name: new FormControl(''),
      price: new FormControl(''),
      description: new FormControl(''),
      image: new FormControl(''),
    });

    this.updateForm = new FormGroup({
      name: new FormControl(''),
      price: new FormControl(''),
      description: new FormControl(''),
      image: new FormControl(''),
    });

    this.getProducts();
    this.getAllProducts();
    this.getCarts();
  }

  goToMessege() {
    this.router.navigate(['/messages']);
  }
  
  goToCart() {
    this.router.navigate(['/cart']);
  }

  continueShopping() {
    // Clear buy now mode and go back to product listing
    this.isBuyNowFlow = false;
    this.isOrderSummaryMode = false;
    this.router.navigate(['/product-listing']);
  }

  clearOrderSummaryMode() {
    // Clear query parameters to exit order summary mode
    this.router.navigate(['/cart']);
  }

  goToProduct() {
    this.router.navigate(['/product']);
  }

  goToProductListing() {
    this.router.navigate(['/product-listing']);
  }

  logout() {
    Swal.fire({
      title: 'Are you sure?',
      text: 'You will be logged out of your account.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, logout'
    }).then((result) => {
      if (result.isConfirmed) {
        this.authService.logout();
        Swal.fire({
          icon: 'success',
          title: 'Logged out!',
          showConfirmButton: false,
          timer: 1200
        });
        this.router.navigate(['/']);  // Redirect to landing page
      }
    });
  }

  getImageUrl(image: string): string {
    if (!image) return this.baseUrl + 'placeholder.jpg';
    
    // Extract filename from any path format
    const filename = image.split('/').pop()?.split('\\').pop() || image;
    
    // Construct URL with base URL + filename
    return this.baseUrl + filename.trim();
  }

  getProducts(): void {
    this.productService.getProducts().subscribe((response: any) => {
      this.products = response.records;
    });
  }

  getAllProducts(): void {
    this.productService.getAllProducts().subscribe((response: any) => {
      this.allProducts = response.records;
    });
  }

  getCarts(): void {
    this.productService.getCarts().subscribe((response: any) => {
      this.carts = response.records;
      if (this.carts) {
        this.carts.sort((a, b) => b.quantity - a.quantity);
      }
    });
  }

  selectMostRecentItemForCheckout(): void {
    if (this.carts && this.carts.length > 0) {
      // For Buy Now flow, only select the most recently added item (highest ID)
      const mostRecentItem = this.carts.reduce((latest, current) => 
        current.id > latest.id ? current : latest
      );
      
      // Clear all selections first
      this.carts.forEach(cart => cart.selected = false);
      
      // Select only the most recent item
      mostRecentItem.selected = true;
      this.selectedCarts = [mostRecentItem];
      this.selectAll = false;
      this.calculateTotal();
      
      // Scroll to summary section and auto-click checkout button
      setTimeout(() => {
        this.scrollToSummarySection();
        
        // Auto-click the checkout button after a short delay
        setTimeout(() => {
          this.autoClickCheckoutButton();
        }, 1000); // Wait 1 second after scrolling to auto-click
      }, 500);
    }
  }

  autoClickCheckoutButton(): void {
    const checkoutBtn = document.querySelector('.checkout-btn') as HTMLButtonElement;
    if (checkoutBtn && !checkoutBtn.disabled) {
      checkoutBtn.click();
    }
  }

  scrollToSummarySection(): void {
    const summaryElement = document.querySelector('.summary-section');
    if (summaryElement) {
      summaryElement.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
    }
  }

  checkout(): void {
  if (this.carts) {
    this.selectedCarts = this.carts.filter(cart => cart.selected);
    if (this.selectedCarts.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'No items selected',
        text: 'Please select items to checkout.',
        timer: 1500,
        showConfirmButton: false
      });
      return;
    }

    // Start loading
    this.isCheckoutLoading = true;

    // Prepare order data
    const orders = this.selectedCarts.map(cart => ({
      customer: localStorage.getItem('user_email') || 'guest',
      product: cart.name,
      quantity: cart.quantity,
      size: cart.size || 'M', // Include size information
      pickup_date: cart.pickup_date, // Include customer-selected pickup date
      status: 'pending'
    }));

    console.log('=== CHECKOUT DEBUG ===');
    console.log('Selected carts:', this.selectedCarts);
    console.log('Orders being sent:', orders);
    console.log('Cart sizes:', this.selectedCarts.map(cart => ({ name: cart.name, size: cart.size })));

    // Send orders to backend
    this.productService.createOrders(orders).subscribe(
      (response: any) => {
        // Stop loading
        this.isCheckoutLoading = false;
        
        Swal.fire({
          icon: 'success',
          title: 'Order placed!',
          text: 'Awaiting admin approval.',
          timer: 1500,
          showConfirmButton: false
        });
        // Delete checked-out items from cart
        this.selectedCarts.forEach(cart => {
          this.deleteCart(cart.id, true);
        });
        // Optionally refresh cart after deletions
        setTimeout(() => this.getCarts(), 500);
      },
      (error: any) => {
        // Stop loading on error
        this.isCheckoutLoading = false;
        
        Swal.fire({
          icon: 'error',
          title: 'Failed to place order.',
          text: 'Please try again.',
          timer: 1500,
          showConfirmButton: false
        });
        console.error(error);
      }
    );
  }
}

  onFileChange(event: any): void {
    if (event.target.files.length > 0) {
      const file = event.target.files[0];
      this.productForm.patchValue({
        image: file
      });
      if (this.updateMode) {
        this.updateForm.patchValue({
          image: file
        });
      }
    }
  }

  createProduct(): void {
    if (this.productForm.valid) {
      const formData = new FormData();
      formData.append('name', this.productForm.value.name);
      formData.append('price', this.productForm.value.price);
      formData.append('description', this.productForm.value.description);
      formData.append('image', this.productForm.value.image);

      this.productService.createProduct(formData).subscribe((response: any) => {
        console.log('Product created:', response);
        this.getProducts();
        this.getAllProducts();
      }, (error: any) => {
        console.error('Error creating product:', error);
      });
    } else {
      console.error('Form is invalid');
    }
  }

  readOneProduct(productId: number): void {
    this.productService.readOneProduct(productId).subscribe((response: any) => {
      console.log(response);
    });
  }

  updateProduct(): void {
    if (this.updateForm.valid && this.selectedProductId !== null) {
      const formData = new FormData();
      formData.append('name', this.updateForm.value.name);
      formData.append('price', this.updateForm.value.price);
      formData.append('description', this.updateForm.value.description);
      if (this.updateForm.value.image) {
        formData.append('image', this.updateForm.value.image);
      }

      this.productService.updateProduct(this.selectedProductId, formData).subscribe((response: any) => {
        console.log('Product updated:', response);
        this.getProducts();
        this.getCarts();
        this.getAllProducts();
        this.updateMode = false;
        this.selectedProductId = null;
      }, (error: any) => {
        console.error('Error updating product:', error);
      });
    } else {
      console.error('Form is invalid or no product selected');
    }
  }

  toggleUpdateMode(product: Product) {
    this.updateMode = !this.updateMode;
    this.selectedProductId = product.id;
    if (this.updateMode) {
      this.updateForm.patchValue({
        name: product.name,
        price: product.price,
        description: product.description,
        image: null
      });
    }
  }

  deleteProduct(productId: number): void {
    this.productService.deleteProduct(productId).subscribe((response: any) => {
      console.log('Product deleted:', response);
      this.getProducts();
      this.getCarts();
      this.getAllProducts();
    });
  }

  addProductToCart(productId: number, quantity: number): void {
    this.productService.createCart(productId, quantity).subscribe((response: any) => {
      console.log('Cart created:', response);
      this.getCarts();
    });
  }

  updateCart(cart: Cart): void {
    this.productService.updateCart(cart.id, cart).subscribe((response: any) => {
      console.log('Cart updated:', response);
      this.getCarts();
    });
  }

  // deleteCart(cartId: number): void {
  //   this.productService.deleteCart(cartId).subscribe((response: any) => {
  //     console.log('Cart deleted:', response);
  //     thdeleteis.getCarts();
  //   });
  // }

  deleteCart(cartId: number | null, showOrderMsg: boolean = false): void {
    if (cartId !== null) {
      this.productService.deleteCart(cartId).subscribe((response: any) => {
        console.log('Cart deleted:', response);
        this.getCarts();
        if (showOrderMsg) {
          Swal.fire({
            icon: 'success',
            title: 'Placed Order!',
            text: 'Waiting for the seller approve.',
            timer: 1200,
            showConfirmButton: false
          });
        } else {
          Swal.fire({
            icon: 'success',
            title: 'Deleted!',
            text: 'The item has been removed from your cart.',
            timer: 1200,
            showConfirmButton: false
          });
        }
      });
    }
  }

  confirmDeleteCart(cartId: number) {
  Swal.fire({
    title: 'Are you sure?',
    text: 'Do you want to remove this item from your cart?',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#d33',
    cancelButtonColor: '#3085d6',
    confirmButtonText: 'Yes, delete it'
  }).then((result) => {
    if (result.isConfirmed) {
      this.deleteCart(cartId); // No order message
    }
  });
}

  calculateTotal(): number {
    return this.carts?.reduce((total, cart) => total + cart.price * cart.quantity, 0) ?? 0;
  }

  calculateSelectedTotal(): number {
    return this.carts?.filter(cart => cart.selected)?.reduce((total, cart) => total + cart.price * cart.quantity, 0) ?? 0;
  }
  sortAscending = true;
  sortAscendingSubTotal = true;

sortCartByQuantity(): void {
    if (this.carts) {
      this.carts.sort((a, b) => this.sortAscending ? a.quantity - b.quantity : b.quantity - a.quantity);
      this.sortAscending = !this.sortAscending;
    }
  }

  sortCartBySubTotal(): void {
    if (this.carts) {
      this.carts.forEach(cart => cart.subTotal = cart.price * cart.quantity);
      this.carts.sort((a, b) => this.sortAscendingSubTotal ? a.subTotal - b.subTotal : b.subTotal - a.subTotal);
      this.sortAscendingSubTotal = !this.sortAscendingSubTotal;
    }
  }
}
