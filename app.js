const app = new Vue({
    el: '#app',
    data: {
        lessons: [],
        cart: [],
        currentView: 'lessons',
        searchQuery: '',
        searchResults: [],
        sortBy: 'subject',
        sortOrder: 'asc',
        checkoutData: {
            name: '',
            phone: '',
            email: ''
        },
        formErrors: {
            name: '',
            phone: ''
        },
        orderSubmitted: false,
        isLoading: true,
        isProcessingOrder: false,
        backendUrl: 'https://courses-bookings.onrender.com' // Update with backend URL
    },
    
    computed: {
        // Sort lessons based on selected criteria
        sortedLessons() {
            const lessonsToSort = this.searchQuery && this.searchResults.length > 0 
                ? this.searchResults 
                : this.lessons;
            
            return [...lessonsToSort].sort((a, b) => {
                let aValue = a[this.sortBy];
                let bValue = b[this.sortBy];
                
                // Convert to numbers for price and spaces sorting
                if (this.sortBy === 'price' || this.sortBy === 'spaces') {
                    aValue = Number(aValue);
                    bValue = Number(bValue);
                }
                
                if (this.sortOrder === 'asc') {
                    return aValue > bValue ? 1 : -1;
                } else {
                    return aValue < bValue ? 1 : -1;
                }
            });
        },
        
        // Displayed lessons (for counting)
        displayedLessons() {
            return this.sortedLessons;
        },

        totalItems() {
            return this.cart.reduce((total, item) => total + item.quantity, 0);
        },
        
        // Calculates the total cart price including quantities
        cartTotal() {
            return this.cart.reduce((total, item) => total + (item.price * item.quantity), 0);
        },
        
        // Check if checkout form is valid
        isCheckoutValid() {
            const nameValid = /^[A-Za-z\s]+$/.test(this.checkoutData.name);
            const phoneValid = /^\d+$/.test(this.checkoutData.phone);
            return nameValid && phoneValid && this.cart.length > 0;
        }
    },
    
    methods: {
        // Refreshing the course page
        refreshCourses() {
            if (this.currentView !== 'lessons') {
                this.fetchLessons();
                this.seaarchQuery = '';
                this.searchResults = [];
            }else{
                this.navigateTo('lessons');
            }
        },
        clearSearch() {
            this.searchQuery = '';
            this.searchResults = [];
        },

        // Fetch all lessons from backend
        async fetchLessons() {
            try {
                this.isLoading = true;
                const response = await fetch(`${this.backendUrl}/api/lessons`);
                const lessons = await response.json();
                this.lessons = lessons.map(lesson => ({
                    ...lesson,
                    id: lesson._id || lesson.id
                }));
            } catch (error) {
                console.error('Error fetching lessons:', error);
                alert('Error loading courses. Please check if backend is running.');
            } finally {
                this.isLoading = false;
            }
        },
        
        // Searching in lessons (Backend implementation)
        async handleSearch() {
            if (!this.searchQuery.trim()) {
                this.searchResults = [];
                return;
            }
            
            try {
                const response = await fetch(`${this.backendUrl}/api/search?q=${encodeURIComponent(this.searchQuery)}`);
                this.searchResults = await response.json();
            } catch (error) {
                console.error('Search error:', error);
                // Fallback to frontend search
                this.searchResults = this.lessons.filter(lesson => 
                    lesson.subject.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
                    lesson.location.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
                    lesson.price.toString().includes(this.searchQuery) ||
                    lesson.spaces.toString().includes(this.searchQuery)
                );
            }
        },
        
        // Adds lesson to cart with v-on
        addToCart(lesson) {
            if (lesson.spaces > 0) {
                // Checks if the lesson already exists in cart
                const existingItem = this.cart.find(item => item.id === lesson.id);
                
                if (existingItem) {
                    // Increases the quantity if already in cart
                    if (lesson.spaces > 0) {
                        existingItem.quantity += 1;
                        // updates only in the frontend
                        lesson.spaces--;
                    }
                } else {
                    // Adds new item to cart with quantity 1
                    this.cart.push({
                        ...lesson,
                        quantity: 1,  
                        cartId: Date.now() + Math.random()
                    });
                    // this.updateLessonSpaces(lesson.id, lesson.spaces - 1);
                    lesson.spaces--;
                }
            }
        },
        
        // Remove item from cart with v-on
        removeFromCart(cartId) {
            const index = this.cart.findIndex(item => item.cartId === cartId);
            if (index !== -1) {
                const cartItem = this.cart[index];
                const lesson = this.lessons.find(l => l.id === cartItem.id);
                
                if (lesson) {
                    // Return ALL quantities back to available spaces
                    this.updateLessonSpaces(lesson.id, lesson.spaces + cartItem.quantity);
                    lesson.spaces += cartItem.quantity;
                }
                this.cart.splice(index, 1);
            }
        },
        
        // Update lesson spaces in backend
        async updateLessonSpaces(lessonId, newSpaces) {
            try {
                const response = await fetch(`${this.backendUrl}/api/lessons/${lessonId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ spaces: newSpaces })
                });
                
                if (!response.ok) {
                    throw new Error('Failed to update spaces');
                }
            } catch (error) {
                console.error('Error updating spaces:', error);
            }
        },
        
        // Submit order to backend
        async submitOrder() {
            if (!this.isCheckoutValid) return;
            
            try {

                 // Show processing popup
                this.isProcessingOrder = true;
                console.log('🔄 Order processing popup shown');
                
                // Ensure DOM updates and popup renders
                await this.$nextTick();
                await new Promise(resolve => setTimeout(resolve, 100));

                const orderData = {
                    name: this.checkoutData.name,
                    phone: this.checkoutData.phone,
                    email: this.checkoutData.email,
                    lessons: this.cart.map(item => ({
                        lessonId: item._id || item.id,
                        subject: item.subject,
                        price: item.price,
                        image: item.image,
                        quantity: item.quantity
                    })),
                    total: this.cartTotal
                };
                
                const response = await fetch(`${this.backendUrl}/api/orders`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(orderData)
                });
                
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || `HTTP ${response.status}`);
                }

                const result = await response.json();
                console.log('Order successful:', result);

               setTimeout(() => {
                    this.isProcessingOrder = false;
                    this.orderSubmitted = true;
                    this.cart = [];
                    this.checkoutData = { name: '', phone: '', email: '' };
                    
                    // Refresh lessons to get updated spaces
                    this.fetchLessons();
                    
                    // Redirect after showing success message
                    setTimeout(() => {
                        this.orderSubmitted = false;
                        this.navigateTo('lessons');
                    }, 2500);
                    
                }, 2000); // Show processing popup for 2 seconds

            } catch (error) {
                this.isProcessingOrder = false;
                console.error('Error submitting order:', error);
                alert('Error submitting order. Please try again.');
            }
        },
        
        // Navigation methods
        navigateTo(view) {
            this.currentView = view;
            this.orderSubmitted = false;
        },
        
        toggleSortOrder() {
            this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
        },
        
        // Form validation
        validateForm() {
            this.formErrors.name = /^[A-Za-z\s]+$/.test(this.checkoutData.name) ? '' : 'Name must contain only letters';
            this.formErrors.phone = /^\d+$/.test(this.checkoutData.phone) ? '' : 'Phone must contain only numbers';
        }
    },
    
    mounted() {
        this.fetchLessons();
    }
});