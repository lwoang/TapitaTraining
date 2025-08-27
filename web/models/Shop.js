import mongoose from "mongoose";

const shopSchema = new mongoose.Schema({
  shop: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  accessToken: {
    type: String,
    required: true
  },
  shopEmail: {
    type: String,
    required: false
  },
  ownerEmail: {
    type: String,
    required: false
  },
  address: {
    street: String, 
    city: String,
    province: String,
    country: String,
    zipCode: String
  },
  phone: {
    type: String,
    required: false
  },
  shopifyPlan: {
    type: String,
    required: false,
    default: 'Basic'  // Basic, Shopify, Advanced, Plus, hoặc Development
  },
  installedAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});


shopSchema.index({ shopEmail: 1 });
shopSchema.index({ ownerEmail: 1 });

export const Shop = mongoose.model('Shop', shopSchema);
