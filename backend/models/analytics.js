import mongoose from "mongoose";
const analytics = new mongoose.Schema({
  game: {
    type: Number,
    unique: true,
    required: true
  },
  total_rounds: {
    type: Number,
    default: -1
  },
  total_games: {
    type: Number,
    default: 0
  },
  total_users: {
    type: Number,
    default: 0
  },
  total_claims: {
    type: Number,
    default: 0
  },
  total_claimed: {
    type: Number,
    default: 0
  },
  total_referals: {
    type: Number,
    default: 0
  },
  total_referals_amount: {
    type: Number,
    default: 0
  },
  total_user_bet_amount: {
    type: Number,
    default: 0
  },
  total_user_earned: {
    type: Number,
    default: 0
  },
}, { timestamps: true } );

analytics.index({ game: 1 }); 

const Analytics = mongoose.model("Analytics", analytics);
export default Analytics;

