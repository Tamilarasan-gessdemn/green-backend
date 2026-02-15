import axios from "axios";

export const createDelhiveryShipment = async (order) => {
  try {
    const payload = {
  shipments: [
    {
      name: order.deliveryAddress.fullName,
      add: order.deliveryAddress.addressLine1,
      pin: order.deliveryAddress.pincode,
      city: order.deliveryAddress.city,
      state: order.deliveryAddress.state,
      country: "India",
      phone: order.deliveryAddress.phone,

      order: order.orderNumber,

      payment_mode: "COD",

      cod_amount: order.subtotal,
      total_amount: order.totalAmount,

      products_desc: "GreenInovics Products",
      hsn_code: "",

      seller_name: "GreenInovics",
      seller_add: "Chennai Warehouse Address",
      seller_inv: "INV001",

      return_name: "GreenInovics",
      return_add: "Chennai Warehouse Address",
      return_pin: "600001",
      return_city: "Chennai",
      return_state: "Tamil Nadu",
      return_country: "India",
      return_phone: "8668165772",

      quantity: order.items.length,

      waybill: "",

      shipment_width: "10",
      shipment_height: "10",
      shipment_length: "10",

      weight: String(order.totalWeight),

      shipping_mode: "Surface",
      address_type: "home"
    }
  ],

  pickup_location: {
    name: process.env.DELHIVERY_PICKUP_NAME
  }
};



  const formData = new URLSearchParams();
formData.append("format", "json");
formData.append("data", JSON.stringify(payload));

const response = await axios.post(
  process.env.DELHIVERY_BASE_URL + "/api/cmu/create.json",
  formData.toString(),
  {
    headers: {
      Accept: "application/json",
      Authorization: `Token ${process.env.DELIVERY_API_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
  }
);


    console.log("✅ DELHIVERY RESPONSE:", response.data);

    console.log(
  "DELHIVERY PACKAGE REMARKS:",
  response.data.packages?.[0]?.remarks
);


    return response.data;

  } catch (err) {
    console.log("❌ Delhivery Error:", err.response?.data || err.message);
    throw err;
  }
};


export const trackDelhiveryShipment = async (waybill) => {
  try {
    const response = await axios.get(
      `${process.env.DELHIVERY_BASE_URL}/api/v1/packages/json/?waybill=${waybill}`,
      {
        headers: {
          Authorization: `Token ${process.env.DELIVERY_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error("Delhivery Tracking Error:", error.response?.data || error);

    throw new Error("Failed to fetch shipment tracking details");
  }
};
