import mongoose from 'mongoose';

const CartItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, default: 1, min: 1 },
  weight: { type: Number, default: 1, min: 0.1 },
  image: { type: String },
});

const CartSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true,},
    items: [CartItemSchema],
    totalAmount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

// Ensure unique cart per user
CartSchema.index({ user: 1 }, { unique: true });

export default mongoose.model('Cart', CartSchema);