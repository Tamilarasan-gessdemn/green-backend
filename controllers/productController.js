import Product from "../models/Product.js";

/* CREATE */
export const createProduct = async (req, res) => {
  try {
    const {
      id,
      name,
      description,
      category,
      price,
      // quantity,
      weight,
      dimensions,
      availability,
      images,
      sustainability,
      usage
    } = req.body;

    console.log('Received data:', req.body);

    // Check if product ID already exists
    const exists = await Product.findOne({ id });
    if (exists) {
      return res.status(400).json({ 
        message: "Product ID already exists" 
      });
    }

    // Ensure weight and dimensions have proper default values
    const productWeight = weight !== undefined && weight !== null && weight !== '' 
      ? parseFloat(weight) 
      : 0;

    const productDimensions = {
      length: dimensions?.length !== undefined && dimensions?.length !== null && dimensions?.length !== ''
        ? parseFloat(dimensions.length) 
        : 0,
      breadth: dimensions?.breadth !== undefined && dimensions?.breadth !== null && dimensions?.breadth !== ''
        ? parseFloat(dimensions.breadth) 
        : 0,
      height: dimensions?.height !== undefined && dimensions?.height !== null && dimensions?.height !== ''
        ? parseFloat(dimensions.height) 
        : 0,
    };

    const product = new Product({
      id,
      name,
      description,
      category,
      price: parseFloat(price),
      // quantity: parseInt(quantity),
      weight: productWeight,
      dimensions: productDimensions,
      availability,
      images,
      sustainability: sustainability || [],
      usage: usage || {
        applicationMethod: '',
        shelfLife: '',
        recommendedCrops: []
      }
    });

    await product.save();
    console.log('Saved product:', product);
    
    res.status(201).json({
      success: true,
      data: product,
      message: 'Product created successfully'
    });
  } catch (err) {
    console.error('Create product error:', err);
    res.status(500).json({ 
      success: false,
      message: err.message 
    });
  }
};

/* GET ALL */
export const getProducts = async (req, res) => {
  try {
    const { category, availability, search, sort } = req.query;
    let query = {};

    if (category && category !== 'all') {
      query.category = category;
    }

    if (availability) {
      query.availability = availability === 'true';
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { id: { $regex: search, $options: 'i' } }
      ];
    }

    let sortOption = { createdAt: -1 };
    switch(sort) {
      case 'price-low':
        sortOption = { price: 1 };
        break;
      case 'price-high':
        sortOption = { price: -1 };
        break;
      case 'name-asc':
        sortOption = { name: 1 };
        break;
      case 'name-desc':
        sortOption = { name: -1 };
        break;
    }

    const products = await Product.find(query).sort(sortOption);
    
    res.json({
      success: true,
      data: products
    });
  } catch (err) {
    console.error('Get products error:', err);
    res.status(500).json({ 
      success: false,
      message: err.message 
    });
  }
};

/* GET BY STRING ID */
export const getProductById = async (req, res) => {
  try {
    const product = await Product.findOne({ id: req.params.id });
    if (!product) {
      return res.status(404).json({ 
        success: false,
        message: "Product not found" 
      });
    }
    res.json({
      success: true,
      data: product
    });
  } catch (err) {
    console.error('Get product by ID error:', err);
    res.status(500).json({ 
      success: false,
      message: err.message 
    });
  }
};

/* UPDATE */
export const updateProduct = async (req, res) => {
  try {
    const {
      name,
      description,
      category,
      price,
      // quantity,
      weight,
      dimensions,
      availability,
      images,
      sustainability,
      usage
    } = req.body;

    console.log('Update data for ID:', req.params.id, req.body);

    const productWeight = weight !== undefined && weight !== null && weight !== '' 
      ? parseFloat(weight) 
      : 0;

    const productDimensions = {
      length: dimensions?.length !== undefined && dimensions?.length !== null && dimensions?.length !== ''
        ? parseFloat(dimensions.length) 
        : 0,
      breadth: dimensions?.breadth !== undefined && dimensions?.breadth !== null && dimensions?.breadth !== ''
        ? parseFloat(dimensions.breadth) 
        : 0,
      height: dimensions?.height !== undefined && dimensions?.height !== null && dimensions?.height !== ''
        ? parseFloat(dimensions.height) 
        : 0,
    };

    const updateData = {
      name,
      description,
      category,
      price: parseFloat(price),
      // quantity: parseInt(quantity),
      weight: productWeight,
      dimensions: productDimensions,
      availability,
      images,
      sustainability: sustainability || [],
      usage: usage || {
        applicationMethod: '',
        shelfLife: '',
        recommendedCrops: []
      }
    };

    const product = await Product.findOneAndUpdate(
      { id: req.params.id },
      updateData,
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({ 
        success: false,
        message: "Product not found" 
      });
    }
    
    console.log('Updated product:', product);
    
    res.json({
      success: true,
      data: product,
      message: 'Product updated successfully'
    });
  } catch (err) {
    console.error('Update product error:', err);
    res.status(500).json({ 
      success: false,
      message: err.message 
    });
  }
};

/* DELETE */
export const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findOneAndDelete({ id: req.params.id });
    if (!product) {
      return res.status(404).json({ 
        success: false,
        message: "Product not found" 
      });
    }
    res.json({ 
      success: true,
      message: "Product deleted successfully" 
    });
  } catch (err) {
    console.error('Delete product error:', err);
    res.status(500).json({ 
      success: false,
      message: err.message 
    });
  }
};