import mongoose from "mongoose";
import Cart from "../models/Cart.js";
import Product from "../models/Product.js";
import User from "../models/User.js";

// Get user's cart
export const getCart = async (req, res) => {
  try {
    // Ensure user is authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    console.log("Getting cart for user:", req.user.id);
    let cart = await Cart.findOne({ user: req.user.id }).populate(
      "items.product"
    );

    if (!cart) {
      console.log("No cart found for user, creating empty cart");
      // Create a new empty cart for the user
      cart = new Cart({
        user: req.user.id,
        items: [],
        totalAmount: 0,
      });
      await cart.save();
      // Populate after saving
      await cart.populate("items.product");
    }

    console.log("Cart found with items:", cart.items.length);

    return res.status(200).json({
      success: true,
      data: {
        items: cart.items,
        totalAmount: cart.totalAmount,
      },
    });
  } catch (err) {
    console.error("Failed to fetch cart:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch cart",
      error: err.message,
    });
  }
};

// Add/update item
export const addToCart = async (req, res) => {
  try {
    // Ensure user is authenticated
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const { productId, quantity = 1, weight = 1 } = req.body;
    console.log("Adding to cart:", {
      productId,
      quantity,
      weight,
      userId: req.user.id,
    });

    // Fixed: Handle both MongoDB ObjectId and custom string IDs
    let product;

    // Check if productId is a valid ObjectId
    if (mongoose.Types.ObjectId.isValid(productId)) {
      product = await Product.findById(productId);
    } else {
      // Try to find by productCode or another custom ID field
      product =
        (await Product.findOne({ productCode: productId })) ||
        (await Product.findOne({ id: productId }));
    }

    console.log("product:", product);

    if (!product) {
      console.log("Product not found:", productId);
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // Find or create cart for user
    let cart = await Cart.findOne({ user: req.user._id });

    if (!cart) {
      cart = new Cart({
        user: req.user._id,
        items: [],
        totalAmount: 0,
      });
    }

    // Check if item already exists in cart with same weight
    const itemIndex = cart.items.findIndex(
      (item) =>
        item.product.toString() === product._id.toString() &&
        item.weight === weight
    );

    if (itemIndex > -1) {
      // Update existing item quantity
      cart.items[itemIndex].quantity += quantity;
      console.log(
        "Updated existing item quantity to:",
        cart.items[itemIndex].quantity
      );
    } else {
      // Add new item to cart
      cart.items.push({ product: product._id, quantity, weight ,image: product.image
});
      console.log("Added new item to cart");
    }

    // Calculate total
    cart.totalAmount = 0;
    for (const item of cart.items) {
      const productData = await Product.findById(item.product);
      if (productData) {
        cart.totalAmount += item.quantity * item.weight * productData.price;
      }
    }

    // Save the cart
    const savedCart = await cart.save();

    // Populate product data after saving
    await savedCart.populate("items.product");

    console.log("Cart saved with total amount:", savedCart.totalAmount);

    // Return the populated cart with the expected structure
    return res.status(200).json({
      success: true,
      data: {
        items: savedCart.items,
        totalAmount: savedCart.totalAmount,
      },
    });
  } catch (err) {
    console.error("Failed to add to cart:", err);
    res.status(500).json({
      success: false,
      message: "Failed to add to cart",
      error: err.message,
    });
  }
};

// Update item quantity
export const updateCartItem = async (req, res) => {
  try {
    // Ensure user is authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const { productId, weight, quantity } = req.body;
    console.log("Updating cart item:", {
      productId,
      weight,
      quantity,
      userId: req.user.id,
    });

    if (quantity < 1) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be at least 1",
      });
    }

    let cart = await Cart.findOne({ user: req.user.id });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Cart not found",
      });
    }

    // Find the item
    const itemIndex = cart.items.findIndex(
      (item) => item.product.toString() === productId && item.weight === weight
    );

    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Item not found in cart",
      });
    }

    // Update quantity
    cart.items[itemIndex].quantity = quantity;

    // Recalculate total
    cart.totalAmount = 0;
    for (const item of cart.items) {
      const productData = await Product.findById(item.product);
      if (productData) {
        cart.totalAmount += item.quantity * item.weight * productData.price;
      }
    }

    // Save and populate
    const savedCart = await cart.save();
    await savedCart.populate("items.product");

    console.log("Cart item updated, new total:", savedCart.totalAmount);

    return res.status(200).json({
      success: true,
      data: {
        items: savedCart.items,
        totalAmount: savedCart.totalAmount,
      },
    });
  } catch (err) {
    console.error("Failed to update cart item:", err);
    res.status(500).json({
      success: false,
      message: "Failed to update cart item",
      error: err.message,
    });
  }
};

// Remove item
export const removeFromCart = async (req, res) => {
  try {
    // Ensure user is authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const { productId, weight } = req.body;
    console.log("Removing from cart:", {
      productId,
      weight,
      userId: req.user.id,
    });

    let cart = await Cart.findOne({ user: req.user.id });
    if (!cart) {
      console.log("No cart found for user:", req.user.id);
      return res.status(404).json({
        success: false,
        message: "Cart not found",
      });
    }

    // Filter out the item to remove
    const originalLength = cart.items.length;
    cart.items = cart.items.filter(
      (item) =>
        !(item.product.toString() === productId && item.weight === weight)
    );

    if (cart.items.length === originalLength) {
      console.log("Item not found in cart");
      return res.status(404).json({
        success: false,
        message: "Item not found in cart",
      });
    }

    // Recalculate total
    cart.totalAmount = 0;
    for (const item of cart.items) {
      const productData = await Product.findById(item.product);
      if (productData) {
        cart.totalAmount += item.quantity * item.weight * productData.price;
      }
    }

    // Save and populate
    const savedCart = await cart.save();
    await savedCart.populate("items.product");

    console.log(
      "Cart updated after removal, new total:",
      savedCart.totalAmount
    );

    return res.status(200).json({
      success: true,
      data: {
        items: savedCart.items,
        totalAmount: savedCart.totalAmount,
      },
    });
  } catch (err) {
    console.error("Failed to remove item:", err);
    res.status(500).json({
      success: false,
      message: "Failed to remove item",
      error: err.message,
    });
  }
};

// Clear cart
export const clearCart = async (req, res) => {
  try {
    // Ensure user is authenticated
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    console.log("Clearing cart for user:", req.user.id);
    const result = await Cart.findOneAndDelete({ user: req.user.id });

    if (!result) {
      console.log("No cart found to clear");
      return res.status(404).json({
        success: false,
        message: "Cart not found",
      });
    }

    console.log("Cart cleared successfully");
    return res.status(200).json({
      success: true,
      message: "Cart cleared",
    });
  } catch (err) {
    console.error("Failed to clear cart:", err);
    res.status(500).json({
      success: false,
      message: "Failed to clear cart",
      error: err.message,
    });
  }
};
