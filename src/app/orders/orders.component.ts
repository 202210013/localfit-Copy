import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ProductService } from '../services/e-comm.service';
import { AuthService } from '../services/auth.service';
import Swal from 'sweetalert2';
import { environment } from '../../environments/environment';

// Update the Order interface to match your API response
interface Order {
  id: number;
  customer: string; // This is the buyer's email
  product: string;  // This is the product name
  quantity: number;
  status: 'pending' | 'approved' | 'declined' | 'ready-for-pickup' | 'completed';
  // Add optional fields that might be in the response
  price?: number;
  total_price?: number;
  order_date?: string;
  created_at?: string;
  updated_at?: string;
  product_image?: string;
  remarks?: string; // Add remarks for declined orders
  pickup_date?: string; // Add pickup date field
  // Add calculated price
  calculatedPrice?: number;
  // Cache product ID for ratings
  productId?: number;
  // Track if order has been rated
  hasRating?: boolean;
}

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './orders.component.html',
  styleUrls: ['./orders.component.css']
})
export class OrdersComponent implements OnInit, OnDestroy {
  myOrders: Order[] = []; // Orders received (as seller)
  myPurchases: Order[] = []; // Orders made (as buyer)
  allOrders: Order[] = []; // Store all orders before filtering
  activeTab: 'pending' | 'ready-for-pickup' | 'declined' | 'completed' = 'pending';
  baseUrl: string = environment.imageBaseUrl;
  loading = false;
  
  // Add sorting properties
  sortBy: 'latest' | 'oldest' | 'status' = 'latest';
  sortOptions = [
    { value: 'latest', label: 'Latest First' },
    { value: 'oldest', label: 'Oldest First' },
    { value: 'status', label: 'By Status' }
  ];

  // Filtered orders by status
  pendingOrders: Order[] = [];
  readyForPickupOrders: Order[] = [];
  declinedOrders: Order[] = [];
  completedOrders: Order[] = [];

  constructor(
    private productService: ProductService,
    public authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadOrders();
  }

  ngOnDestroy(): void {}

  loadOrders(): void {
    this.loading = true;
    
    // Get current user's email from localStorage
    const currentUserEmail = localStorage.getItem('user_email');
    
    let ordersLoaded = false;
    let purchasesLoaded = false;
    
    // Function to check if both API calls are complete and then filter
    const checkAndFilter = () => {
      if (ordersLoaded && purchasesLoaded) {
        this.filterOrdersByStatus();
        this.loading = false;
      }
    };
    
    // Load orders received (as seller)
    this.productService.getMyOrders().subscribe({
      next: (response: any) => {
        console.log('Orders response:', response);
        this.allOrders = Array.isArray(response) ? response : (response.records || []);
        
        // Get all orders for the current user (remove status filtering)
        this.myOrders = this.allOrders.filter(order => 
          currentUserEmail && 
          order.customer === currentUserEmail
        );
        
        this.enrichOrdersWithPrices(this.myOrders);
        ordersLoaded = true;
        checkAndFilter();
      },
      error: (error: any) => {
        console.error('Error loading orders:', error);
        this.myOrders = [];
        this.allOrders = [];
        ordersLoaded = true;
        checkAndFilter();
      }
    });

    // Load orders made (as buyer)
    this.productService.getMyPurchases().subscribe({
      next: (response: any) => {
        console.log('Purchases response:', response);
        const allPurchases = Array.isArray(response) ? response : (response.records || []);
        
        // Filter to show only purchases for the current user
        this.myPurchases = allPurchases.filter((purchase: Order) => 
          currentUserEmail && 
          purchase.customer === currentUserEmail
        );
        
        this.enrichOrdersWithPrices(this.myPurchases);
        purchasesLoaded = true;
        checkAndFilter();
      },
      error: (error: any) => {
        console.error('Error loading purchases:', error);
        this.myPurchases = [];
        purchasesLoaded = true;
        checkAndFilter();
      }
    });
  }

  // Add sorting method
  sortOrders(): void {
    const sortFn = this.getSortFunction();
    this.myOrders.sort(sortFn);
    this.myPurchases.sort(sortFn);
    
    // Also sort the filtered arrays
    this.pendingOrders.sort(sortFn);
    this.readyForPickupOrders.sort(sortFn);
    this.declinedOrders.sort(sortFn);
    this.completedOrders.sort(sortFn);
  }

