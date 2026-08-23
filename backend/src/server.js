const express = require("express");

const userRoutes = require("./routes/userRoutes");

const app = express();

const PORT = 5001;

// Middleware
app.use(express.json());

// User routes
app.use("/api/users", userRoutes);

// Home route
app.get("/", (req, res) => {
    res.json({
        message: "SlotSync User Management Backend is running!"
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`SlotSync User Management Backend running on port ${PORT}`);
});