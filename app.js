const app = new Vue({
    el: '#app',
    //consists all the data properties used in the application and UI state
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
        //Below is the backend URL which links to the deployed backend server to frontend and fetches data 
        backendUrl: 'https://courses-1n06.onrender.com' 
    },
    
    computed: {
        // Sort lessons based on selected criteria
        sortedLessons() {
            //Chooses between search results and all lessons for sorting
            const lessonsToSort = this.searchQuery && this.searchResults.length > 0 
                ? this.searchResults 
                : this.lessons;
            
             //this copies the array so that the original stays intact if any changes are made
            return [...lessonsToSort].sort((a, b) => {
                // the values to compare based on sortBy which is subject
                let aValue = a[this.sortBy];
                let bValue = b[this.sortBy];
                
                // Convert to numbers for price and spaces sorting
                if (this.sortBy === 'price' || this.sortBy === 'spaces') {
                    aValue = Number(aValue);
                    bValue = Number(bValue);
                }
                //Determines sort order(-1)
                if (this.sortOrder === 'asc') {
                    //if aValue is greater than bValue, put a after b
                    return aValue > bValue ? 1 : -1;
                } else {
                    // if aValue is less than bValue, put a after b
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
        
        // Check if checkout form is valid through regular expressions(regex)
        isCheckoutValid() {
            const nameValid = /^[A-Za-z\s]+$/.test(this.checkoutData.name);
            const phoneValid = /^\d+$/.test(this.checkoutData.phone);
            return nameValid && phoneValid && this.cart.length > 0;
        }
    },
    
    methods: {
        // Fetch all lessons from backend
        fetchLessons() {
            this.isLoading = true;
            // fetches lessons from backend API for all available lessons(courses)
            fetch(`${this.backendUrl}/api/lessons`)
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Network response was not ok');
                    }
                    return response.json();
                })
                //map creates a new array with standardized lesson IDs
                // ...(spread operator) copies all properties of the lesson object thus facilitating handling of arrays with different ID naming conventions
                .then(lessons => {
                    this.lessons = lessons.map(lesson => ({
                        ...lesson,
                        id: lesson._id || lesson.id
                    }));
                })
                .catch(error => {
                    console.error('Error fetching lessons:', error);
                    alert('Error loading courses. Please check if backend is running.');
                })
                .finally(() => {
                    this.isLoading = false;
                });
        },

        // Clear search input and results for the search bar clear button
        clearSearch() {
            this.searchQuery = '';
            this.searchResults = [];
        },
        
        // Searching in lessons (Backend implementation)
        handleSearch() {
            if (!this.searchQuery.trim()) {
                this.searchResults = [];
                return;
            }
            //fetches search results from backend with the search query
            fetch(`${this.backendUrl}/api/search?q=${encodeURIComponent(this.searchQuery)}`)
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Search request failed');
                    }
                    return response.json();
                })
                //Search results are stored in searchResults array from backend to display in UI
                .then(searchResults => {
                    this.searchResults = searchResults;
                })
                .catch(error => {
                console.error('Search error:', error);
            });
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
                   lesson.spaces--;
                }
            }
        },
        
        // Remove item from cart with v-on
        removeFromCart(cartId) {
            // finds the index(place)  of the item to be removed
            const index = this.cart.findIndex(item => item.cartId === cartId);
            if (index !== -1) {
                const cartItem = this.cart[index];
                // Find the corresponding lesson to update spaces
                const lesson = this.lessons.find(l => l.id === cartItem.id);
                
                if (lesson) {
                    // Return ALL quantities back to available spaces using PUT
                    this.updateLessonSpaces(lesson.id, lesson.spaces + cartItem.quantity);
                    lesson.spaces += cartItem.quantity;
                }
                this.cart.splice(index, 1);
            }
        },
        
        // Update lesson spaces in backend
        updateLessonSpaces(lessonId, newSpaces) {
            //fetch lesson by ID and update spaces
            fetch(`${this.backendUrl}/api/lessons/${lessonId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ spaces: newSpaces })
            })

            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to update spaces');
                }
                return response.json();
            })
            
            .catch(error => {
                console.error('Error updating spaces:', error);
            });
        },
        
        // Submit order to backend
        submitOrder(event) {
            // Prevent default form submission
            if (event) event.preventDefault();
            
            if (!this.isCheckoutValid) {
                alert('Please fill in all required fields correctly.');
                return;
            }
            
            // Show processing popup
            this.isProcessingOrder = true;
            console.log(' Order processing popup shown');

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
                
                //Sending the order data to the backend
                 fetch(`${this.backendUrl}/api/orders`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(orderData)
            })
            .then(response => {
                if (!response.ok) {
                    return response.json().then(errorData => {
                        throw new Error(errorData.error || `HTTP ${response.status}`);
                    });
                }
                return response.json();
            })
            .then(result => {
                console.log('Order successful:', result);

               setTimeout(() => {
                    this.isProcessingOrder = false;
                    this.orderSubmitted = true;

                    //this clears the cart after the order is submitted
                    this.cart = [];
                    this.checkoutData = { name: '', phone: '', email: '' };
                    
                    // Refresh lessons to get updated spaces
                    this.fetchLessons();
                    
                    // Redirects  to courses page after showing success message
                    setTimeout(() => {
                        this.orderSubmitted = false;
                        this.navigateTo('lessons');
                    }, 1000);
                 // Shows the processing popup for 2 seconds   
                }, 2000); 

            })
            .catch(error => {
                this.isProcessingOrder = false;
                console.error('Error submitting order:', error);
                alert('Error submitting order. Please try again.');
            });
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