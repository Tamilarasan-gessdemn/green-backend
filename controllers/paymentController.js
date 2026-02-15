// server/controllers/paymentController.js
import razorpayInstance from '../config/razorpay.js';
import crypto from 'crypto';
import Order from '../models/Order.js';
import mongoose from 'mongoose';

/**
 * Create Razorpay order
 * @route POST /api/payment/create-order
 * @access Private
 */
export const createRazorpayOrder = async (req, res) => {
  try {
    const { orderId, amount } = req.body;
    const userId = req.user._id;

    console.log('=== CREATING RAZORPAY ORDER ===');
    console.log('Order ID:', orderId);
    console.log('Amount:', amount);
    console.log('User ID:', userId);

    // Validation
    if (!orderId || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Order ID and amount are required'
      });
    }

    // Validate amount
    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid amount'
      });
    }

    // Verify order exists and belongs to user
    const order = await Order.findOne({ _id: orderId, userId });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Verify amount matches order total (security check)
    const orderTotal = Math.round(order.totalAmount * 100); // Convert to paise
    const requestedAmount = Math.round(amount * 100);

    if (orderTotal !== requestedAmount) {
      console.error('Amount mismatch:', { orderTotal, requestedAmount });
      return res.status(400).json({
        success: false,
        message: 'Amount mismatch. Please refresh and try again.'
      });
    }

    // Create Razorpay order options
    const options = {
      amount: orderTotal, // amount in paise
      currency: 'INR',
      receipt: `order_${orderId}`,
      notes: {
        orderId: orderId.toString(),
        userId: userId.toString(),
        orderNumber: order.orderNumber
      }
    };

    console.log('Creating Razorpay order with options:', options);

    // Create order on Razorpay
    const razorpayOrder = await razorpayInstance.orders.create(options);

    console.log('Razorpay order created:', razorpayOrder.id);

    // Store razorpay_order_id in our order for reference
    order.razorpayOrderId = razorpayOrder.id;
    await order.save();

    res.status(200).json({
      success: true,
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      keyId: process.env.RAZORPAY_KEY_ID, // Safe to send to frontend
      orderDetails: {
        orderNumber: order.orderNumber,
        _id: order._id
      }
    });

  } catch (error) {
    console.error('Create Razorpay order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create payment order',
      error: error.message
    });
  }
};

/**
 * Verify Razorpay payment signature
 * @route POST /api/payment/verify
 * @access Private
 */
export const verifyRazorpayPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      orderId
    } = req.body;

    console.log('=== VERIFYING PAYMENT ===');
    console.log('Order ID:', orderId);
    console.log('Razorpay Order ID:', razorpay_order_id);
    console.log('Payment ID:', razorpay_payment_id);

    // Validation
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !orderId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required payment parameters'
      });
    }

    // Create signature for verification
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    console.log('Generated signature:', generatedSignature);
    console.log('Received signature:', razorpay_signature);

    // Verify signature
    const isValid = generatedSignature === razorpay_signature;

    if (!isValid) {
      console.error('Payment signature verification failed');
      return res.status(400).json({
        success: false,
        message: 'Payment verification failed. Invalid signature.'
      });
    }

    console.log('✅ Payment signature verified successfully');

    // Update order in database
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Update order with payment details
    order.paymentStatus = 'Paid';
    order.orderStatus = 'Confirmed';
    order.razorpayPaymentId = razorpay_payment_id;
    order.razorpayOrderId = razorpay_order_id;
    order.razorpaySignature = razorpay_signature;
    order.paymentDate = new Date();

    await order.save();

    console.log('✅ Order updated with payment details');

    res.status(200).json({
      success: true,
      message: 'Payment verified successfully',
      order: {
        _id: order._id,
        orderNumber: order.orderNumber,
        paymentStatus: order.paymentStatus,
        orderStatus: order.orderStatus,
        totalAmount: order.totalAmount
      }
    });

  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Payment verification failed',
      error: error.message
    });
  }
};

/**
 * Handle payment failure
 * @route POST /api/payment/failed
 * @access Private
 */
export const handlePaymentFailure = async (req, res) => {
  try {
    const { orderId, error } = req.body;
    const userId = req.user._id;

    console.log('=== PAYMENT FAILED ===');
    console.log('Order ID:', orderId);
    console.log('Error:', error);

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: 'Order ID is required'
      });
    }

    // Find and update order
    const order = await Order.findOne({ _id: orderId, userId });
console.log('order :',order)
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Update order status
    order.paymentStatus = 'Failed';
    order.paymentError = error?.description || 'Payment failed';
    await order.save();

    res.status(200).json({
      success: true,
      message: 'Payment failure recorded',
      order: {
        _id: order._id,
        orderNumber: order.orderNumber,
        paymentStatus: order.paymentStatus
      }
    });

  } catch (error) {
    console.error('Handle payment failure error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to record payment failure',
      error: error.message
    });
  }
};

/**
 * Get payment status
 * @route GET /api/payment/status/:orderId
 * @access Private
 */
export const getPaymentStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user._id;

    const order = await Order.findOne({ _id: orderId, userId });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.status(200).json({
      success: true,
      paymentStatus: order.paymentStatus,
      orderStatus: order.orderStatus,
      razorpayPaymentId: order.razorpayPaymentId,
      razorpayOrderId: order.razorpayOrderId
    });

  } catch (error) {
    console.error('Get payment status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get payment status',
      error: error.message
    });
  }
};


/**
 * Process Cash on Delivery
 * @route POST /api/payment/cod/process
 * @access Private
 */
export const processCODPayment = async (req, res) => {
  try {
    const { orderId } = req.body;
    const userId = req.user._id;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: 'Order ID is required'
      });
    }

    const order = await Order.findOne({ _id: orderId, userId });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    order.paymentMethod = 'COD';
    order.paymentStatus = 'Pending';

    await order.save();

    res.status(200).json({
      success: true,
      message: 'Order confirmed with Cash on Delivery',
      order: {
        _id: order._id,
        orderNumber: order.orderNumber,
        paymentStatus: order.paymentStatus
      }
    });

  } catch (error) {
    console.error('COD process error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process COD payment',
      error: error.message
    });
  }
};