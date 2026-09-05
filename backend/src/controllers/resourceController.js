const Resource = require('../models/Resource')

function toJSON(resource) {
  return {
    id: resource._id,
    kind: resource.kind,
    category: resource.category,
    name: resource.name,
    location: resource.location,
    capacity: resource.capacity,
    features: resource.features,
  }
}

async function list(req, res, next) {
  try {
    const resources = await Resource.find().sort({ _id: 1 })
    res.json(resources.map(toJSON))
  } catch (err) {
    next(err)
  }
}

module.exports = { list, toJSON }
