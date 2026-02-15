import express from "express";
import Wishlist from "../models/wishlistModel.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect); // 🔥 protect all wishlist routes


// GET wishlist
router.get("/", async (req, res) => {
  try {
    const userId = req.user.id;

    const items = await Wishlist.find({ userId });

    res.json({
      success: true,
      items,
      totalItems: items.length,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});


// ADD to wishlist
router.post("/add", async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId, name, price, image } = req.body;

    const exists = await Wishlist.findOne({ userId, productId });

    if (exists) {
      return res.json({ success: false, message: "Already in wishlist" });
    }

    const item = await Wishlist.create({
      userId,
      productId,
      name,
      price,
      image,
    });

    res.json({ success: true, item });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});


// REMOVE from wishlist
router.delete("/remove/:productId", async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId } = req.params;

    await Wishlist.deleteOne({ userId, productId });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

export default router;
