import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    // quantity: {
    //   type: Number,
    //   required: true,
    //   min: 0,
    // },
    weight: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    dimensions: {
      type: {
        length: {
          type: Number,
          required: true,
          default: 0,
          min: 0,
        },
        breadth: {
          type: Number,
          required: true,
          default: 0,
          min: 0,
        },
        height: {
          type: Number,
          required: true,
          default: 0,
          min: 0,
        },
      },
      required: true,
      default: { length: 0, breadth: 0, height: 0 }
    },
    usage: {
      applicationMethod: { type: String, default: "" },
      shelfLife: { type: String, default: "" },
      recommendedCrops: { type: [String], default: [] },
    },
    availability: {
      type: Boolean,
      default: true,
    },
    images: {
      type: String,
      default: "",
    },
    sustainability: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

productSchema.index({ category: 1 });
productSchema.index({ name: "text", description: "text" });

productSchema.virtual('formattedDimensions').get(function() {
  if (!this.dimensions) {
    return 'N/A';
  }
  return `${this.dimensions.length} × ${this.dimensions.breadth} × ${this.dimensions.height} cm`;
});

productSchema.virtual('formattedWeight').get(function() {
  if (this.weight === undefined || this.weight === null) {
    return 'N/A';
  }
  return `${this.weight.toFixed(2)} kg`;
});

export default mongoose.model("Product", productSchema);