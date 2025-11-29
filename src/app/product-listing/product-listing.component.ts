import { Component, OnInit } from '@angular/core';
import { Product } from '../models/product.model';
import { FormGroup, FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ProductService } from '../services/e-comm.service';
import { CommonModule } from '@angular/common';
import { Cart } from '../models/cart.models';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { environment } from '../../environments/environment';


@Component({
  selector: 'app-product-listing',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './product-listing.component.html',
  styleUrls: ['./product-listing.component.css'],
})
export class AllProductsComponent implements OnInit {
  products: Product[] | undefined;
  allProducts: Product[] | undefined;
  productForm: FormGroup = new FormGroup({});
  baseUrl: string = environment.imageBaseUrl;
  updateMode = false;
  updateForm: FormGroup = new FormGroup({});
  selectedProductId: number | null = null;
  carts: Cart[] | undefined;

  imageUrl = '';
  imageAlt = '';
  isModalOpen = false;
  selectedProduct: Product | undefined;

  categories = [
  
  ];
  filteredProducts: Product[] | undefined;
  selectedCategory: string | null = null;

  searchTerm: string = ''; // <-- Add this

  unreadMessages: number = 0; // Add this property

  readyForPickupCount: number = 0; // Counter for ready for pickup orders

  userPostedProducts: Product[] = []; // Add this property to store products posted by the user

  largeAdImages: string[] = [
    'https://i.ibb.co/fGG71QSq/476456511-640897084960800-2564012019781491129-n.jpg',
    'https://i.postimg.cc/JhHbXV7b/IMG-7144.jpg',
    'https://i.postimg.cc/t4N0HwGN/IMG-7141.jpg',
  ];
  currentAdIndex: number = 0;
  adInterval: any;

  openModal(product: Product) {
    this.selectedProduct = product;
    this.selectedSize = ''; // Reset size selection when opening modal
    this.selectedPickupDate = ''; // Reset pickup date selection when opening modal
    this.isModalOpen = true;
  }

  selectProduct(product: Product) {
    this.selectedProduct = product;
    this.selectedSize = ''; // Reset size selection when selecting product
    this.selectedPickupDate = ''; // Reset pickup date selection when selecting product
  }

  closeModal() {
    this.isModalOpen = false;
    this.selectedProduct = undefined;
    this.selectedSize = ''; // Reset size selection when closing modal
    this.selectedPickupDate = ''; // Reset pickup date selection when closing modal
  }


  constructor(private productService: ProductService, public authService: AuthService, private router: Router) { }

  ngOnInit(): void {
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
    this.getUnreadMessages();
    this.getReadyForPickupCount(); // Get ready for pickup orders count
    this.getUserPostedProducts(); // Fetch products posted by the current user
    this.selectedCategory = 'all';
    this.startAdSlideshow();
    
    // Initialize pickup date range (today + 30 days)
    this.initializeDateRange();
  }
  
  initializeDateRange(): void {
    const today = new Date();
    const maxDate = new Date();
    maxDate.setDate(today.getDate() + 30);
    
    this.minDate = today.toISOString().split('T')[0];
    this.maxDate = maxDate.toISOString().split('T')[0];
  }
  
  getMessage() {
    throw new Error('Method not implemented.');
  }

  goToMessege() {
    this.router.navigate(['/messages']);
  }
  goToCart() {
    this.router.navigate(['/cart']);
  }

  goToProduct() {
    this.router.navigate(['/product']);
  }
  goToOrders() {
    this.router.navigate(['/orders']);
  }

