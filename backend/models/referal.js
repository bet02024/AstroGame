import mongoose from "mongoose";

const referal = new mongoose.Schema({
  username: {
    type: String,
    unique: true,
    required: true
  },
  referrer: { 
    type: String, // referrer address
    default: ""
  },
  refcode: { 
    type: String,
    default: ""
  }
},{ timestamps: true } );

referal.index({ username: 1 }); 
referal.index({ refcode: 1 }); 
referal.index({ referrer: 1 }); 

const Referal = mongoose.model("Referal", referal);
export default Referal;
