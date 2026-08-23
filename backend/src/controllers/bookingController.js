// Temporary booking data
let bookings = [];
let nextId = 1;

// Create a booking
const createBooking = (req, res) => {
    const { userId, resourceId, date, startTime, endTime } = req.body;

    if (!userId || !resourceId || !date || !startTime || !endTime) {
        return res.status(400).json({
            message: "All booking fields are required"
        });
    }

    const booking = {
        id: nextId++,
        userId,
        resourceId,
        date,
        startTime,
        endTime
    };

    bookings.push(booking);

    res.status(201).json({
        message: "Booking created successfully",
        booking
    });
};

// Get all bookings
const getBookings = (req, res) => {
    res.status(200).json(bookings);
};

// Get booking by ID
const getBookingById = (req, res) => {
    const id = parseInt(req.params.id);

    const booking = bookings.find(
        (booking) => booking.id === id
    );

    if (!booking) {
        return res.status(404).json({
            message: "Booking not found"
        });
    }

    res.status(200).json(booking);
};

// Update booking
const updateBooking = (req, res) => {
    const id = parseInt(req.params.id);

    const booking = bookings.find(
        (booking) => booking.id === id
    );

    if (!booking) {
        return res.status(404).json({
            message: "Booking not found"
        });
    }

    const { userId, resourceId, date, startTime, endTime } = req.body;

    booking.userId = userId || booking.userId;
    booking.resourceId = resourceId || booking.resourceId;
    booking.date = date || booking.date;
    booking.startTime = startTime || booking.startTime;
    booking.endTime = endTime || booking.endTime;

    res.status(200).json({
        message: "Booking updated successfully",
        booking
    });
};

// Delete booking
const deleteBooking = (req, res) => {
    const id = parseInt(req.params.id);

    const index = bookings.findIndex(
        (booking) => booking.id === id
    );

    if (index === -1) {
        return res.status(404).json({
            message: "Booking not found"
        });
    }

    const deletedBooking = bookings.splice(index, 1);

    res.status(200).json({
        message: "Booking deleted successfully",
        booking: deletedBooking[0]
    });
};

module.exports = {
    createBooking,
    getBookings,
    getBookingById,
    updateBooking,
    deleteBooking
};