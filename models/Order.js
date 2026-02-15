// models/Order.js
import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  weight: {
    type: Number,
    required: true,
    min: 0.1,
  },
  
});

const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    items: [orderItemSchema],
    pickupPin: {
      type: String,
      required: true,
      default: "600001",
    },
    deliveryPin: {
      type: String,
      required: true,
      match: /^[0-9]{6}$/,
    },
    distance: {
      type: Number,
      required: true,
      min: 0,
    },
    shippingCost: {
      type: Number,
      required: true,
      min: 0,
    },
    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    totalWeight: {
      type: Number,
      required: true,
      min: 0,
    },
    orderStatus: {
      type: String,
      enum: ["Pending", "Confirmed", "Shipped", "Delivered", "Cancelled"],
      default: "Pending",
    },
    paymentStatus: {
      type: String,
      enum: ["Pending", "Paid", "Failed"],
      default: "Pending",
    },
    paymentMethod: {
      type: String,
      enum: ["COD", "UPI", "Razorpay"],
      default: "COD",
    },
    paymentDate: {
      type: Date,
    },
    paymentError: {
      type: String,
    },
    // Razorpay specific fields
    razorpayOrderId: {
      type: String,
    },
    razorpayPaymentId: {
      type: String,
    },
    razorpaySignature: {
      type: String,
    },
    // UPI specific fields
    upiId: {
      type: String,
    },
    transactionId: {
      type: String,
    },
    paymentScreenshot: {
      type: String,
    },
    orderNumber: {
      type: String,
      unique: true,
    },
// 🔹 Logistics Fields
waybill: { type: String },

shipmentStatus: {
  type: String,
  enum: [
    "Not Created",
    "Manifested",
    "In Transit",
    "Out for Delivery",
    "Delivered",
    "RTO",
    "Cancelled"
  ],
  default: "Not Created"
},

shipmentResponse: { type: Object },

delhiveryCreatedAt: { type: Date },



    // models/Order.js (update the deliveryAddress field)
    deliveryAddress: {
      fullName: { type: String, required: true },
      phone: { type: String, required: true },
      addressLine1: { type: String, required: true },
      addressLine2: { type: String },
      city: { type: String, required: true },
      state: { type: String, required: true },
      pincode: { type: String, required: true },
      addressType: { type: String, enum: ["home", "work", "other"] },
    },
  },
  {
    timestamps: true,
  },
);

orderSchema.pre("save", async function () {
  if (!this.orderNumber) {
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0");

    this.orderNumber = `ORD${timestamp}${random}`;
  }
});

const Order = mongoose.model("Order", orderSchema);
export default Order;
