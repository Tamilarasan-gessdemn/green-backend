// controllers/shippingController.js
import { checkDelhiveryServiceability } from "../utils/delhivery.js";
import { getDelhiveryCharges } from "../utils/delhiveryCharge.js";


/**
 * Calculate shipping cost based on pickup/delivery PIN and weight
 * @route POST /api/shipping/calculate
 */
export const calculateShipping = async (req, res) => {
  try {
    const { pickupPin, deliveryPin, totalWeight } = req.body;

    // Validation
    if (!pickupPin || !deliveryPin || !totalWeight) {
      return res.status(400).json({
        message: 'Pickup PIN, delivery PIN, and total weight are required'
      });
    }

    // Validate PIN format (6 digits)
    const pinRegex = /^[0-9]{6}$/;
    if (!pinRegex.test(pickupPin) || !pinRegex.test(deliveryPin)) {
      return res.status(400).json({
        message: 'Please enter valid 6-digit PIN codes'
      });
    }

    // Validate weight
    if (totalWeight <= 0) {
      return res.status(400).json({
        message: 'Total weight must be greater than 0'
      });
    }

    // Calculate distance (mock calculation for now)
    // In production, integrate with Google Maps Distance Matrix API
    const distance = calculateDistance(pickupPin, deliveryPin);

    console.log('distance :',distance)
    // Shipping cost formula
    const baseCost = 50;
    const weightCost = totalWeight * 10;
    const distanceCost = distance * 0.5;
    const totalShippingCost = Math.round(baseCost + weightCost + distanceCost);


    console.log('weightCost :',weightCost)
    console.log('distanceCost :',distanceCost)
    console.log('totalShippingCost :',totalShippingCost)
    
    res.status(200).json({
      distance,
      shippingCost: totalShippingCost,
      breakdown: {
        baseCost,
        weightCost,
        distanceCost
      }
    });

  } catch (error) {
    console.error('Shipping calculation error:', error);
    res.status(500).json({
      message: 'Failed to calculate shipping cost',
      error: error.message
    });
  }
};

/**
 * Mock distance calculation
 * In production, replace with Google Maps API or similar service
 */
const calculateDistance = (pickupPin, deliveryPin) => {
  // If same PIN, minimal distance
  if (pickupPin === deliveryPin) {
    return 10;
  }

  // Mock calculation based on PIN difference
  const pickup = parseInt(pickupPin);
  const delivery = parseInt(deliveryPin);
  const diff = Math.abs(pickup - delivery);

  console.log('pickup :',pickup)
  console.log('delivery :',delivery)
  console.log('diff :',diff)
  // Generate realistic distance (50-500 km)
  let distance = 50 + (diff % 450);
  console.log('distance :',distance)
  // Add some randomness for realism
  distance += Math.floor(Math.random() * 50);

  return Math.round(distance);
};

/**
 * Validate PIN code serviceability
 * @route POST /api/shipping/check-serviceability
 */


/**
 * Validate PIN code serviceability using Delhivery
 * @route POST /api/shipping/check-serviceability
 */
export const checkServiceability = async (req, res) => {
  try {
    const { pickupPin, deliveryPin } = req.body;
console.log('pickupPin,deliveryPin :',pickupPin,deliveryPin)
    if (!pickupPin || !deliveryPin) {
      return res.status(400).json({
        message: "Pickup and delivery PIN codes are required"
      });
    }

    const pinRegex = /^[0-9]{6}$/;
    if (!pinRegex.test(pickupPin) || !pinRegex.test(deliveryPin)) {
      return res.status(400).json({
        message: "Please enter valid 6-digit PIN codes"
      });
    }

    const data = await checkDelhiveryServiceability(
      pickupPin,
      deliveryPin
    );
console.log('data:',data)
    // 🔑 Core logic
    if (
      data?.expected_tat &&
      data.expected_tat.length > 0 &&
      data.expected_tat[0].delivery === "Y"
    ) {
      return res.status(200).json({
        serviceable: true,
        pickupPin,
        deliveryPin,
        estimatedDeliveryDays: data.expected_tat[0].tat,
        message: `Delivery available in ${data.expected_tat[0].tat} days`
      });
    }

    return res.status(200).json({
      serviceable: false,
      pickupPin,
      deliveryPin,
      message: "Delivery not available for this pincode" 
    });

  } catch (error) {
  console.error("Delhivery error status:", error.response?.status);
  console.error("Delhivery error data:", error.response?.data);
  console.error("Delhivery error headers:", error.response?.headers);

  return res.status(500).json({
    message: "Failed to check serviceability",
    error: error.response?.data || error.message
  });

  }
};


export const calculateShippingCharges = async (req, res) => {
  try {
    const { pickupPin, deliveryPin, weight, mode, paymentType } = req.body;

    if (!pickupPin || !deliveryPin || !weight) {
      return res.status(400).json({ message: "Pickup, delivery PINs and weight required" });
    }

    const data = await getDelhiveryCharges({
      pickupPin,
      deliveryPin,
      weight,
      mode,
      paymentType
    });

    const responseData = data; // your axios response.data

if (responseData.success && responseData.charges?.length > 0) {
  const chargeInfo = responseData.charges[0];
  const totalAmount = chargeInfo.total_amount; // 38.9 in your example
  const breakdown = {
    grossAmount: chargeInfo.gross_amount,
    deliveryCharge: chargeInfo.charge_DL,
    lmCharge: chargeInfo.charge_LM,
    dphCharge: chargeInfo.charge_DPH,
    taxes: chargeInfo.tax_data
  };

  console.log("Total Shipping Cost:", totalAmount);
  console.log("Breakdown:", breakdown);
}


    res.status(200).json({ success: true, data });


  } catch (error) {
    console.error("Delhivery charges error:", error.response?.data || error.message);
    res.status(500).json({ message: "Failed to calculate shipping charges", error: error.response?.data || error.message });
  }
};
