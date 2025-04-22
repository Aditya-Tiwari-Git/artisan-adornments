// ===== Constants =====
const SHEET_URL =
  "https://docs.google.com/spreadsheets/d/1ZQFhHfbv7t0feGMlihnnHT8qiIkcHJEk3RIq3i3yPJ0/gviz/tq?"; // Direct Google Sheets URL // Endpoint to fetch Google Sheets data
const WHATSAPP_NUMBER = "918619999198";
const WISHLIST_STORAGE_KEY = "artisan_adornments_wishlist";

// ===== State Management =====
let allProducts = [];
let activeCategory = "all";
let searchQuery = "";
let wishlist = loadWishlistFromStorage();

// ===== DOM Elements =====
document.addEventListener("DOMContentLoaded", function () {
  // Get references to DOM elements
  const featuredProductsEl = document.getElementById("featured-products");
  const productsContainerEl = document.getElementById("products-container");
  const categoryFilterEl = document.getElementById("category-filter");
  const footerCategoriesEl = document.getElementById("footer-categories");
  const searchInputEl = document.getElementById("search-input");
  const searchButtonEl = document.getElementById("search-button");
  const contactFormEl = document.getElementById("contact-form");
  const toastContainerEl = document.getElementById("toast-container");
  const currentYearEl = document.getElementById("current-year");
  const wishlistCounterEl = document.getElementById("wishlist-counter");
  const wishlistContainerEl = document.getElementById("wishlist-container");
  const wishlistToggleBtn = document.getElementById("wishlist-toggle");
  const wishlistToggleNavBtn = document.getElementById("wishlist-toggle-nav");

  // ===== Set Current Year in Footer =====
  currentYearEl.textContent = new Date().getFullYear();

  // ===== Update Wishlist Counter =====
  updateWishlistCounter();

  // ===== Toggle Wishlist Section =====
  function toggleWishlistSection() {
    const wishlistSectionEl = document.getElementById("wishlist-section");

    if (wishlistSectionEl.style.display === "none") {
      wishlistSectionEl.style.display = "block";
      if (wishlistToggleBtn) {
        wishlistToggleBtn.innerHTML =
          '<i class="fas fa-heart-broken"></i> Hide Wishlist';
      }
      renderWishlist();
    } else {
      wishlistSectionEl.style.display = "none";
      if (wishlistToggleBtn) {
        wishlistToggleBtn.innerHTML =
          '<i class="fas fa-heart"></i> View Wishlist';
      }
    }
  }

  if (wishlistToggleBtn) {
    wishlistToggleBtn.addEventListener("click", toggleWishlistSection);
  }

  if (wishlistToggleNavBtn) {
    wishlistToggleNavBtn.addEventListener("click", function (e) {
      e.preventDefault();
      toggleWishlistSection();
      // Scroll to wishlist section
      document
        .getElementById("wishlist-section")
        .scrollIntoView({ behavior: "smooth" });
    });
  }

  // ===== Initialize the App =====
  fetchProducts();

  // ===== Event Listeners =====
  // Search input
  searchInputEl.addEventListener("input", handleSearch);

  // Search button
  searchButtonEl.addEventListener("click", handleSearch);

  // Contact form submission
  contactFormEl.addEventListener("submit", function (e) {
    e.preventDefault();

    const name = document.getElementById("name").value;
    const email = document.getElementById("email").value;
    const message = document.getElementById("message").value;

    // Validate form
    if (!name || !email || !message) {
      showToast("Error", "Please fill in all fields", "error");
      return;
    }

    // Show success message (in a real application, you'd send this to a server)
    showToast(
      "Message Sent",
      "Thank you for your message. We'll get back to you soon!"
    );

    // Reset form
    contactFormEl.reset();
  });

  // Smooth scroll for anchor links
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", function (e) {
      const href = this.getAttribute("href");

      if (href !== "#") {
        e.preventDefault();
        const targetElement = document.querySelector(href);

        if (targetElement) {
          targetElement.scrollIntoView({
            behavior: "smooth",
          });
        }
      }
    });
  });
});

