const express = require("express");
const { createAddress, getUserAddresses, setDefaultAddress, deleteAddress } = require("../controllers/addressController");
const { authMiddleware } = require("../middleware/auth");

const router = express.Router();

router.post("/create", authMiddleware, createAddress);
router.get("/", authMiddleware, getUserAddresses);
router.put("/set-default", authMiddleware, setDefaultAddress);
router.delete("/delete", authMiddleware, deleteAddress);

module.exports = router;