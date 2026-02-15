import express from "express";
import { trackShipment } from "../controllers/trackShipment.controller.js";

const router = express.Router();

router.get("/track/:waybill", trackShipment);

export default router;