// ===== Fetch Products Function =====
async function fetchProducts() {
  try {
    showLoading();

    const response = await fetch(SHEET_URL);

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.text();

    // Google Sheets API returns JSON-like data wrapped in additional text
    // We need to extract the JSON part
    const prefix = "/*O_o*/\ngoogle.visualization.Query.setResponse(";
    const suffix = ");";

    let jsonString = data;

    if (data.startsWith(prefix)) {
      jsonString = data.substring(prefix.length);

      if (jsonString.endsWith(suffix)) {
        jsonString = jsonString.substring(0, jsonString.length - suffix.length);
      }
    } else {
      // Alternative parsing method if the format changes
      const jsonStart = data.indexOf("{");
      const jsonEnd = data.lastIndexOf("}") + 1;

      if (jsonStart === -1 || jsonEnd === 0) {
        throw new Error("Invalid response format from Google Sheets");
      }

      jsonString = data.substring(jsonStart, jsonEnd);
    }

    // Parse the extracted JSON
    const parsedData = JSON.parse(jsonString);

    // Map the response data to our product format
    allProducts = parseProductsFromResponse(parsedData);

    // Render products
    renderProducts();

    // Extract and render categories
    renderCategories();

    // Render wishlist if needed
    if (wishlist.length > 0) {
      renderWishlist();
      document.getElementById("wishlist-section").style.display = "block";
    }
  } catch (error) {
    console.error("Error fetching products:", error);
    showError();
  }
}

// ===== Parse Products from Google Sheets Response =====
function parseProductsFromResponse(data) {
  if (!data.table || !data.table.rows) {
    return [];
  }

  const products = data.table.rows
    .filter((row) => row.c && row.c.length > 0)
    .map((row, index) => {
      const cells = row.c;

      return {
        id: cells[0] && cells[0].v ? cells[0].v : index,
        name: cells[1] && cells[1].v ? cells[1].v : "Unnamed Product",
        category: cells[2] && cells[2].v ? cells[2].v : "Uncategorized",
        price: cells[3] && cells[3].v ? parseFloat(cells[3].v.toString()) : 0,
        description: cells[4] && cells[4].v ? cells[4].v : "",
        imageURL: cells[5] && cells[5].v ? cells[5].v : "",
        isAvailable: cells[6] && cells[6].v ? cells[6].v !== "No" : true,
        featured: cells[7] && cells[7].v ? cells[7].v === "Yes" : false,
        whatsAppMessage: cells[8] && cells[8].v ? cells[8].v : "",
        tags: cells[9] && cells[9].v ? cells[9].v : "",
        addedOn: cells[10] && cells[10].v ? cells[10].v : "",
        displayOrder:
          cells[11] && cells[11].v ? parseInt(cells[11].v.toString()) : 999,
        offer: cells[12] && cells[12].v ? cells[12].v : "",
      };
    });

  // Sort products by display order
  return products.sort((a, b) => a.displayOrder - b.displayOrder);
}

// ===== Wishlist Management =====
function loadWishlistFromStorage() {
  const storedWishlist = localStorage.getItem(WISHLIST_STORAGE_KEY);
  return storedWishlist ? JSON.parse(storedWishlist) : [];
}

function saveWishlistToStorage() {
  localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(wishlist));
}

function addToWishlist(productId) {
  if (!wishlist.includes(productId)) {
    wishlist.push(productId);
    saveWishlistToStorage();
    updateWishlistCounter();
    showToast("Added to Wishlist", "Item has been added to your wishlist");

    // If wishlist section exists, update it
    if (document.getElementById("wishlist-products")) {
      renderWishlist();
    }

    return true;
  }
  return false;
}

function removeFromWishlist(productId) {
  const index = wishlist.indexOf(productId);
  if (index > -1) {
    wishlist.splice(index, 1);
    saveWishlistToStorage();
    updateWishlistCounter();
    showToast(
      "Removed from Wishlist",
      "Item has been removed from your wishlist"
    );

    // If wishlist section exists, update it
    if (document.getElementById("wishlist-products")) {
      renderWishlist();
    }

    return true;
  }
  return false;
}

function toggleWishlist(productId) {
  if (wishlist.includes(productId)) {
    return removeFromWishlist(productId);
  } else {
    return addToWishlist(productId);
  }
}

function updateWishlistCounter() {
  const wishlistCounter = document.getElementById("wishlist-counter");
  if (wishlistCounter) {
    if (wishlist.length > 0) {
      wishlistCounter.textContent = wishlist.length;
      wishlistCounter.style.display = "flex";
    } else {
      wishlistCounter.style.display = "none";
    }
  }
}

