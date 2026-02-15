// controllers/orderController.js
import Order from '../models/Order.js';
import Cart from '../models/Cart.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import mongoose from 'mongoose';
import { createDelhiveryShipment } from '../utils/delhiveryService.js';
import { cancelDelhiveryShipment } from '../utils/delhiveryCancelService.js';

/**
 * Place a new order
 * @route POST /api/orders/place
 * @access Private
 */
export const placeOrder = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      console.log('❌ Auth failed: req.user is undefined');
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const { deliveryPin, distance, shippingCost, deliveryAddress, paymentMethod } = req.body;

    console.log('=== ORDER PLACEMENT STARTED ===');
    console.log('User ID:', userId);
    console.log('Payment Method:', paymentMethod);
    console.log('Request Body:', { deliveryPin, distance, shippingCost });

    // Validation of required fields
    if (!deliveryPin || distance === undefined || shippingCost === undefined || !deliveryAddress) {
      console.log('❌ Validation failed: Missing required fields');
      return res.status(400).json({
        success: false,
        message: 'Delivery PIN, distance, shipping cost, and delivery address are required'
      });
    }

    // Validate PIN format
    const pinRegex = /^[0-9]{6}$/;
    if (!pinRegex.test(deliveryPin)) {
      console.log('❌ Validation failed: Invalid PIN format');
      return res.status(400).json({
        success: false,
        message: 'Please enter a valid 6-digit delivery PIN code'
      });
    }

    // Find cart for user
    console.log('🔍 Searching for cart for user:', userId);
    let cart = await Cart.findOne({ user: userId }).populate('items.product');

    // Check with alternative field name just in case
    if (!cart) {
      cart = await Cart.findOne({ userId: userId }).populate('items.product');
    }

    if (!cart) {
      console.log('❌ Cart not found for user');
      return res.status(404).json({
        success: false,
        message: 'Cart not found. Please add items to cart first.'
      });
    }

    console.log(`📦 Cart found with ${cart.items?.length || 0} items`);

    if (!cart.items || cart.items.length === 0) {
      console.log('❌ Cart is empty');
      return res.status(400).json({
        success: false,
        message: 'Your cart is empty'
      });
    }

    // Process cart items and fetch product details
    console.log('🔄 Processing cart items...');

    const orderItems = [];
    let subtotal = 0;
    let totalWeight = 0;

    for (let i = 0; i < cart.items.length; i++) {
      const item = cart.items[i];
      console.log(`\n   Item ${i + 1} processing...`);

      // Try several ways to get the product object or ID
      let product = item.product;
      let productId = null;

      // If product is populated, get its ID. If it's still an ID, use it.
      if (product && product._id) {
        productId = product._id;
      } else if (product && mongoose.Types.ObjectId.isValid(product)) {
        productId = product;
        console.log(`   Found product ID in 'product' field: ${productId}`);
      } else {
        // Check raw data or alternative field names
        const rawItem = item.toObject ? item.toObject() : item;
        productId = rawItem.productId || rawItem.product || item.productId;
        console.log(`   Recovered Product ID from raw data: ${productId}`);
      }

      // If we have an ID but not the populated object, fetch it
      if (productId && (!product || !product.name)) {
        console.log(`   Fetching product details for ID: ${productId}`);
        product = await Product.findById(productId);
      }

      if (!product) {
        console.log(`   ❌ Product missing or deleted for item ${i + 1}. Skipping.`);
        continue; // Skip this item instead of crashing
      }

      console.log(`   ✅ Product found: ${product.name}`);

      // Get quantity and weight - Ensure they are numbers
      const quantity = Number(item.quantity) || 1;
      const weight = Number(item.weight) || Number(product.weight) || 1;

      // Get product price and name
      const productPrice = Number(product.price || 0);
      const productName = product.name || 'Product';

      console.log(`   💰 Price: ${productPrice}, Qty: ${quantity}, Weight: ${weight}kg`);

      const itemTotal = productPrice * quantity * weight;
      const itemWeight = weight * quantity;

      subtotal += itemTotal;
      totalWeight += itemWeight;

      orderItems.push({
        productId: product._id,
        title: productName,
        price: productPrice,
        quantity: quantity,
        weight: weight,
        // ✅ Add image properly
  image: product.image || product.images?.[0] || ""
      });

      console.log(`   ✅ Item processed: Rs.${itemTotal.toFixed(2)}`);
    }

    // Check if we have any valid items left
    if (orderItems.length === 0) {
      console.log('❌ No valid items left in order after processing');
      return res.status(400).json({
        success: false,
        message: 'All items in your cart are no longer available.'
      });
    }

    // Final calculations - Ensure they are numbers
    const finalShippingCost = Number(shippingCost);
    const totalAmount = subtotal + finalShippingCost;

    console.log('\n💵 Order Totals:');
    console.log(`   Subtotal: Rs.${subtotal.toFixed(2)}`);
    console.log(`   Shipping: Rs.${finalShippingCost}`);
    console.log(`   Total: Rs.${totalAmount.toFixed(2)}`);
    console.log(`   Weight: ${totalWeight.toFixed(2)}kg`);

    // Safety check for NaN
    if (isNaN(totalAmount)) {
      throw new Error('Calculation error: Total amount is NaN');
    }

    // Safe address extraction to match Order model schema
    const address = deliveryAddress || {};
    const cleanAddress = {
      fullName: String(address.fullName || '').trim(),
      phone: String(address.phone || '').trim(),
      addressLine1: String(address.addressLine1 || '').trim(),
      addressLine2: String(address.addressLine2 || '').trim(),
      city: String(address.city || '').trim(),
      state: String(address.state || '').trim(),
      pincode: String(address.pincode || deliveryPin || '').trim(),
      addressType: ['home', 'work', 'other'].includes(address.addressType) ? address.addressType : 'home'
    };

    // Validate required address fields manually to prevent Mongoose validation 500 error
    const requiredAddressFields = ['fullName', 'phone', 'addressLine1', 'city', 'state', 'pincode'];
    for (const field of requiredAddressFields) {
      if (!cleanAddress[field]) {
        console.log(`❌ Validation failed: Missing address field: ${field}`);
        return res.status(400).json({
          success: false,
          message: `Delivery address field '${field}' is required`
        });
      }
    }

    // Create order
    console.log('\n💾 Creating order in database...');

    const orderData = {
  userId,
  items: orderItems,
  pickupPin: "600001",
  deliveryPin,
  distance,
  shippingCost,
  subtotal,
  totalAmount,
  totalWeight,
  deliveryAddress: cleanAddress,
  orderStatus: "Pending",
  paymentStatus: "Pending",
  paymentMethod: paymentMethod || "COD",
 

  // ✅ Generate orderNumber before shipment
  orderNumber: "ORD" + Date.now()
};

