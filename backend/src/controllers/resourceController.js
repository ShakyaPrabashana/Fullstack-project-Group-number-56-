const resources = [
    {
        id: 1,
        name: "Study Room 01",
        type: "Room"
    },
    {
        id: 2,
        name: "Projector 01",
        type: "Equipment"
    }
];

// GET all resources
const getResources = (req, res) => {
    res.json(resources);
};

module.exports = {
    getResources
};