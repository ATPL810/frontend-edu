// Main Vue Application - Everything in one file
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
        backendUrl: 'https://your-backend-app.onrender.com' // Update with your backend URL
    },
    
    computed: {
        // Sort lessons based on selected criteria
        sortedLessons() {
            const lessonsToSort = this.searchQuery ? this.searchResults : this.lessons;
            
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
                this.lessons = this.getDemoLessons();
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
        
        // Add lesson to cart
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
        
        // Remove item from cart
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
        },
        
        // Render functions for Vue without templates
        render(createElement) {
            return createElement('div', { class: 'container' }, [
                this.renderHeader(createElement),
                this.renderNavigation(createElement),
                this.renderMainContent(createElement)
            ]);
        },
        
        renderHeader(createElement) {
            return createElement('div', { class: 'header' }, [
                createElement('h1', '🎵 Music Lesson Booking'),
                createElement('p', 'Book your favorite music lessons online!')
            ]);
        },
        
        renderNavigation(createElement) {
            return createElement('div', { class: 'navigation' }, [
                createElement('div', { class: 'nav-buttons' }, [
                    createElement('button', {
                        class: ['nav-btn', this.currentView === 'lessons' ? 'active' : ''],
                        on: { click: () => this.navigateTo('lessons') }
                    }, ' Lessons'),
                    createElement('button', {
                        class: ['nav-btn', this.currentView === 'cart' ? 'active' : ''],
                        attrs: { disabled: this.cart.length === 0 },
                        on: { click: () => this.navigateTo('cart') }
                    }, `Cart (${this.cart.length})`)
                ]),
                createElement('div', { class: 'search-sort-container' }, [
                    createElement('input', {
                        class: 'search-box',
                        attrs: {
                            type: 'text',
                            placeholder: 'Search lessons...'
                        },
                        domProps: { value: this.searchQuery },
                        on: {
                            input: (e) => {
                                this.searchQuery = e.target.value;
                                this.handleSearch();
                            }
                        }
                    }),
                    createElement('div', { class: 'sort-controls' }, [
                        createElement('select', {
                            domProps: { value: this.sortBy },
                            on: { change: (e) => this.sortBy = e.target.value }
                        }, [
                            createElement('option', { attrs: { value: 'subject' } }, 'Subject'),
                            createElement('option', { attrs: { value: 'location' } }, 'Location'),
                            createElement('option', { attrs: { value: 'price' } }, 'Price'),
                            createElement('option', { attrs: { value: 'spaces' } }, 'Spaces')
                        ]),
                        createElement('button', {
                            class: 'order-btn',
                            on: { click: this.toggleSortOrder }
                        }, this.sortOrder === 'asc' ? '↑ Asc' : '↓ Desc')
                    ])
                ])
            ]);
        },
        
        renderMainContent(createElement) {
            if (this.isLoading && this.currentView === 'lessons') {
                return createElement('div', { class: 'main-content' }, [
                    createElement('div', { class: 'loading' }, 'Loading lessons...')
                ]);
            }
            
            let content;
            switch (this.currentView) {
                case 'lessons':
                    content = this.renderLessonsView(createElement);
                    break;
                case 'cart':
                    content = this.renderCartView(createElement);
                    break;
                default:
                    content = createElement('div', 'Page not found');
            }
            
            return createElement('div', { class: 'main-content' }, [content]);
        },
        
        renderLessonsView(createElement) {
            const lessonsToShow = this.sortedLessons;
            
            return createElement('div', [
                createElement('h2', `Available Lessons (${lessonsToShow.length})`),
                lessonsToShow.length === 0 
                    ? createElement('p', { class: 'empty-state' }, 'No lessons found')
                    : createElement('div', { class: 'lesson-grid' }, 
                        lessonsToShow.map(lesson => this.renderLessonCard(createElement, lesson))
                    )
            ]);
        },
        
        renderLessonCard(createElement, lesson) {
            return createElement('div', { class: 'lesson-card' }, [
                createElement('div', { class: 'lesson-icon' }, [
                    createElement('i', { class: `fas ${lesson.icon}` })
                ]),
                createElement('h3', { class: 'lesson-subject' }, lesson.subject),
                createElement('div', { class: 'lesson-detail' }, [
                    createElement('i', { class: 'fas fa-map-marker-alt' }),
                    createElement('span', `Location: ${lesson.location}`)
                ]),
                createElement('div', { class: 'lesson-detail' }, [
                    createElement('i', { class: 'fas fa-pound-sign' }),
                    createElement('span', `Price: £${lesson.price}`)
                ]),
                createElement('div', { class: 'lesson-detail' }, [
                    createElement('i', { class: 'fas fa-users' }),
                    createElement('span', `Spaces: ${lesson.spaces}`)
                ]),
                createElement('button', {
                    class: 'add-to-cart-btn',
                    attrs: { disabled: lesson.spaces === 0 },
                    on: { click: () => this.addToCart(lesson) }
                }, lesson.spaces === 0 ? 'Sold Out' : 'Add to Cart')
            ]);
        },
        
        renderCartView(createElement) {
            return createElement('div', [
                createElement('h2', 'Your Shopping Cart'),
                this.cart.length === 0 
                    ? createElement('p', { class: 'empty-state' }, 'Your cart is empty')
                    : [
                        createElement('div', { class: 'cart-container' },
                            this.cart.map(item => 
                                createElement('div', { class: 'cart-item' }, [
                                    createElement('div', { class: 'cart-item-info' }, [
                                        createElement('div', { style: 'font-weight: bold;' }, item.subject),
                                        createElement('div', `Location: ${item.location} - £${item.price}`)
                                    ]),
                                    createElement('button', {
                                        class: 'remove-btn',
                                        on: { click: () => this.removeFromCart(item.cartId) }
                                    }, 'Remove')
                                ])
                            )
                        ),
                        createElement('div', { class: 'total-section' }, 
                            `Total: £${this.cartTotal}`
                        ),
                        this.renderCheckoutForm(createElement)
                    ]
            ]);
        },
        
        renderCheckoutForm(createElement) {
            if (this.orderSubmitted) {
                return createElement('div', { class: 'confirmation-message' }, [
                    createElement('h3', ' Order Submitted Successfully!'),
                    createElement('p', 'Thank you for your order. You will be redirected to lessons page shortly.')
                ]);
            }
            
            return createElement('div', { class: 'checkout-form' }, [
                createElement('h3', 'Checkout Information'),
                createElement('div', { class: 'form-group' }, [
                    createElement('label', { attrs: { for: 'name' } }, 'Full Name *'),
                    createElement('input', {
                        class: ['form-control', this.formErrors.name ? 'error' : ''],
                        attrs: {
                            type: 'text',
                            id: 'name',
                            placeholder: 'Enter your full name'
                        },
                        domProps: { value: this.checkoutData.name },
                        on: {
                            input: (e) => {
                                this.checkoutData.name = e.target.value;
                                this.validateForm();
                            }
                        }
                    }),
                    this.formErrors.name && createElement('div', { class: 'error-message' }, this.formErrors.name)
                ]),
                createElement('div', { class: 'form-group' }, [
                    createElement('label', { attrs: { for: 'phone' } }, 'Phone Number *'),
                    createElement('input', {
                        class: ['form-control', this.formErrors.phone ? 'error' : ''],
                        attrs: {
                            type: 'tel',
                            id: 'phone',
                            placeholder: 'Enter your phone number'
                        },
                        domProps: { value: this.checkoutData.phone },
                        on: {
                            input: (e) => {
                                this.checkoutData.phone = e.target.value;
                                this.validateForm();
                            }
                        }
                    }),
                    this.formErrors.phone && createElement('div', { class: 'error-message' }, this.formErrors.phone)
                ]),
                createElement('div', { class: 'form-group' }, [
                    createElement('label', { attrs: { for: 'email' } }, 'Email Address'),
                    createElement('input', {
                        class: 'form-control',
                        attrs: {
                            type: 'email',
                            id: 'email',
                            placeholder: 'Enter your email (optional)'
                        },
                        domProps: { value: this.checkoutData.email },
                        on: {
                            input: (e) => this.checkoutData.email = e.target.value
                        }
                    })
                ]),
                createElement('button', {
                    class: 'checkout-btn',
                    attrs: { disabled: !this.isCheckoutValid },
                    on: { click: this.submitOrder }
                }, `Place Order - £${this.cartTotal}`)
            ]);
        }
    },
    
    mounted() {
        this.fetchLessons();
        
        // Search as you type
        this.$watch('searchQuery', (newVal) => {
            this.handleSearch();
        });
    }
});