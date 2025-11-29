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
    selector: 'app-product',
    standalone: true,
    imports: [CommonModule, FormsModule, ReactiveFormsModule],
    templateUrl: './product.component.html',
    styleUrls: ['./product.component.css'],
})
export class ProductComponent implements OnInit {
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
    fileName = '';
    isModalOpen = false;
    selectedProduct: Product | undefined;
    previewUrl: string | undefined;
    
    // Image preview properties
    createImagePreview: string | null = null;
    editImagePreview: string | null = null;

    // Size management
    availableSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
    selectedSizes: string[] = [];
    editSelectedSizes: string[] = [];
    
    // Size-specific quantities
    sizeQuantities: { [size: string]: number } = {};
    editSizeQuantities: { [size: string]: number } = {};

    // Add categories
    categories = [
        "Electronics",
        "Fashion",
        "Home and Kitchen",
        "Beauty and Personal Care",
        "Health and Household",
        "Sports and Outdoors",
        "Baby Products",
        "Pet Products",
    ];

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
        this.resetForms();
    }

    clearCreateForm() {
        this.productForm.reset({
            name: '',
            price: '',
            description: '',
            image: '',
            category: this.categories[0]
        });
        this.createImagePreview = null;
        this.selectedSizes = [];
        this.sizeQuantities = {};
        this.fileName = '';
        
        // Reset file input
        const fileInput = document.getElementById('productImage') as HTMLInputElement;
        if (fileInput) {
            fileInput.value = '';
        }
    }

    autoResize(event: Event) {
        const textarea = event.target as HTMLTextAreaElement;
        textarea.style.height = 'auto';
        textarea.style.height = textarea.scrollHeight + 'px';
    }

    clearEditForm() {
        this.updateForm.reset({
            name: '',
            price: '',
            description: '',
            image: '',
            category: this.categories[0]
        });
        this.editImagePreview = null;
        this.editSelectedSizes = [];
        this.editSizeQuantities = {};
        this.fileName = '';
        
        // Reset file input
        const fileInput = document.getElementById('editProductImage') as HTMLInputElement;
        if (fileInput) {
            fileInput.value = '';
        }
    }

    resetForms() {
        this.productForm.patchValue({
            name: '',
            price: '',
            description: '',
            image: '',
            category: this.categories[0]
        });
        this.updateForm.patchValue({
            name: '',
            price: '',
            description: '',
            image: '',
            category: this.categories[0]
        });
        this.fileName = '';
        this.previewUrl = undefined;
        this.createImagePreview = null;
        this.editImagePreview = null;
        this.selectedSizes = [];
        this.editSelectedSizes = [];
        this.sizeQuantities = {};
        this.editSizeQuantities = {};
    }

    // Size management methods
    toggleSize(size: string, isEdit: boolean = false) {
        if (isEdit) {
            const index = this.editSelectedSizes.indexOf(size);
            if (index > -1) {
                this.editSelectedSizes.splice(index, 1);
                delete this.editSizeQuantities[size]; // Remove quantity when size is deselected
            } else {
                this.editSelectedSizes.push(size);
                this.editSizeQuantities[size] = 1; // Default quantity when size is selected
            }
        } else {
            const index = this.selectedSizes.indexOf(size);
            if (index > -1) {
                this.selectedSizes.splice(index, 1);
                delete this.sizeQuantities[size]; // Remove quantity when size is deselected
            } else {
                this.selectedSizes.push(size);
                this.sizeQuantities[size] = 1; // Default quantity when size is selected
            }
        }
    }

    isSizeSelected(size: string, isEdit: boolean = false): boolean {
        return isEdit ? this.editSelectedSizes.includes(size) : this.selectedSizes.includes(size);
    }

    // Handle quantity changes for specific size
    onSizeQuantityChange(size: string, quantity: number, isEdit: boolean = false) {
        const qty = Math.max(0, Math.floor(quantity || 0)); // Ensure non-negative integer
        if (isEdit) {
            this.editSizeQuantities[size] = qty;
        } else {
            this.sizeQuantities[size] = qty;
        }
    }

    // Get quantity for a specific size
    getSizeQuantity(size: string, isEdit: boolean = false): number {
        return isEdit ? (this.editSizeQuantities[size] || 1) : (this.sizeQuantities[size] || 1);
    }

    // Calculate total quantity from all sizes
    getTotalQuantity(isEdit: boolean = false): number {
        const quantities = isEdit ? this.editSizeQuantities : this.sizeQuantities;
        
        if (!quantities || typeof quantities !== 'object') {
            return 0;
        }
        
        return Object.values(quantities).reduce((total: number, qty: unknown) => {
            const numQty = Number(qty) || 0;
            return total + numQty;
        }, 0);
    }

    // Get size quantities from product
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

    // Get sizes with stock information (shows live editing values if currently editing)
    getSizesWithStock(product: Product): { size: string, quantity: number, inStock: boolean }[] {
        // If we're currently editing this product, use the live edit values
        const isCurrentlyEditing = this.selectedProductId === product.id && this.updateMode;
        
        let sizeQuantities: { [size: string]: number };
        let availableSizes: string[];
        
        if (isCurrentlyEditing) {
            // Use current editing values
            sizeQuantities = this.editSizeQuantities;
            availableSizes = this.editSelectedSizes;
        } else {
            // Use database values
            sizeQuantities = this.getProductSizeQuantities(product);
            availableSizes = product.available_sizes || [];
        }
        
        return availableSizes.map(size => ({
            size: size,
            quantity: sizeQuantities[size] || 0,
            inStock: (sizeQuantities[size] || 0) > 0
        }));
    }

    // Get current total quantity (live editing values if currently editing)
    getCurrentTotalQuantity(product: Product): number {
        const isCurrentlyEditing = this.selectedProductId === product.id && this.updateMode;
        
        if (isCurrentlyEditing) {
            // Calculate from current editing values
            return Object.values(this.editSizeQuantities).reduce((total: number, qty: number) => total + (qty || 0), 0);
        } else {
            // Calculate from size_quantities if available, otherwise use quantity field
            if (product.size_quantities && typeof product.size_quantities === 'object') {
                return Object.values(product.size_quantities).reduce((total: number, qty: number) => total + (qty || 0), 0);
            } else {
                // If quantity is a string (JSON), try to parse it; otherwise use the number
                let quantity = product.quantity || 0;
                if (typeof quantity === 'string') {
                    try {
                        const parsed = JSON.parse(quantity);
                        if (typeof parsed === 'object' && parsed !== null) {
                            return Object.values(parsed).reduce((total: number, qty: unknown) => total + (Number(qty) || 0), 0);
                        }
                        return parsed || 0;
                    } catch (e) {
                        return 0;
                    }
                }
                return quantity;
            }
        }
    }

    // Check if product has any stock
    hasStock(product: Product): boolean {
        return this.getCurrentTotalQuantity(product) > 0;
    }

    // Get stock status for product (considers live editing)
    getStockStatus(product: Product): 'out-of-stock' | 'low-stock' | 'in-stock' {
        const totalQty = this.getCurrentTotalQuantity(product);
        if (totalQty <= 0) return 'out-of-stock';
        if (totalQty < 5) return 'low-stock';
        return 'in-stock';
    }
    
    // Mobile menu state
    mobileMenuOpen: boolean = false;

    constructor(private productService: ProductService, public authService: AuthService, private router: Router) { }

    ngOnInit(): void {
        const defaultSizeChart = `Size Chart:

Size        Chest Width (Inches)    Body Length (Inches)
Small       18                      28
Medium      20                      29
Large       22                      30
X-Large     24                      31`;

        this.productForm = new FormGroup({
            name: new FormControl(''),
            price: new FormControl(''),
            description: new FormControl(defaultSizeChart),
            image: new FormControl(''),
            category: new FormControl(this.categories[0]) // Default to first category instead of [9]
        });

        this.updateForm = new FormGroup({
            name: new FormControl(''),
            price: new FormControl(''),
            description: new FormControl(''),
            image: new FormControl(''),
            category: new FormControl(this.categories[0]) // Default to first category instead of [9]
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

    goToAdmin() {
        this.router.navigate(['/admin']);
    }
    
    // Mobile menu methods
    toggleMobileMenu() {
        this.mobileMenuOpen = !this.mobileMenuOpen;
    }
    
    closeMobileMenu() {
        this.mobileMenuOpen = false;
    }

    getImageUrl(imagePath: string): string {
        if (!imagePath) return this.baseUrl + 'placeholder.jpg';
        
        // Extract filename from any path format
        const filename = imagePath.split('/').pop()?.split('\\').pop() || imagePath;
        
        // Construct URL with base URL + filename
        return this.baseUrl + filename.trim();
    }

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

    getProducts(): void {
        this.productService.getProducts().subscribe((response: any) => {
            // Process products to parse available_sizes from string to array
            this.products = response.records.map((product: any) => {
                return this.processProductSizes(product);
            });
        });
    }

    getAllProducts(): void {
        this.productService.getAllProducts().subscribe((response: any) => {
            // Process products to parse available_sizes from string to array
            this.allProducts = response.records.map((product: any) => {
                return this.processProductSizes(product);
            });
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
            this.fileName = file.name;

            // Read the file as a URL for preview
            const reader = new FileReader();
            reader.onload = (e: any) => {
                const preview = e.target.result;
                
                // Determine which input triggered the change
                if (event.target.id === 'productImage') {
                    // Create product form
                    this.createImagePreview = preview;
                    this.productForm.patchValue({
                        image: file
                    });
                } else if (event.target.id === 'editProductImage') {
                    // Edit product form
                    this.editImagePreview = preview;
                    this.updateForm.patchValue({
                        image: file
                    });
                }
            };
            reader.readAsDataURL(file);
        }
    }

    createProduct(): void {
        if (this.productForm.valid && this.selectedSizes.length > 0) {
            const formData = new FormData();
            formData.append('name', this.productForm.value.name);
            formData.append('price', this.productForm.value.price);
            formData.append('description', this.productForm.value.description);
            formData.append('image', this.productForm.value.image);
            formData.append('category', this.productForm.value.category);
            formData.append('available_sizes', JSON.stringify(this.selectedSizes));
            formData.append('size_quantities', JSON.stringify(this.sizeQuantities));

            this.productService.createProduct(formData).subscribe(
                (response: any) => {
                    console.log('Product created:', response);
                    this.getProducts();
                    this.getAllProducts();
                    this.resetForms();
                    // SweetAlert on success
                    Swal.fire({
                        icon: 'success',
                        title: 'Product Uploaded!',
                        text: 'Your product has been successfully uploaded.',
                        timer: 1500,
                        showConfirmButton: false
                    });
                },
                (error: any) => {
                    console.error('Error creating product:', error);
                    Swal.fire({
                        icon: 'error',
                        title: 'Upload Failed',
                        text: 'There was a problem uploading your product.',
                        timer: 1800,
                        showConfirmButton: false
                    });
                }
            );
        } else {
            console.error('Form is invalid or no sizes selected');
            let errorMessage = 'Please fill out all required fields.';
            if (this.selectedSizes.length === 0) {
                errorMessage = 'Please select at least one available size.';
            }
            Swal.fire({
                icon: 'warning',
                title: 'Invalid Form',
                text: errorMessage,
                timer: 1800,
                showConfirmButton: false
            });
        }
    }

    readOneProduct(productId: number): void {
        this.productService.readOneProduct(productId).subscribe((response: any) => {
            console.log(response);
        });
    }

    updateProduct(): void {
        console.log('🔧 UPDATE PRODUCT - Starting update process');
        console.log('Edit Selected Sizes:', this.editSelectedSizes);
        console.log('Edit Size Quantities:', this.editSizeQuantities);
        console.log('Total Quantity:', this.getTotalQuantity(true));
        
        // Ensure we have quantities for all selected sizes
        this.editSelectedSizes.forEach(size => {
            if (!this.editSizeQuantities[size] || this.editSizeQuantities[size] === undefined) {
                this.editSizeQuantities[size] = 1;
                console.log(`Setting default quantity for size ${size}: 1`);
            }
        });
        
        if (this.updateForm.valid && this.selectedProductId !== null && this.editSelectedSizes.length > 0) {
            const formData = new FormData();
            formData.append('name', this.updateForm.value.name);
            formData.append('price', this.updateForm.value.price);
            formData.append('description', this.updateForm.value.description);
            formData.append('category', this.updateForm.value.category);
            formData.append('available_sizes', JSON.stringify(this.editSelectedSizes));
            formData.append('size_quantities', JSON.stringify(this.editSizeQuantities));
            
            console.log('✅ FormData being sent:');
            console.log('- Available Sizes:', JSON.stringify(this.editSelectedSizes));
            console.log('- Size Quantities:', JSON.stringify(this.editSizeQuantities));
            if (this.updateForm.value.image) {
                formData.append('image', this.updateForm.value.image);
            }

            this.productService.updateProduct(this.selectedProductId, formData).subscribe(
                (response: any) => {
                    console.log('Product updated:', response);
                    this.getProducts();
                    this.getCarts();
                    this.getAllProducts();
                    this.resetForms();
                    this.updateMode = false;
                    this.selectedProductId = null;
                    // SweetAlert on success
                    Swal.fire({
                        icon: 'success',
                        title: 'Product Updated!',
                        text: 'Your product has been successfully updated.',
                        timer: 1500,
                        showConfirmButton: false
                    });
                },
                (error: any) => {
                    console.error('Error updating product:', error);
                    Swal.fire({
                        icon: 'error',
                        title: 'Update Failed',
                        text: 'There was a problem updating your product.',
                        timer: 1800,
                        showConfirmButton: false
                    });
                }
            );
        } else {
            console.error('🚨 UPDATE VALIDATION FAILED');
            console.error('Form valid:', this.updateForm.valid);
            console.error('Product ID:', this.selectedProductId);
            console.error('Edit selected sizes:', this.editSelectedSizes);
            console.error('Edit size quantities:', this.editSizeQuantities);
            console.error('Form errors:', this.updateForm.errors);
            
            let errorMessage = 'Please fill out all required fields.';
            if (this.editSelectedSizes.length === 0) {
                errorMessage = 'Please select at least one available size.';
            } else if (!this.updateForm.valid) {
                errorMessage = 'Please fill out all required fields correctly.';
            } else if (this.selectedProductId === null) {
                errorMessage = 'No product selected for update.';
            }
            Swal.fire({
                icon: 'warning',
                title: 'Invalid Form',
                text: errorMessage,
                timer: 1800,
                showConfirmButton: false
            });
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
                image: null,
                category: product.category,
            });
            // Set edit selected sizes from product's available sizes
            this.editSelectedSizes = product.available_sizes ? [...product.available_sizes] : [];
            
            // Set edit size quantities from product's size quantities (handle both object and JSON string)
            const productSizeQuantities = this.getProductSizeQuantities(product);
            this.editSizeQuantities = productSizeQuantities ? {...productSizeQuantities} : {};
            
            console.log('🔧 EDIT MODE ACTIVATED');
            console.log('Product data:', product);
            console.log('Available sizes:', product.available_sizes);
            console.log('Raw size quantities from product:', product.size_quantities);
            console.log('Parsed size quantities:', productSizeQuantities);
            console.log('Edit selected sizes set to:', this.editSelectedSizes);
            console.log('Edit size quantities set to:', this.editSizeQuantities);
            
            // Ensure all selected sizes have quantities (default to 1 if missing)
            this.editSelectedSizes.forEach(size => {
                if (!this.editSizeQuantities[size]) {
                    this.editSizeQuantities[size] = 1;
                }
            });
            
            console.log('Final edit size quantities after defaults:', this.editSizeQuantities);
        }
    }

    deleteProduct(productId: number): void {
        Swal.fire({
            title: 'Are you sure?',
            text: 'This product will be permanently deleted!',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#cc0000',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, delete it!',
            cancelButtonText: 'Cancel'
        }).then((result) => {
            if (result.isConfirmed) {
                this.productService.deleteProduct(productId).subscribe(
                    (response: any) => {
                        console.log('Product deleted:', response);
                        this.getProducts();
                        this.getCarts();
                        this.getAllProducts();
                        this.resetForms();
                        this.selectedProduct = undefined; // Reset selectedProduct
                        Swal.fire({
                            icon: 'success',
                            title: 'Deleted!',
                            text: 'Product has been removed.',
                            timer: 1200,
                            showConfirmButton: false
                        });
                    },
                    (error: any) => {
                        console.error('Error deleting product:', error);
                        Swal.fire({
                            icon: 'error',
                            title: 'Delete Failed',
                            text: 'There was a problem deleting the product.',
                            timer: 1500,
                            showConfirmButton: false
                        });
                    }
                );
            }
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

    deleteCart(cartId: number): void {
        this.productService.deleteCart(cartId).subscribe((response: any) => {
            console.log('Cart deleted:', response);
            this.getCarts();
        });
    }

    calculateTotal(): number {
        return this.carts?.reduce((total, cart) => total + cart.price * cart.quantity, 0) ?? 0;
    }
}

