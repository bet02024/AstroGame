import mongoose from "mongoose";

const rewards = new mongoose.Schema({
  userid: {
    type: String,
    unique: true,
    required: true
  }
},{ timestamps: true } );

rewards.index({ userid: 1 });  
const Rewards = mongoose.model("Rewards", rewards);
export default Rewards;
