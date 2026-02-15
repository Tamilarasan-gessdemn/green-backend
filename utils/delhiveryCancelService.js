import axios from "axios";

export const cancelDelhiveryShipment = async (waybill) => {
  try {
    const response = await axios.post(
      "https://track.delhivery.com/api/p/edit",
      {
        waybill: waybill,
        cancellation: "true"
      },
      {
        headers: {
          Authorization: `Token ${process.env.DELIVERY_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    return {
      success: true,
      data: response.data
    };
  } catch (error) {
    return {
      success: false,
      message: error.response?.data || error.message
    };
  }
};
