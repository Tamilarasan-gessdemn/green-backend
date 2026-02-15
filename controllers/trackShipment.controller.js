import { trackDelhiveryShipment } from "../utils/delhiveryService.js";

export const trackShipment = async (req, res) => {
  try {
    const { waybill } = req.params;

    if (!waybill) {
      return res.status(400).json({
        success: false,
        message: "Waybill is required",
      });
    }

    const trackingData = await trackDelhiveryShipment(waybill);

    res.status(200).json({
      success: true,
      tracking: trackingData,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};