function renderWishlist() {
  const wishlistProductsEl = document.getElementById("wishlist-products");
  if (wishlistProductsEl) {
    if (wishlist.length === 0) {
      wishlistProductsEl.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-heart-broken"></i>
          <h3>Your wishlist is empty</h3>
          <p>Add products to your wishlist by clicking the heart icon on product cards.</p>
        </div>
      `;
    } else {
      const wishlistProducts = allProducts.filter((product) =>
        wishlist.includes(product.id)
      );

      wishlistProductsEl.innerHTML = `
        <div class="products-grid">
          ${wishlistProducts
            .map((product) => createProductCardHTML(product))
            .join("")}
        </div>
      `;

      // Add event listeners to wishlist buttons
      wishlistProductsEl
        .querySelectorAll(".wishlist-button")
        .forEach((button) => {
          const productId = button.closest(".product-card").dataset.id;
          button.addEventListener("click", function () {
            toggleWishlist(productId);
            button.classList.toggle("active");
          });
        });
    }
  }
}

// ===== Filter Products by Category and Search Query =====
function filterProducts() {
  return allProducts.filter((product) => {
    // Filter by category
    const categoryMatch =
      activeCategory === "all" || product.category === activeCategory;

    // Filter by search query
    const searchRegex = new RegExp(searchQuery, "i");
    const searchMatch =
      !searchQuery ||
      searchRegex.test(product.name) ||
      searchRegex.test(product.tags);

    return categoryMatch && searchMatch;
  });
}

// ===== Render Products =====
function renderProducts() {
  const filteredProducts = filterProducts();
  const featuredProducts = filteredProducts.filter(
    (product) => product.featured
  );

  // Render featured products
  const featuredProductsEl = document.getElementById("featured-products");
  if (featuredProductsEl) {
    if (featuredProducts.length > 0) {
      featuredProductsEl.innerHTML = featuredProducts
        .map((product) => createProductCardHTML(product))
        .join("");
      document.getElementById("featured").style.display = "block";

      // Add event listeners to wishlist buttons
      featuredProductsEl
        .querySelectorAll(".wishlist-button")
        .forEach((button) => {
          const productId = button.closest(".product-card").dataset.id;
          button.addEventListener("click", function () {
            toggleWishlist(productId);
            button.classList.toggle("active");
          });
        });
    } else {
      document.getElementById("featured").style.display = "none";
    }
  }

  // Render all filtered products
  const productsContainerEl = document.getElementById("products-container");
  if (productsContainerEl) {
    if (filteredProducts.length > 0) {
      productsContainerEl.innerHTML = `
        <div class="products-grid">
          ${filteredProducts
            .map((product) => createProductCardHTML(product))
            .join("")}
        </div>
      `;

      // Add event listeners to wishlist buttons
      productsContainerEl
        .querySelectorAll(".wishlist-button")
        .forEach((button) => {
          const productId = button.closest(".product-card").dataset.id;
          button.addEventListener("click", function () {
            toggleWishlist(productId);
            button.classList.toggle("active");

            // Update wishlist section if it's visible
            if (
              document.getElementById("wishlist-section").style.display !==
              "none"
            ) {
              renderWishlist();
            }
          });
        });
    } else {
      // Show empty state
      productsContainerEl.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-search"></i>
          <h3>No items found</h3>
          <p>Try adjusting your search or filter to find what you're looking for.</p>
        </div>
      `;
    }
  }
}

// ===== Extract Categories from Products =====
function extractCategories() {
  const categorySet = new Set();

  allProducts.forEach((product) => {
    if (product.category) {
      categorySet.add(product.category);
    }
  });

  return Array.from(categorySet);
}

// ===== Render Categories =====
function renderCategories() {
  const categories = extractCategories();

  // Render category filter buttons
  const categoryFilterEl = document.getElementById("category-filter");
  if (categoryFilterEl) {
    const categoryButtonsHTML = categories
      .map(
        (category) =>
          `<button class="category-btn ${
            activeCategory === category ? "active" : ""
          }" data-category="${category}">${category}</button>`
      )
      .join("");

    // Update the category filter
    const allButton = `<button class="category-btn ${
      activeCategory === "all" ? "active" : ""
    }" data-category="all">All Items</button>`;
    categoryFilterEl.innerHTML = allButton + categoryButtonsHTML;

    // Add event listeners to category buttons
    document.querySelectorAll(".category-btn").forEach((button) => {
      button.addEventListener("click", function () {
        activeCategory = this.dataset.category;

        // Update active state
        document
          .querySelectorAll(".category-btn")
          .forEach((btn) => btn.classList.remove("active"));
        this.classList.add("active");

        // Re-render products
        renderProducts();
      });
    });
  }

  // Render footer categories
  const footerCategoriesEl = document.getElementById("footer-categories");
  if (footerCategoriesEl) {
    footerCategoriesEl.innerHTML =
      categories.length > 0
        ? categories
            .map(
              (category) =>
                `<li><a href="#" data-category="${category}">${category}</a></li>`
            )
            .join("")
        : `
          <li><a href="#">Saree</a></li>
          <li><a href="#">Jewellery</a></li>
          <li><a href="#">God Veshbusha</a></li>
          <li><a href="#">Spiritual Cloth</a></li>
        `;

    // Add event listeners to footer category links
    document.querySelectorAll("#footer-categories a").forEach((link) => {
      link.addEventListener("click", function (e) {
        e.preventDefault();

        if (this.dataset.category) {
          activeCategory = this.dataset.category;

          // Update active state in the category filter
          document.querySelectorAll(".category-btn").forEach((btn) => {
            btn.classList.toggle(
              "active",
              btn.dataset.category === activeCategory
            );
          });

          // Scroll to products section
          document
            .getElementById("products")
            .scrollIntoView({ behavior: "smooth" });

          // Re-render products
          renderProducts();
        }
      });
    });
  }
}

