const express = require("express");

const app = express();

const PORT = 5002;

// Middleware
app.use(express.json());

// Booking routes
const bookingRoutes = require("./routes/bookingRoutes");

app.use("/api/bookings", bookingRoutes);

// Home route
app.get("/", (req, res) => {
    res.json({
        message: "SlotSync Booking Management Backend is running!"
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`SlotSync Booking Management Backend running on port ${PORT}`);
});