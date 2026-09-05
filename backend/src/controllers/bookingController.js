let bookings = [];
let nextId = 1;

// Check whether two time periods overlap
const isTimeOverlap = (start1, end1, start2, end2) => {
    return start1 < end2 && start2 < end1;
};

// Check for booking conflict
const hasConflict = (userBooking, excludeId = null) => {
    return bookings.some((booking) => {
        if (excludeId !== null && booking.id === excludeId) {
            return false;
        }

        return (
            booking.resourceId == userBooking.resourceId &&
            booking.date === userBooking.date &&
            isTimeOverlap(
                userBooking.startTime,
                userBooking.endTime,
                booking.startTime,
                booking.endTime
            )
        );
    });
};


// Create a booking
const createBooking = (req, res) => {
    const { userId, resourceId, date, startTime, endTime } = req.body;

    if (!userId || !resourceId || !date || !startTime || !endTime) {
        return res.status(400).json({
            message: "All booking fields are required"
        });
    }

    // Conflict detection
    if (hasConflict({ resourceId, date, startTime, endTime })) {
        return res.status(409).json({
            message: "Booking conflict: Resource is already booked during this time"
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

    const {
        userId,
        resourceId,
        date,
        startTime,
        endTime
    } = req.body;

    const updatedBooking = {
        userId: userId || booking.userId,
        resourceId: resourceId || booking.resourceId,
        date: date || booking.date,
        startTime: startTime || booking.startTime,
        endTime: endTime || booking.endTime
    };

    // Conflict detection during update
    if (hasConflict(updatedBooking, id)) {
        return res.status(409).json({
            message: "Booking conflict: Resource is already booked during this time"
        });
    }

    booking.userId = updatedBooking.userId;
    booking.resourceId = updatedBooking.resourceId;
    booking.date = updatedBooking.date;
    booking.startTime = updatedBooking.startTime;
    booking.endTime = updatedBooking.endTime;

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