// ===== Create Product Card HTML =====
function createProductCardHTML(product) {
  const whatsappMessage =
    product.whatsAppMessage ||
    `I'm interested in ${product.name} priced at ₹${product.price}`;
  const whatsappLink = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
    whatsappMessage
  )}`;
  const isInWishlist = wishlist.includes(product.id);

  return `
    <div class="product-card" data-id="${product.id}" data-category="${
    product.category
  }">
      <div class="product-image">
        <img src="${
          product.imageURL ||
          "https://via.placeholder.com/400x400?text=Product+Image"
        }" alt="${product.name}" loading="lazy">
        ${
          product.offer
            ? `<div class="product-offer">${product.offer}</div>`
            : ""
        }
        ${
          !product.isAvailable
            ? `<div class="out-of-stock"><span>Out of Stock</span></div>`
            : ""
        }
      </div>
      <div class="product-info">
        <h3 class="product-name">${product.name}</h3>
        <p class="product-description" title="${product.description}">${
    product.description
  }</p>
        <div class="product-meta">
          <div class="product-price">₹${product.price.toLocaleString()}</div>
          <div class="product-category">${product.category}</div>
        </div>
        <div class="product-actions">
          <a 
            href="${product.isAvailable ? whatsappLink : "#"}" 
            class="buy-button" 
            target="_blank" 
            rel="noopener noreferrer"
            ${!product.isAvailable ? "disabled" : ""}
          >
            <i class="fab fa-whatsapp"></i> Buy on WhatsApp
          </a>
          <button class="wishlist-button ${
            isInWishlist ? "active" : ""
          }" aria-label="Add to wishlist">
            <i class="fas fa-heart"></i>
          </button>
        </div>
      </div>
    </div>
  `;
}

// ===== Handle Search =====
function handleSearch() {
  const searchInputEl = document.getElementById("search-input");
  searchQuery = searchInputEl.value.trim();
  renderProducts();
}

// ===== Show Loading State =====
function showLoading() {
  // Loading state for featured products
  const featuredProductsEl = document.getElementById("featured-products");
  if (featuredProductsEl) {
    featuredProductsEl.innerHTML = Array(4)
      .fill()
      .map(
        () => `
      <div class="loading-card">
        <div class="loading-image"></div>
        <div class="loading-name"></div>
        <div class="loading-description"></div>
        <div class="loading-description"></div>
      </div>
    `
      )
      .join("");
  }

  // Loading state for all products
  const productsContainerEl = document.getElementById("products-container");
  if (productsContainerEl) {
    productsContainerEl.innerHTML = `
      <div class="loading-grid">
        ${Array(8)
          .fill()
          .map(
            () => `
          <div class="loading-card">
            <div class="loading-image"></div>
            <div class="loading-name"></div>
            <div class="loading-description"></div>
            <div class="loading-description"></div>
          </div>
        `
          )
          .join("")}
      </div>
    `;
  }
}

// ===== Show Error State =====
function showError() {
  const productsContainerEl = document.getElementById("products-container");
  if (productsContainerEl) {
    productsContainerEl.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-exclamation-circle"></i>
        <h3>Failed to load products</h3>
        <p>Please refresh the page or try again later.</p>
      </div>
    `;
  }

  const featuredEl = document.getElementById("featured");
  if (featuredEl) {
    featuredEl.style.display = "none";
  }
}

// ===== Show Toast Notification =====
function showToast(title, message, type = "success") {
  const toastContainerEl = document.getElementById("toast-container");
  if (!toastContainerEl) return;

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <div class="toast-icon">
      <i class="fas fa-${
        type === "success" ? "check-circle" : "exclamation-circle"
      }"></i>
    </div>
    <div class="toast-content">
      <div class="toast-title">${title}</div>
      <div class="toast-message">${message}</div>
    </div>
    <button class="toast-close" aria-label="Close notification">
      <i class="fas fa-times"></i>
    </button>
  `;

  toastContainerEl.appendChild(toast);

  // Add event listener to close button
  toast.querySelector(".toast-close").addEventListener("click", function () {
    toast.remove();
  });

  // Auto remove after 3 seconds
  setTimeout(() => {
    if (toast.parentNode) {
      toast.remove();
    }
  }, 3000);
}
