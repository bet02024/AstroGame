import mongoose from "mongoose";

const user = new mongoose.Schema({
  address: {
    type: String,
    unique: true,
  },
  username: { 
    type: String,
    unique: true,
  },
  referrer: { 
    type: String,
    default: ""
  },
  referrals: { 
    type: Number,
    default: 0
  },
  balance: {
    type: Number,
    default: 1000
  },
  tickets: {
    type: Number,
    default: 5
  },
  games: {
    type: Number,
    default: 0
  },
  limit: {
    type: Number,
    default: 300
  },
  last_claim: {
    type: Date,
  },
  next_claim:{
    type: Date,
  },
  total_claimed: {
    type: Number,
    default: 0
  },
  total_played: {
    type: Number,
    default: 0
  },
  total_profit: {
    type: Number,
    default: 0
  },
  bet_amount: {
    type: Number,
    default: 0
  },
  refcode: { 
    type: String,
    default: ""
  },
  claimed_x: { 
    type: Boolean,
    default: false
  },
  claimed_tg: { 
    type: Boolean,
    default: false
  }
},{ timestamps: true } );

user.index({ address: 1 }); 
user.index({ username: 1 }); 
user.index({ refcode: 1 });
user.index({ createdAt: -1 }); 
user.index({ updatedAt: -1 }); 
user.index({ balance: 1 }); 
user.index({ total_claimed: 1 }); 
user.index({ total_profit: 1 }); 
user.index({ total_played: 1 }); 
user.index({ referrals: 1 }); 
user.index({ games: 1 }); 


const User = mongoose.model("User", user);
export default User;