  scrollToProducts() {
    const element = document.getElementById('products-section');
    if (element) {
      element.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start',
        inline: 'nearest'
      });
    }
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
      this.authService.logout().subscribe(() => {
        // Ensure all relevant localStorage is cleared
        localStorage.removeItem('token');
        localStorage.removeItem('userId');
        localStorage.removeItem('user_email');
        // Optionally: localStorage.clear();

        Swal.fire({
          icon: 'success',
          title: 'Logged out!',
          showConfirmButton: false,
          timer: 1200
        });
        this.router.navigate(['/']);  // Redirect to landing page
      });
    }
  });
}

  getImageUrl(image: string): string {
    if (!image) return this.baseUrl + 'placeholder.jpg';
    
    // Handle different image path formats
    let imagePath = image;
    
    // If it's a full file path (old format), extract just the filename
    if (image.includes('\\') || image.includes('/')) {
      // Extract filename from full path
      imagePath = image.split(/[\\\/]/).pop() || image;
    }
    
    // If it's already just a filename, use it as is
    const finalUrl = this.baseUrl + imagePath;
    
    // console.log('🖼️ Image URL construction:', { 
    //   original: image, 
    //   processed: imagePath, 
    //   final: finalUrl 
    // });
    
    return finalUrl;
  }

  getProducts(): void {
    this.productService.getProducts().subscribe((response: any) => {
      // Process products to parse available_sizes from string to array
      this.products = response.records.map((product: any) => {
        return this.processProductSizes(product);
      });
    });
  }

  filterByCategory(category: string) {
    this.selectedCategory = category;
    if (category === 'all' && this.allProducts) {
      this.filteredProducts = this.allProducts;
    } else if (this.allProducts) {
      this.filteredProducts = this.allProducts.filter(product => product.category === category);
    }
  }

  getAllProducts(): void {
  this.productService.getAllProducts().subscribe((response: any) => {
    console.log('API products:', response.records); // <-- Add this line
    // Process products to parse available_sizes from string to array
    this.allProducts = response.records.map((product: any) => {
      return this.processProductSizes(product);
    });
    this.filteredProducts = this.allProducts;
  });
}

  getCarts(): void {
    this.productService.getCarts().subscribe((response: any) => {
      this.carts = response.records;
    });
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

  // Remove static sizes array - now we'll use product's available sizes
  selectedSize: string = ''; // No default size - force user to select

  // Process product to parse available_sizes from string to array if needed
  processProductSizes(product: any): any {
    if (product.available_sizes && typeof product.available_sizes === 'string') {
      try {
        // Try to parse as JSON array string
        product.available_sizes = JSON.parse(product.available_sizes);
      } catch {
        // If parsing fails, try to split by comma or other delimiters
        if (product.available_sizes.includes(',')) {
          product.available_sizes = product.available_sizes.split(',').map((s: string) => s.trim());
        } else if (product.available_sizes.includes('|')) {
          product.available_sizes = product.available_sizes.split('|').map((s: string) => s.trim());
        } else {
          // If no delimiters, treat as single size
          product.available_sizes = [product.available_sizes.trim()];
        }
      }
    } else if (!product.available_sizes) {
      // If no sizes are defined, set empty array
      product.available_sizes = [];
    }
    return product;
  }

  // Get available sizes for any product (used in template)
  getProductSizes(product: any): string[] {
    if (product && product.available_sizes) {
      // If it's already an array, return it
      if (Array.isArray(product.available_sizes)) {
        return product.available_sizes;
      }
      // If it's still a string, process it
      if (typeof product.available_sizes === 'string') {
        const processedProduct = this.processProductSizes(product);
        return processedProduct.available_sizes;
      }
    }
    return []; // Return empty array if no sizes available
  }

  // Get available sizes for the currently selected product
  getAvailableSizes(): string[] {
    if (this.selectedProduct && this.selectedProduct.available_sizes) {
      return this.selectedProduct.available_sizes;
    }
    return []; // Return empty array if no sizes available
  }

  // Check if the product has any available sizes
  hasAvailableSizes(): boolean {
    return this.getAvailableSizes().length > 0;
  }

  // Get all sizes (both in stock and out of stock) for the currently selected product
  getAllSizes(): Array<{size: string, inStock: boolean, quantity: number}> {
    if (!this.selectedProduct) return [];
    
    const sizesWithStock = this.getSizesWithStock(this.selectedProduct);
    return sizesWithStock.map(sizeInfo => ({
      size: sizeInfo.size,
      inStock: sizeInfo.inStock,
      quantity: sizeInfo.quantity
    }));
  }

  // Check if the currently selected size is in stock
  isSizeInStock(): boolean {
    if (!this.selectedSize || !this.selectedProduct) return true; // Default to true if no size selected
    
    const sizesWithStock = this.getSizesWithStock(this.selectedProduct);
    const selectedSizeInfo = sizesWithStock.find(s => s.size === this.selectedSize);
    
    return selectedSizeInfo ? selectedSizeInfo.inStock : false;
  }

  // Handle size change event
  onSizeChange(): void {
    // If the selected size is out of stock, clear the pickup date
    if (!this.isSizeInStock()) {
      this.selectedPickupDate = '';
    }
  }

  // Pickup date properties
  selectedPickupDate: string = '';
  minDate: string = '';
  maxDate: string = '';

  addProductToCart(productId: number, quantity: number, size: string = '', pickupDate: string = ''): void {
    // Validate that size is selected
    if (!size || size.trim() === '') {
      Swal.fire({
        icon: 'warning',
        title: 'Size Required!',
        text: 'Please select a size before adding to cart.',
        timer: 2000,
        showConfirmButton: false
      });
      return;
    }

    // Check if size is in stock
    const sizeInStock = this.isSizeInStock();

    // Validate that pickup date is selected only if size is in stock
    if (sizeInStock && (!pickupDate || pickupDate.trim() === '')) {
      Swal.fire({
        icon: 'warning',
        title: 'Pickup Date Required!',
        text: 'Please select a pickup date before adding to cart.',
        timer: 2000,
        showConfirmButton: false
      });
      return;
    }

    // If size is not in stock, show confirmation dialog
    if (!sizeInStock) {
      Swal.fire({
        title: 'Order for Production',
        html: `
          <p>This size is currently out of stock.</p>
          <p><strong>Your order will be marked as "Pending Production"</strong></p>
          <p>The admin will process your order once the item is reproduced.</p>
          <p>You will be notified when it's ready for pickup.</p>
        `,
        icon: 'info',
        showCancelButton: true,
        confirmButtonText: 'Proceed with Order',
        cancelButtonText: 'Cancel',
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33'
      }).then((result) => {
        if (result.isConfirmed) {
          this.proceedWithCartAdd(productId, quantity, size, pickupDate || '');
        }
      });
      return;
    }

    // Check if same product with same size already exists in cart
    this.proceedWithCartAdd(productId, quantity, size, pickupDate);
  }

  // Separate method to handle the actual cart addition
  private proceedWithCartAdd(productId: number, quantity: number, size: string, pickupDate: string): void {
    const existingCartItem = this.carts?.find(cart => 
      cart.product_id === productId && cart.size === size
    );

    if (existingCartItem) {
      existingCartItem.quantity += quantity;
      this.updateCart(existingCartItem);
      const message = pickupDate 
        ? `Product quantity updated in your cart (Size: ${size}, Pickup: ${pickupDate}).`
        : `Product quantity updated in your cart (Size: ${size}). Order marked for production.`;
      
      Swal.fire({
        icon: 'success',
        title: 'Cart Updated!',
        text: message,
        timer: 1200,
        showConfirmButton: false
      }).then(() => {
        // Redirect to cart after successful update
        this.goToCart();
      });
    } else {
      // Pass productId, quantity, size, and pickup date to the service
      this.productService.createCart(productId, quantity, size, pickupDate).subscribe((response: any) => {
        this.getCarts();
        const message = pickupDate 
          ? `Product added to your cart (Size: ${size}, Pickup: ${pickupDate}).`
          : `Product added to your cart (Size: ${size}). Order marked for production.`;
        
        Swal.fire({
          icon: 'success',
          title: 'Added to Cart!',
          text: message,
          timer: 1200,
          showConfirmButton: false
        }).then(() => {
          // Redirect to cart after successful addition
          this.goToCart();
        });
      });
    }
  }

  buyNow(productId: number, quantity: number, size: string = '', pickupDate: string = ''): void {
    // Validate that size is selected
    if (!size || size.trim() === '') {
      Swal.fire({
        icon: 'warning',
        title: 'Size Required!',
        text: 'Please select a size before proceeding to checkout.',
        timer: 2000,
        showConfirmButton: false
      });
      return;
    }

    // Check if size is in stock
    const sizeInStock = this.isSizeInStock();

    // Validate that pickup date is selected only if size is in stock
    if (sizeInStock && (!pickupDate || pickupDate.trim() === '')) {
      Swal.fire({
        icon: 'warning',
        title: 'Pickup Date Required!',
        text: 'Please select a pickup date before proceeding to checkout.',
        timer: 2000,
        showConfirmButton: false
      });
      return;
    }

    // If size is not in stock, show confirmation dialog
    if (!sizeInStock) {
      Swal.fire({
        title: 'Order for Production',
        html: `
          <p>This size is currently out of stock.</p>
          <p><strong>Your order will be marked as "Pending Production"</strong></p>
          <p>The admin will process your order once the item is reproduced.</p>
          <p>You will be notified when it's ready for pickup.</p>
        `,
        icon: 'info',
        showCancelButton: true,
        confirmButtonText: 'Proceed with Order',
        cancelButtonText: 'Cancel',
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33'
      }).then((result) => {
        if (result.isConfirmed) {
          this.proceedWithBuyNow(productId, quantity, size, pickupDate || '');
        }
      });
      return;
    }

    this.proceedWithBuyNow(productId, quantity, size, pickupDate);
  }

  private proceedWithBuyNow(productId: number, quantity: number, size: string, pickupDate: string): void {
    // Show loading indicator
    Swal.fire({
      title: 'Processing...',
      text: 'Adding item to order summary',
      allowOutsideClick: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    // Check if same product with same size already exists in cart
    const existingCartItem = this.carts?.find(cart => 
      cart.product_id === productId && cart.size === size
    );

    if (existingCartItem) {
      // If exists, update quantity and proceed to order summary
      existingCartItem.quantity += quantity;
      this.updateCart(existingCartItem);
      this.closeModal();
      this.navigateToOrderSummary();
    } else {
      // Add to cart and then proceed to order summary
      this.productService.createCart(productId, quantity, size, pickupDate).subscribe((response: any) => {
        this.getCarts();
        this.closeModal();
        // Navigate to cart page as order summary with buy now indicator
        this.navigateToOrderSummary();
      });
    }
  }

  private navigateToOrderSummary(): void {
    // Close loading indicator
    Swal.close();
    
    // Navigate to cart page with buy now query parameter to show summary section immediately
    this.router.navigate(['/cart'], { 
      queryParams: { 
        buynow: 'true',
        action: 'summary',
        directCheckout: 'true'
      } 
    });
  }

  updateCart(cart: Cart): void {
    this.productService.updateCart(cart.id, cart).subscribe((response: any) => {
      console.log('Cart updated:', response);
      this.getCarts();
    });
  }

  deleteCart(cartId: number): void {
    this.productService.deleteCart(cartId).subscribe((response: any) => {
      console.log('Cart deleted:', response);
      this.getCarts();
    });
  }

  calculateTotal(): number {
    return this.carts?.reduce((total, cart) => total + cart.price * cart.quantity, 0) ?? 0;
  }

  onSearch() {
    const term = this.searchTerm.trim().toLowerCase();
    if (term === '') {
      this.filteredProducts = this.allProducts;
    } else {
      this.filteredProducts = this.allProducts?.filter(product =>
        product.name.toLowerCase().includes(term)
      );
    }
  }

  // Add a method to fetch unread messages
  getUnreadMessages(): void {
    this.productService.getUnreadMessages().subscribe({
      next: (response: any) => {
        console.log('Unread messages API response:', response);
        // Adjust this line based on your actual API response structure:
        this.unreadMessages = response.count || 0;
      },
      error: (error: any) => {
        console.error('Error fetching unread messages:', error);
        this.unreadMessages = 0;
      }
    });
  }

  // Add a method to fetch ready for pickup orders count
  getReadyForPickupCount(): void {
    const currentUserEmail = localStorage.getItem('user_email');
    if (!currentUserEmail) {
      this.readyForPickupCount = 0;
      return;
    }

    // Get orders from the same service used in orders component
    this.productService.getMyOrders().subscribe({
      next: (response: any) => {
        const allOrders = Array.isArray(response) ? response : (response.records || []);
        
        // Filter for current user's ready for pickup orders
        const readyForPickupOrders = allOrders.filter((order: any) => 
          order.customer === currentUserEmail && order.status === 'ready-for-pickup'
        );
        
        this.readyForPickupCount = readyForPickupOrders.length;
      },
      error: (error: any) => {
        console.error('Error fetching ready for pickup orders:', error);
        this.readyForPickupCount = 0;
      }
    });
  }

  // Add a method to fetch products posted by the current user
  getUserPostedProducts(): void {
    this.productService.getUserPostedProducts().subscribe({
      next: (response: any) => {
        console.log('User posted products response:', response);
        // Handle different response structures
        if (response && response.records) {
          this.userPostedProducts = response.records;
        } else if (response && Array.isArray(response)) {
          this.userPostedProducts = response;
        } else if (response && response.data) {
          this.userPostedProducts = response.data;
        } else {
          this.userPostedProducts = [];
        }
        console.log('User posted products count:', this.userPostedProducts.length);
      },
      error: (error) => {
        console.error('Error fetching user posted products:', error);
        this.userPostedProducts = [];
      }
    });
  }

getProductAuthor(product: any): string {
  // If no product is passed (empty object), return current user's name for welcome banner
  if (!product || Object.keys(product).length === 0) {
    return localStorage.getItem('user_name') || 
           localStorage.getItem('username') || 
           localStorage.getItem('user_email')?.split('@')[0] || 
           'User';
  }
  
  // For actual products, return the product's seller/author
  return product.seller_name || product.user_name || 'No Name';
}

startAdSlideshow() {
  this.adInterval = setInterval(() => {
    this.currentAdIndex = (this.currentAdIndex + 1) % this.largeAdImages.length;
  }, 3001); // Change image every 3 seconds
}

ngOnDestroy(): void {
  if (this.adInterval) {
    clearInterval(this.adInterval);
  }
}

// Quantity display methods
getProductSizeQuantities(product: Product): { [size: string]: number } {
  if (!product.size_quantities) {
    return {};
  }
  
  // If it's already an object, return it
  if (typeof product.size_quantities === 'object') {
    return product.size_quantities;
  }
  
  // If it's a JSON string, parse it
  if (typeof product.size_quantities === 'string') {
    try {
      const parsed = JSON.parse(product.size_quantities);
      return typeof parsed === 'object' ? parsed : {};
    } catch (e) {
      console.error('Error parsing size_quantities:', e);
      return {};
    }
  }
  
  return {};
}

// Get total quantity for product
getTotalQuantity(product: Product): number {
  // Calculate from size_quantities if available, otherwise use quantity field
  if (product.size_quantities && typeof product.size_quantities === 'object') {
    return Object.values(product.size_quantities).reduce((total: number, qty: number) => total + (qty || 0), 0);
  } else {
    // If quantity is a string (JSON), try to parse it; otherwise use the number
    let quantity = product.quantity || 0;
    if (typeof quantity === 'string') {
      try {
        const parsed = JSON.parse(quantity);
        if (typeof parsed === 'object') {
          return Object.values(parsed).reduce((total: number, qty: unknown) => total + (Number(qty) || 0), 0);
        }
        return Number(parsed) || 0;
      } catch (e) {
        return 0;
      }
    }
    return Number(quantity) || 0;
  }
}

// Get sizes with stock information
getSizesWithStock(product: Product): { size: string, quantity: number, inStock: boolean }[] {
  const sizeQuantities = this.getProductSizeQuantities(product);
  const availableSizes = product.available_sizes || [];
  
  return availableSizes.map(size => ({
    size,
    quantity: sizeQuantities[size] || 0,
    inStock: (sizeQuantities[size] || 0) > 0
  }));
}

// Check if product has any stock
hasStock(product: Product): boolean {
  return this.getTotalQuantity(product) > 0;
}

// Get stock status for product
getStockStatus(product: Product): 'out-of-stock' | 'low-stock' | 'in-stock' {
  const totalQty = this.getTotalQuantity(product);
  if (totalQty <= 0) return 'out-of-stock';
  if (totalQty < 5) return 'low-stock';
  return 'in-stock';
}

}