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


crashSchema.index({ round_number: 1 }); 
crashSchema.index({  createdAt: -1 }); 
crashSchema.index({  updatedAt: -1 }); 


const Crash = mongoose.model("Crash", crashSchema);

export default Crash;

