import axios from "axios";

export const checkDelhiveryServiceability = async (
  originPin,
  destinationPin,
  mot = "E" // S = Surface, E = Express
) => {
  const url = `${process.env.DELHIVERY_BASE_URL}/api/dc/expected_tat`;
  console.log('url :',url)

  const response = await axios.get(url, {
    params: {
      origin_pin: originPin,
      destination_pin: destinationPin,
      mot 
    },

    headers: {
      Authorization: `Token ${process.env.DELIVERY_API_KEY}`
    }
  }); 

console.log('response :',response)
  return response.data;
};
