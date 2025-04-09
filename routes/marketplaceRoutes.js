const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const Listing = require('../models/Listing');
const User = require('../models/User');

// @route   GET /api/marketplace
// @desc    Get all listings
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const listings = await Listing.find()
      .populate('seller', 'fullName')
      .sort({ createdAt: -1 });
    
    res.json(listings);
  } catch (err) {
    console.error('Error fetching listings:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/marketplace/:id
// @desc    Get a specific listing
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id)
      .populate('seller', 'fullName');
    
    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }
    
    res.json(listing);
  } catch (err) {
    console.error('Error fetching listing:', err.message);
    
    // Check if error is due to invalid ID format
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ error: 'Listing not found' });
    }
    
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   POST /api/marketplace
// @desc    Create a new listing
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    const {
      title,
      description,
      mushroomType,
      price,
      quantity,
      contactName,
      contactPhone,
      contactEmail,
      location,
      images
    } = req.body;
    
    // Create a new listing
    const newListing = new Listing({
      seller: req.user.id,
      title,
      description,
      mushroomType,
      price,
      quantity,
      contactName,
      contactPhone,
      contactEmail,
      location,
      images
    });
    
    const listing = await newListing.save();
    
    // Populate seller information before returning
    await listing.populate('seller', 'fullName');
    
    res.json(listing);
  } catch (err) {
    console.error('Error creating listing:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   PUT /api/marketplace/:id
// @desc    Update a listing
// @access  Private
router.put('/:id', auth, async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);
    
    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }
    
    // Check if the user is the owner of the listing
    if (listing.seller.toString() !== req.user.id) {
      return res.status(401).json({ error: 'Not authorized to update this listing' });
    }
    
    const {
      title,
      description,
      mushroomType,
      price,
      quantity,
      contactName,
      contactPhone,
      contactEmail,
      location,
      images
    } = req.body;
    
    // Update fields
    if (title) listing.title = title;
    if (description) listing.description = description;
    if (mushroomType) listing.mushroomType = mushroomType;
    if (price) listing.price = price;
    if (quantity) listing.quantity = quantity;
    if (contactName) listing.contactName = contactName;
    if (contactPhone) listing.contactPhone = contactPhone;
    if (contactEmail !== undefined) listing.contactEmail = contactEmail;
    if (location) listing.location = location;
    if (images) listing.images = images;
    
    listing.updatedAt = Date.now();
    
    const updatedListing = await listing.save();
    
    // Populate seller information before returning
    await updatedListing.populate('seller', 'fullName');
    
    res.json(updatedListing);
  } catch (err) {
    console.error('Error updating listing:', err.message);
    
    // Check if error is due to invalid ID format
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ error: 'Listing not found' });
    }
    
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   DELETE /api/marketplace/:id
// @desc    Delete a listing
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);
    
    if (!listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }
    
    // Check if the user is the owner of the listing
    if (listing.seller.toString() !== req.user.id) {
      return res.status(401).json({ error: 'Not authorized to delete this listing' });
    }
    
    await listing.deleteOne();
    
    res.json({ message: 'Listing removed' });
  } catch (err) {
    console.error('Error deleting listing:', err.message);
    
    // Check if error is due to invalid ID format
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ error: 'Listing not found' });
    }
    
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/marketplace/user/listings
// @desc    Get current user's listings
// @access  Private
router.get('/user/listings', auth, async (req, res) => {
  try {
    const listings = await Listing.find({ seller: req.user.id })
      .populate('seller', 'fullName')
      .sort({ createdAt: -1 });
    
    res.json(listings);
  } catch (err) {
    console.error('Error fetching user listings:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// @route   GET /api/marketplace/nearby
// @desc    Get listings near a location
// @access  Private
router.get('/nearby/:distance', auth, async (req, res) => {
    try {
      const { longitude, latitude } = req.query;
      const distance = parseInt(req.params.distance) || 10; // Distance in kilometers, default 10km
      
      if (!longitude || !latitude) {
        return res.status(400).json({ error: 'Longitude and latitude are required' });
      }
      
      // Convert distance from kilometers to radians
      // Earth's radius is approximately 6378.1 kilometers
      const radiusInRadians = distance / 6378.1;
      
      const listings = await Listing.find({
        location: {
          $geoWithin: {
            $centerSphere: [
              [parseFloat(longitude), parseFloat(latitude)],
              radiusInRadians
            ]
          }
        }
      })
        .populate('seller', 'fullName')
        .sort({ createdAt: -1 });
      
      res.json(listings);
    } catch (err) {
      console.error('Error fetching nearby listings:', err.message);
      res.status(500).json({ error: 'Server error' });
    }
  });
module.exports = router;