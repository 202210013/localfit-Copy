import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Product } from '../models/product.model';
import { FormGroup, FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ProductService } from '../services/e-comm.service';
import { CommonModule } from '@angular/common';
import { Cart } from '../models/cart.models';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';


@Component({
  selector: 'app-product-main',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './product-main.component.html',
  styleUrls: ['./product-main.component.css'],
})
export class ProductsMainComponent implements OnInit {
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

  // Footer modals
  isTermsModalOpen = false;
  isPrivacyModalOpen = false;

  
  filteredProducts: Product[] | undefined;
  selectedCategory: string | null = null;

  // Carousel properties
  currentSlide: number = 0;
  productsPerSlide: number = 3; // Default for desktop
  totalSlides: number = 0;
  maxCarouselProducts: number = 6; // Limit carousel to 6 products

  deferredPrompt: any = null;

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

  // Footer modal methods
  openTermsModal() {
    this.isTermsModalOpen = true;
  }

  closeTermsModal() {
    this.isTermsModalOpen = false;
  }

  openPrivacyModal() {
    this.isPrivacyModalOpen = true;
  }

  closePrivacyModal() {
    this.isPrivacyModalOpen = false;
  }


  constructor(
    private productService: ProductService, 
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) { }

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

    this.getAllProducts1();
    this.selectedCategory = 'all';

    // Only access window in browser environment (not during SSR)
    if (isPlatformBrowser(this.platformId)) {
      window.addEventListener('beforeinstallprompt', (event: any) => {
        event.preventDefault();
        this.deferredPrompt = event;
      });
      
      // Load visitor counter script
      this.loadVisitorCounterScript();
    }
  }

  // Load visitor counter script dynamically
  private loadVisitorCounterScript(): void {
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = 'https://www.counter12.com/ad.js?id=8xZ2A5z2AZCCA7wy';
    script.async = true;
    document.body.appendChild(script);
  }

  goToCart() {
    this.router.navigate(['/cart']);
  }

  goToProduct() {
    this.router.navigate(['/product']);
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }

  goToRegister() {
    this.router.navigate(['/register']);
  }

  // getImageUrl(image: string): string {
  //   return this.baseUrl + image;
  // }

  getImageUrl(image: string): string {
    if (!image) return this.baseUrl + 'placeholder.jpg';
    
    // Extract filename from any path format
    const filename = image.split('/').pop()?.split('\\').pop() || image;
    
    // Construct URL with base URL + filename
    return this.baseUrl + filename.trim();
  }

  filterByCategory(category: string) {
    this.selectedCategory = category;
    if (category === 'all' && this.allProducts) {
      this.filteredProducts = this.allProducts;
    } else if (this.allProducts) {
      this.filteredProducts = this.allProducts.filter(product => product.category === category);
    }
  }

  getAllProducts1(): void {
    this.productService.getAllProducts1().subscribe({
      next: (response: any) => {
        console.log('API response:', response); // Debug: log the API response
        this.allProducts = response.records;
        this.filteredProducts = this.allProducts;
      },
      error: (error) => {
        console.error('API error:', error); // Debug: log any error
        this.allProducts = [];
        this.filteredProducts = [];
      }
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
        this.getAllProducts1();
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
        this.getAllProducts1();
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
      this.getAllProducts1();
    });
  }

  addProductToCart(productId: number, quantity: number): void {
    this.productService.createCart(productId, quantity).subscribe((response: any) => {
      console.log('Cart created:', response);
    });
  }

  installPWA() {
    if (this.deferredPrompt) {
      this.deferredPrompt.prompt();
      this.deferredPrompt.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the install prompt');
        } else {
          console.log('User dismissed the install prompt');
        }
        this.deferredPrompt = null;
      });
    }
  }

  // Carousel methods
  getCarouselProducts(): Product[] {
    if (!this.filteredProducts) return [];
    return this.filteredProducts.slice(0, this.maxCarouselProducts);
  }

  nextSlide(): void {
    const carouselProducts = this.getCarouselProducts();
    if (carouselProducts && this.currentSlide < carouselProducts.length - this.getProductsPerSlide()) {
      this.currentSlide++;
    }
  }

  previousSlide(): void {
    if (this.currentSlide > 0) {
      this.currentSlide--;
    }
  }

  goToSlide(slideIndex: number): void {
    const carouselProducts = this.getCarouselProducts();
    if (carouselProducts.length > 0) {
      const maxSlide = Math.ceil(carouselProducts.length / this.getProductsPerSlide()) - 1;
      this.currentSlide = Math.min(slideIndex, maxSlide);
    }
  }

  getProductsPerSlide(): number {
    // Responsive products per slide based on screen size
    if (typeof window !== 'undefined') {
      if (window.innerWidth < 768) {
        return 1; // Mobile: 1 product per slide
      } else if (window.innerWidth < 1200) {
        return 2; // Tablet: 2 products per slide
      } else {
        return 3; // Desktop: 3 products per slide
      }
    }
    return 3; // Default fallback
  }

  getIndicators(): number[] {
    const carouselProducts = this.getCarouselProducts();
    if (carouselProducts.length === 0) return [];
    const totalSlides = Math.ceil(carouselProducts.length / this.getProductsPerSlide());
    return Array(totalSlides).fill(0).map((_, i) => i);
  }

  goToProducts(): void {
    this.router.navigate(['/product-listing']);
  }
}