  // Get sort function based on selected sort option
  private getSortFunction(): (a: Order, b: Order) => number {
    switch (this.sortBy) {
      case 'latest':
        return (a, b) => {
          const dateA = new Date(a.created_at || a.order_date || a.id).getTime();
          const dateB = new Date(b.created_at || b.order_date || b.id).getTime();
          return dateB - dateA; // Latest first
        };
      
      case 'oldest':
        return (a, b) => {
          const dateA = new Date(a.created_at || a.order_date || a.id).getTime();
          const dateB = new Date(b.created_at || b.order_date || b.id).getTime();
          return dateA - dateB; // Oldest first
        };
      
      case 'status':
        return (a, b) => {
          const statusOrder = { 'pending': 0, 'approved': 1, 'ready-for-pickup': 2, 'completed': 3, 'declined': 4 };
          const statusA = statusOrder[a.status] || 5;
          const statusB = statusOrder[b.status] || 5;
          return statusA - statusB;
        };
      
      default:
        return (a, b) => b.id - a.id; // Default to ID descending
    }
  }

  // Handle sort change - update this method
  onSortChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.sortBy = target.value as 'latest' | 'oldest' | 'status';
    this.sortOrders();
  }

  // Method to enrich orders with price information
  private enrichOrdersWithPrices(orders: Order[]): void {
    // Load all products to get price information
    this.productService.getAllProducts().subscribe({
      next: (productsResponse: any) => {
        const products = Array.isArray(productsResponse) ? productsResponse : (productsResponse.records || []);
        
        // Match orders with products to get prices AND product IDs
        orders.forEach(order => {
          const matchingProduct = products.find((product: any) => 
            product.name === order.product || 
            product.title === order.product ||
            product.product_name === order.product
          );
          
          if (matchingProduct) {
            order.calculatedPrice = matchingProduct.price * order.quantity;
            order.product_image = matchingProduct.image;
            order.productId = matchingProduct.id; // Cache product ID for ratings
          } else {
            // Fallback: assign a default price or keep as undefined
            order.calculatedPrice = 0;
          }
          
          // Check if order has been rated (for completed orders)
          if (order.status === 'completed') {
            this.checkOrderRating(order);
          }
        });
      },
      error: (error: any) => {
        console.error('Error loading products for price calculation:', error);
      }
    });
  }

  switchTab(tab: 'pending' | 'ready-for-pickup' | 'declined' | 'completed'): void {
    this.activeTab = tab;
  }

  // Filter orders by status
  filterOrdersByStatus(): void {
    // Combine orders and purchases, removing duplicates by ID
    const combinedOrders = [...this.myOrders, ...this.myPurchases];
    const uniqueOrders = combinedOrders.filter((order, index, self) => 
      index === self.findIndex(o => o.id === order.id)
    );
    
    this.pendingOrders = uniqueOrders.filter(order => order.status === 'pending');
    this.readyForPickupOrders = uniqueOrders.filter(order => order.status === 'ready-for-pickup');
    this.declinedOrders = uniqueOrders.filter(order => order.status === 'declined');
    this.completedOrders = uniqueOrders.filter(order => order.status === 'completed');
    
    // Sort after filtering
    this.sortOrders();
  }

  // Get current active orders based on selected tab
  getCurrentOrders(): Order[] {
    switch(this.activeTab) {
      case 'pending':
        return this.pendingOrders;
      case 'ready-for-pickup':
        return this.readyForPickupOrders;
      case 'declined':
        return this.declinedOrders;
      case 'completed':
        return this.completedOrders;
      default:
        return [];
    }
  }

  // Get empty state message based on active tab
  getEmptyStateMessage(): string {
    switch(this.activeTab) {
      case 'pending':
        return 'Orders awaiting approval will appear here.';
      case 'ready-for-pickup':
        return 'Orders ready for pickup will appear here.';
      case 'declined':
        return 'Declined orders will appear here.';
      case 'completed':
        return 'Completed orders will appear here.';
      default:
        return 'No orders found.';
    }
  }

  approveOrder(orderId: number): void {
    Swal.fire({
      title: 'Approve Order?',
      text: 'Are you sure you want to approve this order?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#28a745',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Yes, approve it!'
    }).then((result) => {
      if (result.isConfirmed) {
        this.updateOrderStatus(orderId, 'approved');
      }
    });
  }

  declineOrder(orderId: number): void {
    Swal.fire({
      title: 'Decline Order?',
      text: 'Are you sure you want to decline this order?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Yes, decline it!'
    }).then((result) => {
      if (result.isConfirmed) {
        this.updateOrderStatus(orderId, 'declined');
      }
    });
  }

  private updateOrderStatus(orderId: number, status: string): void {
    this.productService.updateOrderStatus(orderId, status).subscribe({
      next: (response: any) => {
        Swal.fire({
          icon: 'success',
          title: `Order ${status}!`,
          text: `The order has been ${status} successfully.`,
          timer: 1500,
          showConfirmButton: false
        });
        this.loadOrders(); // Reload orders
      },
      error: (error: any) => {
        console.error('Error updating order status:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error!',
          text: 'Failed to update order status. Please try again.',
        });
      }
    });
  }

  getImageUrl(image: string): string {
    if (!image) return 'assets/placeholder-image.jpg'; // Fallback image
    
    // Extract filename from any path format
    const filename = image.split('/').pop()?.split('\\').pop() || image;
    
    // Construct URL with base URL + filename
    return this.baseUrl + filename.trim();
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'pending': return 'status-pending';
      case 'approved': return 'status-approved';
      case 'ready-for-pickup': return 'status-ready-pickup';
      case 'completed': return 'status-completed';
      case 'declined': return 'status-declined';
      default: return 'status-pending';
    }
  }

  goBack(): void {
    this.router.navigate(['/product-listing']);
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'No date';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  }

  formatPickupDate(dateString: string): string {
    if (!dateString) return 'Not set';
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    return date.toLocaleDateString('en-US', options);
  }

  // Helper methods to get the right property names
  getBuyerName(order: Order): string {
    return order.customer || 'Unknown Customer';
  }

  getProductName(order: Order): string {
    return order.product || 'Unknown Product';
  }

  getTotalPrice(order: Order): number {
    // Use calculated price, fallback to original price fields, then to 0
    return order.calculatedPrice || order.total_price || order.price || 0;
  }

  // Add method to check if price is available
  hasPriceInfo(order: Order): boolean {
    return !!(order.calculatedPrice || order.total_price || order.price);
  }

  // Add method to get total completed orders count for display
  getCompletedOrdersCount(): number {
    return this.allOrders.filter(order => order.status === 'completed').length;
  }

  // Method to confirm order pickup by customer
  confirmPickup(order: Order): void {
    // Show confirmation dialog
    Swal.fire({
      title: 'Confirm Pickup',
      text: `Are you sure you have picked up "${order.product}"?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#28a745',
      cancelButtonColor: '#dc3545',
      confirmButtonText: 'Yes, I picked it up',
      cancelButtonText: 'Not yet'
    }).then((result) => {
      if (result.isConfirmed) {
        this.processPickupConfirmation(order);
      }
    });
  }

  private processPickupConfirmation(order: Order): void {
    const token = localStorage.getItem('auth_token');
    const userEmail = localStorage.getItem('user_email');
    
    if (!token || !userEmail) {
      Swal.fire('Error', 'Authentication required. Please login again.', 'error');
      this.router.navigate(['/login']);
      return;
    }

    // Update status optimistically
    const originalStatus = order.status;
    order.status = 'completed';

    // Call API to confirm pickup
    this.productService.confirmOrderPickup(order.id, userEmail, token).subscribe({
      next: (response) => {
        Swal.fire({
          title: 'Pickup Confirmed!',
          text: 'Thank you for confirming your pickup. The order is now completed.',
          icon: 'success',
          timer: 2000,
          showConfirmButton: false
        });
        // Refresh orders to get updated data
        this.loadOrders();
      },
      error: (error) => {
        console.error('Error confirming pickup:', error);
        // Revert status on error
        order.status = originalStatus;
        
        let errorMessage = 'Failed to confirm pickup. Please try again.';
        if (error.status === 401) {
          errorMessage = 'Session expired. Please login again.';
          this.router.navigate(['/login']);
        } else if (error.status === 404) {
          errorMessage = 'Order not found or already completed.';
        }
        
        Swal.fire('Error', errorMessage, 'error');
      }
    });
  }

  // Rating functionality
  rateOrder(order: Order): void {
    let selectedRating = 0; // Move outside to be accessible in preConfirm
    
    Swal.fire({
      title: '<span style="color: #780001; font-size: 28px; font-weight: 700;">Rate Your Order</span>',
      html: `
        <div style="text-align: center; padding: 20px 10px;">
          <div style="background: linear-gradient(135deg, #f8f9fa, #e9ecef); padding: 20px; border-radius: 12px; margin-bottom: 25px;">
            <p style="margin: 0 0 8px 0; color: #666; font-size: 15px;">How was your experience with</p>
            <p style="margin: 0; color: #780001; font-size: 18px; font-weight: 700;">${order.product}</p>
          </div>
          
          <div style="margin: 30px 0;">
            <p style="margin-bottom: 15px; color: #495057; font-weight: 600; font-size: 16px;">Select Your Rating</p>
            <div class="star-rating" id="starRating" style="font-size: 3rem; cursor: pointer; display: flex; justify-content: center; gap: 8px;">
              <i class="fa-regular fa-star" data-rating="1" style="transition: all 0.2s ease; color: #ddd;"></i>
              <i class="fa-regular fa-star" data-rating="2" style="transition: all 0.2s ease; color: #ddd;"></i>
              <i class="fa-regular fa-star" data-rating="3" style="transition: all 0.2s ease; color: #ddd;"></i>
              <i class="fa-regular fa-star" data-rating="4" style="transition: all 0.2s ease; color: #ddd;"></i>
              <i class="fa-regular fa-star" data-rating="5" style="transition: all 0.2s ease; color: #ddd;"></i>
            </div>
            <p id="ratingLabel" style="margin-top: 12px; color: #6c757d; font-size: 14px; min-height: 20px; font-weight: 500;"></p>
          </div>
          
          <div style="text-align: left; margin-top: 25px;">
            <label style="display: block; margin-bottom: 10px; color: #495057; font-weight: 600; font-size: 15px;">
              <i class="fa-solid fa-comment-dots" style="color: #780001; margin-right: 6px;"></i>
              Share Your Experience (Optional)
            </label>
            <textarea 
              id="reviewText" 
              class="swal2-textarea" 
              placeholder="Tell us what you liked or what could be improved..." 
              style="width: 100%; min-height: 100px; max-height: 100px; margin: 0; resize: none; border: 2px solid #dee2e6; border-radius: 8px; padding: 12px; font-size: 14px; line-height: 1.5; overflow: hidden; box-sizing: border-box; display: block;"
              maxlength="500"></textarea>
            <small style="color: #6c757d; font-size: 12px; display: block; text-align: right; margin-top: 6px;">
              <span id="charCount">0</span>/500 characters
            </small>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: '<i class="fa-solid fa-paper-plane"></i> Submit Rating',
      cancelButtonText: '<i class="fa-solid fa-times"></i> Cancel',
      confirmButtonColor: '#780001',
      cancelButtonColor: '#6c757d',
      width: '90%',
      customClass: {
        popup: 'rating-modal-popup',
        confirmButton: 'rating-confirm-btn',
        cancelButton: 'rating-cancel-btn'
      },
      didOpen: () => {
        const stars = document.querySelectorAll('.star-rating i');
        const ratingLabel = document.getElementById('ratingLabel');
        const reviewText = document.getElementById('reviewText') as HTMLTextAreaElement;
        const charCount = document.getElementById('charCount');
        
        const ratingLabels = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];
        const ratingColors = ['', '#dc3545', '#fd7e14', '#ffc107', '#20c997', '#28a745'];
        
        // Character counter
        if (reviewText && charCount) {
          reviewText.addEventListener('input', () => {
            charCount.textContent = reviewText.value.length.toString();
          });
        }
        
        stars.forEach((star: any) => {
          // Click event
          star.addEventListener('click', () => {
            selectedRating = parseInt(star.getAttribute('data-rating'));
            console.log('⭐ Rating selected:', selectedRating);
            
            // Update stars
            stars.forEach((s: any, index) => {
              if (index < selectedRating) {
                s.classList.remove('fa-regular');
                s.classList.add('fa-solid');
                s.style.color = '#FFD700';
                s.style.transform = 'scale(1.1)';
              } else {
                s.classList.remove('fa-solid');
                s.classList.add('fa-regular');
                s.style.color = '#ddd';
                s.style.transform = 'scale(1)';
              }
            });
            
            // Update label
            if (ratingLabel) {
              ratingLabel.textContent = ratingLabels[selectedRating];
              ratingLabel.style.color = ratingColors[selectedRating];
              ratingLabel.style.fontWeight = '700';
              ratingLabel.style.fontSize = '16px';
            }
          });
          
          // Hover effect
          star.addEventListener('mouseenter', () => {
            const hoverRating = parseInt(star.getAttribute('data-rating'));
            stars.forEach((s: any, index) => {
              if (index < hoverRating) {
                s.style.color = '#FFD700';
                s.style.transform = 'scale(1.15)';
              } else {
                if (index < selectedRating) {
                  s.style.color = '#FFD700';
                } else {
                  s.style.color = '#ddd';
                }
                s.style.transform = 'scale(1)';
              }
            });
            
            // Show preview label
            if (ratingLabel && hoverRating > selectedRating) {
              ratingLabel.textContent = ratingLabels[hoverRating];
              ratingLabel.style.color = ratingColors[hoverRating];
              ratingLabel.style.opacity = '0.7';
            }
          });
        });
        
        // Mouse leave - restore selected state
        document.querySelector('.star-rating')?.addEventListener('mouseleave', () => {
          stars.forEach((s: any, index) => {
            if (index < selectedRating) {
              s.style.color = '#FFD700';
              s.style.transform = 'scale(1.1)';
            } else {
              s.style.color = '#ddd';
              s.style.transform = 'scale(1)';
            }
          });
          
          // Restore label
          if (ratingLabel) {
            if (selectedRating > 0) {
              ratingLabel.textContent = ratingLabels[selectedRating];
              ratingLabel.style.color = ratingColors[selectedRating];
              ratingLabel.style.opacity = '1';
            } else {
              ratingLabel.textContent = '';
            }
          }
        });
      },
      preConfirm: () => {
        const review = (document.getElementById('reviewText') as HTMLTextAreaElement)?.value || '';
        
        console.log('📝 PreConfirm - Selected rating:', selectedRating);
        console.log('📝 Review text:', review);
        
        if (selectedRating === 0) {
          Swal.showValidationMessage('Please select a rating (1-5 stars)');
          return false;
        }
        
        return { rating: selectedRating, review };
      }
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        console.log('✅ Submitting rating:', result.value);
        this.submitRating(order, result.value.rating, result.value.review);
      }
    });
  }

  private submitRating(order: Order, rating: number, review: string): void {
    const productId = this.getProductIdFromOrder(order);
    
    console.log('📤 Submitting rating to API:', {
      orderId: order.id,
      productId: productId,
      rating: rating,
      review: review
    });
    
    if (productId === 0) {
      console.error('❌ Product ID is 0 - cannot submit rating');
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Product information not found. Please refresh and try again.',
        confirmButtonColor: '#780001'
      });
      return;
    }
    
    this.productService.submitRating(order.id, productId, rating, review).subscribe({
      next: (response) => {
        console.log('✅ Rating submitted successfully:', response);
        // Mark order as rated immediately
        order.hasRating = true;
        Swal.fire({
          icon: 'success',
          title: 'Thank You!',
          text: 'Your rating has been submitted successfully.',
          confirmButtonColor: '#780001'
        });
      },
      error: (error) => {
        console.error('❌ Error submitting rating:', error);
        let errorMessage = 'Failed to submit rating. ';
        
        if (error.status === 0) {
          errorMessage += 'Server is not responding. Please ensure the Node.js server is running.';
        } else if (error.status === 401) {
          errorMessage += 'Please login again.';
        } else if (error.status === 400 && error.error?.error) {
          errorMessage += error.error.error;
        } else {
          errorMessage += 'Please try again.';
        }
        
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: errorMessage,
          confirmButtonColor: '#780001'
        });
      }
    });
  }

  private getProductIdFromOrder(order: Order): number {
    // Return cached product ID from enrichOrdersWithPrices
    // If not available, return 0 (should trigger an error in the API)
    return order.productId || 0;
  }

  // Check if order has been rated
  private checkOrderRating(order: Order): void {
    this.productService.getRatingsByOrder(order.id).subscribe({
      next: (response: any) => {
        if (response.success && response.rating) {
          order.hasRating = true;
        } else {
          order.hasRating = false;
        }
      },
      error: (error) => {
        // If error, assume not rated (allow rating attempt)
        order.hasRating = false;
      }
    });
  }

  // Check if order can be rated
  canRateOrder(order: Order): boolean {
    return !order.hasRating;
  }
}

