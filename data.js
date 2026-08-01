/* ============================================================
   CloudEats — Mock Data Layer
   In a real backend integration, every function/export in this
   file would be replaced by calls into services/*.ts hitting a
   real API. Kept as plain data + helpers here for the prototype.
   ============================================================ */

/* ---------- Formatting ---------- */
function formatINR(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}

/* ---------- Brand accent spectrum ----------
   Signature device: one shared kitchen, many identities.
   Every brand keeps ONE consistent accent hue across the whole
   app (card border, badges, menu highlights, buttons on its page). */
const KITCHENS = [
  {
    id: 'k1',
    slug: 'bombay-biryani-house',
    name: "Bombay Biryani House",
    cuisines: ['Indian', 'Biryani', 'Mughlai'],
    tagline: 'Dum-cooked biryani, slow and smoky',
    rating: 4.5,
    ratingCount: 2840,
    deliveryTimeMins: 32,
    priceForTwo: 450,
    isVeg: false,
    accent: '#E8552F',
    emoji: '🍛',
    fssai: '10023456789012',
    offer: '40% OFF up to ₹120',
    address: 'Cloud Kitchen Hub, Sector 18, Kolkata',
  },
  {
    id: 'k2',
    slug: 'nonnas-slice',
    name: "Nonna's Slice",
    cuisines: ['Italian', 'Pizza', 'Pasta'],
    tagline: 'Wood-fired pies, nonna-approved',
    rating: 4.6,
    ratingCount: 1920,
    deliveryTimeMins: 28,
    priceForTwo: 600,
    isVeg: false,
    accent: '#8A6E1F',
    emoji: '🍕',
    fssai: '10023456789013',
    offer: 'Flat ₹100 OFF above ₹499',
    address: 'Cloud Kitchen Hub, Sector 18, Kolkata',
  },
  {
    id: 'k3',
    slug: 'wok-this-way',
    name: 'Wok This Way',
    cuisines: ['Chinese', 'Asian', 'Noodles'],
    tagline: 'High-flame wok, low waiting time',
    rating: 4.3,
    ratingCount: 3110,
    deliveryTimeMins: 25,
    priceForTwo: 400,
    isVeg: false,
    accent: '#C4314B',
    emoji: '🥡',
    fssai: '10023456789014',
    offer: '30% OFF up to ₹90',
    address: 'Cloud Kitchen Hub, Sector 18, Kolkata',
  },
  {
    id: 'k4',
    slug: 'taco-fiesta',
    name: 'Taco Fiesta',
    cuisines: ['Mexican', 'Tex-Mex'],
    tagline: 'Street-style tacos, extra salsa',
    rating: 4.4,
    ratingCount: 1540,
    deliveryTimeMins: 30,
    priceForTwo: 500,
    isVeg: false,
    accent: '#D68A1F',
    emoji: '🌮',
    fssai: '10023456789015',
    offer: 'Buy 1 Get 1 on Tacos',
    address: 'Cloud Kitchen Hub, Sector 18, Kolkata',
  },
  {
    id: 'k5',
    slug: 'sushi-zen',
    name: 'Sushi Zen',
    cuisines: ['Japanese', 'Sushi', 'Ramen'],
    tagline: 'Precision rolls, quiet confidence',
    rating: 4.7,
    ratingCount: 980,
    deliveryTimeMins: 35,
    priceForTwo: 700,
    isVeg: false,
    accent: '#2E7D8C',
    emoji: '🍣',
    fssai: '10023456789016',
    offer: '20% OFF on orders above ₹599',
    address: 'Cloud Kitchen Hub, Sector 18, Kolkata',
  },
  {
    id: 'k6',
    slug: 'green-bowl',
    name: 'Green Bowl',
    cuisines: ['Healthy', 'Salads', 'Bowls'],
    tagline: 'Clean eating, still craveable',
    rating: 4.5,
    ratingCount: 760,
    deliveryTimeMins: 22,
    priceForTwo: 380,
    isVeg: true,
    accent: '#3E9C7D',
    emoji: '🥗',
    fssai: '10023456789017',
    offer: 'Flat 15% OFF',
    address: 'Cloud Kitchen Hub, Sector 18, Kolkata',
  },
  {
    id: 'k7',
    slug: 'sweet-tooth',
    name: 'Sweet Tooth',
    cuisines: ['Desserts', 'Bakery'],
    tagline: 'Small bites, big sugar rush',
    rating: 4.6,
    ratingCount: 1210,
    deliveryTimeMins: 24,
    priceForTwo: 300,
    isVeg: true,
    accent: '#A15FBF',
    emoji: '🍰',
    fssai: '10023456789018',
    offer: '₹75 OFF above ₹299',
    address: 'Cloud Kitchen Hub, Sector 18, Kolkata',
  },
];

