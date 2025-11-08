// Main Vue Application with proper directives
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
        backendUrl: 'https://your-backend-app.onrender.com'
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
        
        // Calculate total cart price
        cartTotal() {
            return this.cart.reduce((total, item) => total + item.price, 0);
        },
        
        // Check if checkout form is valid
        isCheckoutValid() {
            const nameValid = /^[A-Za-z\s]+$/.test(this.checkoutData.name);
            const phoneValid = /^\d+$/.test(this.checkoutData.phone);
            return nameValid && phoneValid && this.cart.length > 0;
        }
    },
    
    methods: {
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
                // Fallback data for demo
                //this.lessons = this.getDemoLessons();
            } finally {
                this.isLoading = false;
            }
        },
        
        // Demo data in case backend is not available
        getDemoLessons() {
            return [
                { id: '1', subject: 'Piano', location: 'London', price: 50, spaces: 5, icon: 'fa-music' },
                { id: '2', subject: 'Guitar', location: 'Manchester', price: 40, spaces: 5, icon: 'fa-guitar' },
                { id: '3', subject: 'Violin', location: 'Birmingham', price: 45, spaces: 5, icon: 'fa-violin' },
                { id: '4', subject: 'Drums', location: 'Liverpool', price: 35, spaces: 5, icon: 'fa-drum' },
                { id: '5', subject: 'Singing', location: 'Leeds', price: 30, spaces: 5, icon: 'fa-microphone' },
                { id: '6', subject: 'Saxophone', location: 'Bristol', price: 55, spaces: 5, icon: 'fa-saxophone' },
                { id: '7', subject: 'Flute', location: 'Glasgow', price: 38, spaces: 5, icon: 'fa-flute' },
                { id: '8', subject: 'Trumpet', location: 'Edinburgh', price: 42, spaces: 5, icon: 'fa-trumpet' },
                { id: '9', subject: 'Cello', location: 'Cardiff', price: 48, spaces: 5, icon: 'fa-cello' },
                { id: '10', subject: 'Clarinet', location: 'Belfast', price: 36, spaces: 5, icon: 'fa-clarinet' }
            ];
        },
        
        // Search lessons (Backend implementation)
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
        
        // Add lesson to cart with v-on
        addToCart(lesson) {
            if (lesson.spaces > 0) {
                this.cart.push({
                    ...lesson,
                    cartId: Date.now() + Math.random()
                });
                this.updateLessonSpaces(lesson.id, lesson.spaces - 1);
                lesson.spaces--;
            }
        },
        
        // Remove item from cart with v-on
        removeFromCart(cartId) {
            const index = this.cart.findIndex(item => item.cartId === cartId);
            if (index !== -1) {
                const cartItem = this.cart[index];
                const lesson = this.lessons.find(l => l.id === cartItem.id);
                if (lesson) {
                    this.updateLessonSpaces(lesson.id, lesson.spaces + 1);
                    lesson.spaces++;
                }
                this.cart.splice(index, 1);
            }
        },
        
        // Update lesson spaces in backend
        async updateLessonSpaces(lessonId, newSpaces) {
            try {
                await fetch(`${this.backendUrl}/api/lessons/${lessonId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ spaces: newSpaces })
                });
            } catch (error) {
                console.error('Error updating spaces:', error);
            }
        },
        
        // Submit order to backend
        async submitOrder() {
            if (!this.isCheckoutValid) return;
            
            try {
                const orderData = {
                    name: this.checkoutData.name,
                    phone: this.checkoutData.phone,
                    email: this.checkoutData.email,
                    lessons: this.cart.map(item => ({
                        lessonId: item.id,
                        subject: item.subject,
                        price: item.price
                    })),
                    total: this.cartTotal,
                    orderDate: new Date().toISOString()
                };
                
                const response = await fetch(`${this.backendUrl}/api/orders`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(orderData)
                });
                
                if (response.ok) {
                    this.orderSubmitted = true;
                    this.cart = [];
                    this.checkoutData = { name: '', phone: '', email: '' };
                    setTimeout(() => {
                        this.orderSubmitted = false;
                        this.navigateTo('lessons');
                    }, 3000);
                }
            } catch (error) {
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