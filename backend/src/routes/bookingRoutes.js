const express = require("express");

const router = express.Router();

const {
    createBooking,
    getBookings,
    getBookingById,
    updateBooking,
    deleteBooking
} = require("../controllers/bookingController");

// Create booking
router.post("/", createBooking);

// Get all bookings
router.get("/", getBookings);

// Get booking by ID
router.get("/:id", getBookingById);

// Update booking
router.put("/:id", updateBooking);

// Delete booking
router.delete("/:id", deleteBooking);

module.exports = router;