/* ---------- Menu items ---------- */
const MENU = {
  k1: [
    { id: 'k1-1', category: 'Biryani', name: 'Hyderabadi Chicken Dum Biryani', description: 'Basmati rice, slow-cooked with spiced chicken, saffron & fried onions.', priceINR: 289, isVeg: false, emoji: '🍛', bestseller: true, customizations: [{ name: 'Spice level', options: ['Mild', 'Medium', 'Hot'] }] },
    { id: 'k1-2', category: 'Biryani', name: 'Mutton Biryani', description: 'Tender mutton chunks layered with long-grain basmati, dum-sealed.', priceINR: 349, isVeg: false, emoji: '🍛', customizations: [{ name: 'Spice level', options: ['Mild', 'Medium', 'Hot'] }] },
    { id: 'k1-3', category: 'Biryani', name: 'Veg Dum Biryani', description: 'Seasonal vegetables and paneer, dum-cooked with whole spices.', priceINR: 229, isVeg: true, emoji: '🍚', customizations: [] },
    { id: 'k1-4', category: 'Starters', name: 'Chicken 65', description: 'Deep-fried spiced chicken bites, curry-leaf tempered.', priceINR: 219, isVeg: false, emoji: '🍗', customizations: [] },
    { id: 'k1-5', category: 'Starters', name: 'Paneer Tikka', description: 'Charred cottage cheese cubes marinated in yoghurt & spices.', priceINR: 199, isVeg: true, emoji: '🧀', customizations: [] },
    { id: 'k1-6', category: 'Mains', name: 'Butter Chicken', description: 'Creamy tomato gravy, tandoori chicken, a hint of kasuri methi.', priceINR: 299, isVeg: false, emoji: '🍲', bestseller: true, customizations: [] },
    { id: 'k1-7', category: 'Breads', name: 'Butter Naan (2 pc)', description: 'Tandoor-baked, brushed with butter.', priceINR: 79, isVeg: true, emoji: '🫓', customizations: [] },
    { id: 'k1-8', category: 'Beverages', name: 'Mint Lassi', description: 'Chilled yoghurt, fresh mint, a pinch of black salt.', priceINR: 89, isVeg: true, emoji: '🥤', customizations: [] },
    { id: 'k1-9', category: 'Desserts', name: 'Double Ka Meetha', description: 'Bread pudding soaked in saffron milk, garnished with nuts.', priceINR: 129, isVeg: true, emoji: '🍮', customizations: [] },
  ],
  k2: [
    { id: 'k2-1', category: 'Pizza', name: 'Margherita Sottile', description: 'San Marzano tomato, fior di latte, torn basil, thin crust.', priceINR: 329, isVeg: true, emoji: '🍕', bestseller: true, customizations: [{ name: 'Crust', options: ['Thin', 'Pan', 'Stuffed +₹60'] }] },
    { id: 'k2-2', category: 'Pizza', name: 'Diavola', description: 'Spicy salami, chilli oil, mozzarella.', priceINR: 419, isVeg: false, emoji: '🍕', customizations: [{ name: 'Crust', options: ['Thin', 'Pan', 'Stuffed +₹60'] }] },
    { id: 'k2-3', category: 'Pasta', name: 'Spaghetti Aglio e Olio', description: 'Garlic, chilli flakes, olive oil, parsley, parmesan.', priceINR: 289, isVeg: true, emoji: '🍝', customizations: [] },
    { id: 'k2-4', category: 'Pasta', name: 'Fettuccine Alfredo con Pollo', description: 'Grilled chicken, cream, parmesan, cracked pepper.', priceINR: 349, isVeg: false, emoji: '🍝', bestseller: true, customizations: [] },
    { id: 'k2-5', category: 'Starters', name: 'Garlic Focaccia', description: 'Rosemary & sea salt, olive oil dip.', priceINR: 149, isVeg: true, emoji: '🥖', customizations: [] },
    { id: 'k2-6', category: 'Starters', name: 'Bruschetta al Pomodoro', description: 'Toasted ciabatta, tomato, basil, balsamic glaze.', priceINR: 179, isVeg: true, emoji: '🍅', customizations: [] },
    { id: 'k2-7', category: 'Mains', name: 'Chicken Parmigiana', description: 'Breaded chicken, marinara, melted mozzarella.', priceINR: 399, isVeg: false, emoji: '🍗', customizations: [] },
    { id: 'k2-8', category: 'Desserts', name: 'Tiramisu Cup', description: 'Espresso-soaked ladyfingers, mascarpone, cocoa dust.', priceINR: 169, isVeg: true, emoji: '🍮', customizations: [] },
    { id: 'k2-9', category: 'Beverages', name: 'Italian Soda', description: 'Sparkling water, fruit syrup of the day.', priceINR: 99, isVeg: true, emoji: '🥤', customizations: [] },
  ],
  k3: [
    { id: 'k3-1', category: 'Noodles', name: 'Veg Hakka Noodles', description: 'Wok-tossed noodles, julienned vegetables, soy & vinegar.', priceINR: 189, isVeg: true, emoji: '🍜', customizations: [] },
    { id: 'k3-2', category: 'Noodles', name: 'Schezwan Chicken Noodles', description: 'Fiery Schezwan sauce, egg ribbons, spring onion.', priceINR: 249, isVeg: false, emoji: '🍜', bestseller: true, customizations: [{ name: 'Spice level', options: ['Medium', 'Extra Hot'] }] },
    { id: 'k3-3', category: 'Rice', name: 'Chicken Fried Rice', description: 'Wok-fired rice, egg, spring onion, soy glaze.', priceINR: 239, isVeg: false, emoji: '🍚', customizations: [] },
    { id: 'k3-4', category: 'Starters', name: 'Chilli Paneer (Dry)', description: 'Batter-fried paneer, capsicum, onion, chilli-garlic glaze.', priceINR: 219, isVeg: true, emoji: '🧀', customizations: [] },
    { id: 'k3-5', category: 'Starters', name: 'Crispy Chicken Lollipop', description: 'Frenched chicken wings, spicy red glaze.', priceINR: 259, isVeg: false, emoji: '🍗', bestseller: true, customizations: [] },
    { id: 'k3-6', category: 'Mains', name: 'Kung Pao Chicken', description: 'Peanuts, dried red chilli, spring onion, sweet-savoury glaze.', priceINR: 289, isVeg: false, emoji: '🥘', customizations: [] },
    { id: 'k3-7', category: 'Mains', name: 'Manchurian Gravy (Veg)', description: 'Fried veg balls in a tangy, thick manchurian sauce.', priceINR: 209, isVeg: true, emoji: '🥘', customizations: [] },
    { id: 'k3-8', category: 'Beverages', name: 'Lemon Iced Tea', description: 'Brewed tea, fresh lemon, light sweetness.', priceINR: 89, isVeg: true, emoji: '🥤', customizations: [] },
    { id: 'k3-9', category: 'Desserts', name: 'Honey Noodles', description: 'Crisp fried noodles drizzled with honey & sesame.', priceINR: 149, isVeg: true, emoji: '🍯', customizations: [] },
  ],
  k4: [
    { id: 'k4-1', category: 'Tacos', name: 'Al Pastor Tacos (3 pc)', description: 'Marinated pork, pineapple, cilantro, onion, corn tortilla.', priceINR: 249, isVeg: false, emoji: '🌮', bestseller: true, customizations: [] },
    { id: 'k4-2', category: 'Tacos', name: 'Grilled Veggie Tacos (3 pc)', description: 'Charred bell peppers, corn, black beans, chipotle crema.', priceINR: 209, isVeg: true, emoji: '🌮', customizations: [] },
    { id: 'k4-3', category: 'Burritos', name: 'Chicken Burrito Bowl', description: 'Cilantro rice, grilled chicken, beans, pico de gallo, cheese.', priceINR: 289, isVeg: false, emoji: '🌯', customizations: [] },
    { id: 'k4-4', category: 'Starters', name: 'Loaded Nachos', description: 'Corn chips, queso, jalapeños, salsa, sour cream.', priceINR: 229, isVeg: true, emoji: '🧀', bestseller: true, customizations: [] },
    { id: 'k4-5', category: 'Starters', name: 'Chipotle Corn Elote', description: 'Grilled corn, chipotle mayo, cotija cheese, lime.', priceINR: 159, isVeg: true, emoji: '🌽', customizations: [] },
    { id: 'k4-6', category: 'Mains', name: 'Beef Barbacoa Quesadilla', description: 'Slow-braised beef, melted cheese, flour tortilla.', priceINR: 319, isVeg: false, emoji: '🫔', customizations: [] },
    { id: 'k4-7', category: 'Mains', name: 'Veg Enchiladas', description: 'Corn tortillas, roasted vegetables, red sauce, cheese.', priceINR: 269, isVeg: true, emoji: '🫔', customizations: [] },
    { id: 'k4-8', category: 'Beverages', name: 'Watermelon Agua Fresca', description: 'Fresh watermelon, lime, mint.', priceINR: 109, isVeg: true, emoji: '🍉', customizations: [] },
    { id: 'k4-9', category: 'Desserts', name: 'Churros with Chocolate', description: 'Cinnamon-sugar churros, warm chocolate dip.', priceINR: 149, isVeg: true, emoji: '🍩', customizations: [] },
  ],
  k5: [
    { id: 'k5-1', category: 'Sushi', name: 'California Roll (8 pc)', description: 'Crab stick, avocado, cucumber, tobiko.', priceINR: 349, isVeg: false, emoji: '🍣', bestseller: true, customizations: [] },
    { id: 'k5-2', category: 'Sushi', name: 'Spicy Tuna Roll (8 pc)', description: 'Tuna, spicy mayo, scallion, sesame.', priceINR: 399, isVeg: false, emoji: '🍣', customizations: [] },
    { id: 'k5-3', category: 'Sushi', name: 'Veg Avocado Roll (8 pc)', description: 'Avocado, cucumber, pickled radish.', priceINR: 299, isVeg: true, emoji: '🍣', customizations: [] },
    { id: 'k5-4', category: 'Ramen', name: 'Shoyu Chicken Ramen', description: 'Soy-based broth, chicken chashu, soft egg, scallion.', priceINR: 379, isVeg: false, emoji: '🍜', bestseller: true, customizations: [] },
    { id: 'k5-5', category: 'Ramen', name: 'Miso Veg Ramen', description: 'Miso broth, tofu, corn, bamboo shoot, bok choy.', priceINR: 329, isVeg: true, emoji: '🍜', customizations: [] },
    { id: 'k5-6', category: 'Starters', name: 'Chicken Gyoza (6 pc)', description: 'Pan-seared dumplings, ponzu dip.', priceINR: 249, isVeg: false, emoji: '🥟', customizations: [] },
    { id: 'k5-7', category: 'Starters', name: 'Edamame', description: 'Steamed soybeans, sea salt.', priceINR: 149, isVeg: true, emoji: '🫛', customizations: [] },
    { id: 'k5-8', category: 'Beverages', name: 'Yuzu Iced Tea', description: 'Green tea, yuzu citrus, light honey.', priceINR: 119, isVeg: true, emoji: '🍵', customizations: [] },
    { id: 'k5-9', category: 'Desserts', name: 'Matcha Cheesecake', description: 'Japanese matcha, creamy base, biscuit crust.', priceINR: 189, isVeg: true, emoji: '🍰', customizations: [] },
  ],
  k6: [
    { id: 'k6-1', category: 'Bowls', name: 'Quinoa Power Bowl', description: 'Quinoa, roasted chickpeas, avocado, cherry tomato, tahini.', priceINR: 289, isVeg: true, emoji: '🥗', bestseller: true, customizations: [] },
    { id: 'k6-2', category: 'Bowls', name: 'Grilled Chicken Protein Bowl', description: 'Grilled chicken, brown rice, greens, peri-peri dressing.', priceINR: 329, isVeg: false, emoji: '🥗', customizations: [] },
    { id: 'k6-3', category: 'Salads', name: 'Greek Salad', description: 'Cucumber, feta, olives, cherry tomato, oregano vinaigrette.', priceINR: 249, isVeg: true, emoji: '🥙', customizations: [] },
    { id: 'k6-4', category: 'Salads', name: 'Caesar Salad with Chicken', description: 'Romaine, parmesan, garlic croutons, grilled chicken, caesar dressing.', priceINR: 299, isVeg: false, emoji: '🥙', bestseller: true, customizations: [] },
    { id: 'k6-5', category: 'Starters', name: 'Beetroot Hummus with Pita', description: 'Roasted beetroot hummus, whole-wheat pita.', priceINR: 189, isVeg: true, emoji: '🫓', customizations: [] },
    { id: 'k6-6', category: 'Mains', name: 'Zucchini Noodle Stir-fry', description: 'Zoodles, tofu, bell pepper, sesame-ginger sauce.', priceINR: 259, isVeg: true, emoji: '🍜', customizations: [] },
    { id: 'k6-7', category: 'Beverages', name: 'Cold-Pressed Green Juice', description: 'Spinach, apple, cucumber, celery, lemon.', priceINR: 149, isVeg: true, emoji: '🥤', customizations: [] },
    { id: 'k6-8', category: 'Beverages', name: 'Berry Protein Smoothie', description: 'Mixed berries, banana, whey, almond milk.', priceINR: 179, isVeg: true, emoji: '🥤', customizations: [] },
    { id: 'k6-9', category: 'Desserts', name: 'Date & Almond Energy Bites', description: 'No added sugar, 4 pieces.', priceINR: 129, isVeg: true, emoji: '🍪', customizations: [] },
  ],
  k7: [
    { id: 'k7-1', category: 'Cakes', name: 'Belgian Chocolate Truffle Slice', description: 'Dense chocolate sponge, ganache, cocoa shavings.', priceINR: 149, isVeg: true, emoji: '🍰', bestseller: true, customizations: [] },
    { id: 'k7-2', category: 'Cakes', name: 'Red Velvet Slice', description: 'Cream cheese frosting, cocoa crumb.', priceINR: 159, isVeg: true, emoji: '🍰', customizations: [] },
    { id: 'k7-3', category: 'Pastries', name: 'Nutella Croissant', description: 'Buttery, flaky, warm Nutella core.', priceINR: 119, isVeg: true, emoji: '🥐', bestseller: true, customizations: [] },
    { id: 'k7-4', category: 'Pastries', name: 'Blueberry Cheesecake Cup', description: 'Baked cheesecake, blueberry compote.', priceINR: 169, isVeg: true, emoji: '🍮', customizations: [] },
    { id: 'k7-5', category: 'Cookies', name: 'Double Choc-Chip Cookie', description: 'Warm, gooey centre, sea-salt flakes.', priceINR: 79, isVeg: true, emoji: '🍪', customizations: [] },
    { id: 'k7-6', category: 'Ice Cream', name: 'Belgian Chocolate Tub (500ml)', description: 'Rich, churned dark chocolate ice cream.', priceINR: 249, isVeg: true, emoji: '🍨', customizations: [] },
    { id: 'k7-7', category: 'Ice Cream', name: 'Alphonso Mango Tub (500ml)', description: 'Seasonal mango, real fruit pulp.', priceINR: 259, isVeg: true, emoji: '🍨', customizations: [] },
    { id: 'k7-8', category: 'Beverages', name: 'Belgian Hot Chocolate', description: 'Thick, rich, marshmallow on top.', priceINR: 139, isVeg: true, emoji: '☕', customizations: [] },
    { id: 'k7-9', category: 'Beverages', name: 'Cold Coffee with Ice Cream', description: 'Brewed coffee, milk, vanilla ice cream.', priceINR: 159, isVeg: true, emoji: '🥤', customizations: [] },
  ],
};

