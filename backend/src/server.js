const express = require("express");

const app = express();

const PORT = 5001;

// Middleware
app.use(express.json());

// Resource routes
const resourceRoutes = require("./routes/resourceRoutes");

app.use("/api/resources", resourceRoutes);

// Home route
app.get("/", (req, res) => {
    res.json({
        message: "SlotSync Backend is running!"
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`SlotSync Backend running on port ${PORT}`);
});