// 2. Create shipment first
const delhiveryResponse = await createDelhiveryShipment(orderData);

if (!delhiveryResponse.success) {
  return res.status(400).json({
    success: false,
    message: "Shipment creation failed",
    error: delhiveryResponse.rmk
  });
}

// 3. Shipment success → Save order
const waybill = delhiveryResponse.packages?.[0]?.waybill;

orderData.waybill = waybill;
orderData.orderStatus = "Confirmed";

const order = await Order.create(orderData);

// 4. Clear cart after success
await Cart.findOneAndUpdate(
  { user: userId },
  { $set: { items: [], totalAmount: 0 } }
);

res.status(201).json({
  success: true,
  message: "Order placed successfully",
  data:order  
});
  } catch (error) {
    console.log('\n=== ORDER PLACEMENT FAILED ❌ ===');
    console.error('Error Type:', error.name);
    console.error('Error Message:', error.message);
    console.error('Stack:', error.stack);

    // Check if it's a validation error
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      console.error('Validation Details:', messages);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: messages
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error during order placement',
      error: error.message
    });
  }
};

/**
 * Get all orders for logged-in user
 */
export const getMyOrders = async (req, res) => {
  try {
    const userId = req.user._id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const orders = await Order.find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('items.productId', 'name images');

    const totalOrders = await Order.countDocuments({ userId });

    res.status(200).json({
      success: true,
      orders,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalOrders / limit),
        totalOrders,
        hasMore: skip + orders.length < totalOrders
      }
    });

  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders',
      error: error.message
    });
  }
};

/**
 * Get single order details
 */
export const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid order ID' });
    }

    const order = await Order.findOne({ _id: id, userId })
      .populate('items.productId', 'name images price');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.status(200).json({ success: true, data: order });

  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch order',
      error: error.message
    });
  }
};

/**
 * Update order status (Admin only)
 */
export const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { orderStatus, paymentStatus } = req.body;

    const updateData = {};
    if (orderStatus) updateData.orderStatus = orderStatus;
    if (paymentStatus) updateData.paymentStatus = paymentStatus;

    const order = await Order.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Order status updated successfully',
      order
    });

  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update order status',
      error: error.message
    });
  }
};


export const cancelOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const order = await Order.findOne({ _id: id, userId });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found"
      });
    }

    if (!["Pending", "Confirmed"].includes(order.orderStatus)) {
      return res.status(400).json({
        success: false,
        message: "Order cannot be cancelled now"
      });
    }

    // ✅ Cancel shipment in Delhivery
    if (order.waybill) {
      const cancelResponse = await cancelDelhiveryShipment(order.waybill);

      if (!cancelResponse.success) {
        return res.status(400).json({
          success: false,
          message: "Delhivery cancellation failed",
          error: cancelResponse.message
        });
      }
    }

    // ✅ Cancel in DB
    order.orderStatus = "Cancelled";
    order.cancellationDate = new Date();
    await order.save();

    res.status(200).json({
      success: true,
      message: "Order cancelled successfully in Delhivery + DB"
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Cancel order failed",
      error: error.message
    });
  }
};


/**
 * Get all orders (Admin only)
 */
export const getAllOrders = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const status = req.query.status;

    const query = status ? { orderStatus: status } : {};

    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('userId', 'name email')
      .populate('items.productId', 'name images category weight dimensions');

    const totalOrders = await Order.countDocuments(query);

    res.status(200).json({
      success: true,
      orders,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalOrders / limit),
        totalOrders,
        hasMore: skip + orders.length < totalOrders
      }
    });

  } catch (error) {
    console.error('Get all orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders',
      error: error.message
    });
  }
};

/**
 * Bulk update order status (Admin only)
 */
export const bulkUpdateOrderStatus = async (req, res) => {
  try {
    const { orderIds, orderStatus, paymentStatus } = req.body;

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Order IDs array is required'
      });
    }

    if (!orderStatus && !paymentStatus) {
      return res.status(400).json({
        success: false,
        message: 'At least one status field required'
      });
    }

    const invalidIds = orderIds.filter(id => !mongoose.Types.ObjectId.isValid(id));
    if (invalidIds.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Invalid order IDs found`
      });
    }

    const updateData = {};
    if (orderStatus) updateData.orderStatus = orderStatus;
    if (paymentStatus) updateData.paymentStatus = paymentStatus;

    const result = await Order.updateMany(
      { _id: { $in: orderIds } },
      { $set: updateData }
    );

    res.status(200).json({
      success: true,
      message: `Successfully updated ${result.modifiedCount} order(s)`,
      modifiedCount: result.modifiedCount
    });

  } catch (error) {
    console.error('Bulk update error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update orders',
      error: error.message
    });
  }
};