/* ---------- Coupons ---------- */
const COUPONS = {
  WELCOME50: { code: 'WELCOME50', description: 'Flat ₹50 off on your first order', type: 'flat', value: 50, minOrder: 149 },
  FLAT100: { code: 'FLAT100', description: '₹100 off on orders above ₹499', type: 'flat', value: 100, minOrder: 499 },
  CLOUD20: { code: 'CLOUD20', description: '20% off up to ₹80', type: 'percent', value: 20, cap: 80, minOrder: 199 },
};

/* ---------- Cuisine chips for home page ---------- */
const CUISINE_CHIPS = [
  { name: 'Indian', emoji: '🍛' },
  { name: 'Italian', emoji: '🍕' },
  { name: 'Chinese', emoji: '🥡' },
  { name: 'Mexican', emoji: '🌮' },
  { name: 'Japanese', emoji: '🍣' },
  { name: 'Healthy', emoji: '🥗' },
  { name: 'Desserts', emoji: '🍰' },
  { name: 'Beverages', emoji: '🥤' },
];

/* ---------- Testimonials ---------- */
const TESTIMONIALS = [
  { name: 'Ananya R.', city: 'Kolkata', quote: 'Ordered from three different kitchens in one cart-free week — the biryani and the ramen were both spot on.', rating: 5 },
  { name: 'Rohit S.', city: 'Kolkata', quote: 'Delivery time estimates are honest for once. Out-for-delivery actually meant 10 minutes, not 40.', rating: 5 },
  { name: 'Meher K.', city: 'Kolkata', quote: 'Green Bowl has genuinely changed my lunch routine. Portion sizes are fair for the price.', rating: 4 },
  { name: 'Devika P.', city: 'Kolkata', quote: 'Love that every brand feels distinct even though I know it is one delivery fleet behind it.', rating: 5 },
];

function getKitchenBySlug(slug) {
  return KITCHENS.find((k) => k.slug === slug);
}
function getKitchenById(id) {
  return KITCHENS.find((k) => k.id === id);
}
function getMenu(kitchenId) {
  return MENU[kitchenId] || [];
}
function getMenuItem(kitchenId, itemId) {
  return getMenu(kitchenId).find((m) => m.id === itemId);
}
