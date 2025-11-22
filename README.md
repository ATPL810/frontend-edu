# Frontend of the Course Booking System

The Project is a responsive course booking system built with Vue.js that allows any user to browse(search) lessons(Courses), add courses to cart, sort courses according to their field and also completing orders/purchases with a pleasant checkout experience.

The App uses the Vue.js(Vue2) framework for which the app.js fetches every corresponding URL(via fetch) using promises(.then, .catch) to connect to the backend (deployed on render.com).

The Frontend is deployed through GitHub Pages in the Git repository of [https://github.com/ATPL810/frontend-edu]

The Frontend connects with the Backend through the backendUrl: [https://courses-1n06.onrender.com].

## Courses page

When the user enters the page, the courses(lesson list) will be displayed(using v-for) with the search bar which is search as you type(Real-time), the filter is by subject, location, price and spaces and all the fields are responsive to the ascending and descending order.

In the Courses page, every lessons have an "Add to cart" button for which the user can choice, select their courses they want to learn and the number of available spaces will decrease(using v-on). when they select a course, the cart button will be activated with the selected couse(s). if the user has selected all spaces, the course will be visible but the button will be disabled and "Sold Out" message will be output.

## Cart

Once the cart is activated by selecting a course, the user can now navigate to the cart page by clicking on the cart button. The user will navigate to the cart page where the shopping list and the checkout form is available. In the shopping list there will be section(s) of the chosen courses which will consist of the image, location, quantity of spaces, the price and a remove button. If the user removes all the items from the shopping list, the page will dismiss all and will indicate cart is empty, then when the user navigates back in the courses page, the cart is disabled and the number of spaces are restored.

## Checkout

The checkout form is only available in the cart page. However its button "Checkout Order - &**" is only available if the name and phone field is entered. The email is optional. For the name, there is a validation, where only letters must be entered and the phone number must be in the range of 7 or 8 Numbers only. Both validation check is done in javascript in the validateForm method.
If all the conditions are matched, the user will be able to checkout for which a loading screen message will popup confirming the submission, order and paying process. When the loading screen disappears, the empty cart screen will display empty for ~1s while the courses page reloads and the user is redirected automatically in the courses page where he will notice, the number of spaces have decreased or sold out if all the spaces were purchased.
