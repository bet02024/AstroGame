import mongoose from "mongoose";
const previuos = new mongoose.Schema({
  value: {
    type: Number,
    required: true
  },
  hash: {
    type: String,
    required: false
  },
  seed: {
    type: Number,
    default: 0
  }
},{ timestamps: true } );

previuos.index({  createdAt: -1 }); 
previuos.index({  updatedAt: -1 }); 

const Previuos = mongoose.model("Previuos", previuos);

export default Previuos;
