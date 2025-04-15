import mongoose from "mongoose";
const crashSchema = new mongoose.Schema({
  round_number: {
    type: Number,
    default: 1
  },
  active_player_id_list: {
    type: [String],
    default: []
  },
  multiplier_crash: {
    type: Number,
    default: 0
  },
  time_now: {
    type: Number,
    default: -1
  },
  total_played: {
    type: Number,
    default: 0
  },
  total_profit: {
    type: Number,
    default: 0
  },
  total_players: {
    type: Number,
    default: 0
  },
  round_id_list: {
    type: [Number],
    default: []
  }, 
}, { timestamps: true } );

crashSchema.index({ total_players: 1 }); 
crashSchema.index({ total_profit: 1 }); 
crashSchema.index({ total_played: 1 });
crashSchema.index({  createdAt: -1 }); 
crashSchema.index({  updatedAt: -1 }); 
crashSchema.index({  time_now: -1 }); 

const History = mongoose.model("History", crashSchema);

export default History;

