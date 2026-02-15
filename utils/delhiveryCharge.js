import axios from "axios";

export const getDelhiveryCharges = async ({
  pickupPin,
  deliveryPin,
  weight,
  mode = "E",
  paymentType = "Pre-paid"
}) => {
  const url = "https://track.delhivery.com/api/kinko/v1/invoice/charges/.json";

  const params = {
    md: mode,
    ss: "Delivered",
    d_pin: deliveryPin,
    o_pin: pickupPin,
    cgm: weight,
    pt: paymentType
  };

  const headers = {
    Authorization: `Token ${process.env.DELIVERY_API_KEY}`
  };

  const response = await axios.get(url, { params, headers });
  return response.data;
};
