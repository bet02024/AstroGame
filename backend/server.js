import mongoose from "mongoose";
import express  from "express";
import cors from "cors";
import bodyParser from "body-parser";
import User from "./models/user.js";
import Game_loop from "./models/game_loop.js";
import History from "./models/game_loop_history.js";
import Previuos from "./models/previous_crash.js";
import Analytics from "./models/analytics.js";
import Referal from "./models/referal.js";
import Rewards from "./models/rewards.js";
import { Server } from 'socket.io';
import http from 'http';
import { TonClient } from "@ton/ton";
import { Address, Cell } from "@ton/core";
import BN from "bn.js";
import nacl from "tweetnacl";
import { Buffer } from "buffer";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { getHttpEndpoint } from "@orbs-network/ton-access";
import ShortUniqueId from 'short-unique-id';
import { isValid } from '@telegram-apps/init-data-node';

const uid = new ShortUniqueId({ length: 10 });
let previuos;
const GAME_LOOP_ID = '66a3e7ccdf87a1eed3331ccf'
const SHARED_SECRET = 'JWTSECRET'
const MONGOOSE_DB_LINK = "mongodb+srv:xxx//xxx:xxx@xxx/?retryWrites=true&w=majority&appName=Cluster0" //mongodb url connection
const DOMAIN = "astrodegen.com";
const DOMAIN2 = "localshost:3000";
const TOKEN = "YOUR TELEGRAM APP TOKEN";

const PAYLOAD_TTL = 3600*24*360; // 24 hour
const PROOF_TTL = 3600*24*360; // 24 hour
const CLAIMING_TIME = 6*3600*1000; /// 6 hours

const USER_WELCOME_COINS = 10000;
const USER_WELCOME_TICKETS = 10;
const USER_WELCOME_LIMIT = 5000;

const USER_REFERAL_TICKETS = 10;
const USER_REFERAL_COINS = 5000;
const USER_REFERAL_LIMIT = 1000;

const USER_CLAIM_TICKETS = 5;
const USER_CLAIM_COINS = 2000;
const USER_CLAIM_LIMIT = 500;
const BEETING_TIME = 30;


import 'dotenv/config'

// Connect to MongoDB 
mongoose.connect(
  MONGOOSE_DB_LINK,
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  },
);

mongoose.connection.on('connected', () => console.log('#connected'));
mongoose.connection.on('disconnected', () => console.log('#disconnected'));
mongoose.connection.on('reconnected', () => console.log('#reconnected'));
mongoose.connection.on('disconnecting', () => console.log('#disconnecting'));
mongoose.connection.on('close', () => console.log('#close'));


const app = express();
//##### Start Socket.io Server
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});
io.on("connection", (socket) => { 
  socket.use(([event, ...args], next) => {
    if(event){
       return next(new Error("unauthorized event"));
    }
    next();
  });
});
server.listen(3001, () => { })
///////

//####### Express Setup
app.use(bodyParser.json());
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);


function checkAuthenticated(req, res, next) {
  console.log("###checkAuthenticated### headder ", req.headers);
  if (req.headers.initdata){
    let decoded = validateToken(req);
    if (decoded && decoded.success && isValid(req.headers.initdata, TOKEN)  ) {
      console.log("###checkAuthenticated### SUCEESS ");
      return next();
    }
  }
  if (req.headers.address){
    let decoded = validateToken(req);
    if(decoded && decoded.success && decoded.address && decoded.address === req.headers.address) {
      console.log("###checkAuthenticated### SUCEESS ");
      return next();
    }
  }

  console.log("#checkAuthenticated1 ##No User Authentication ###",  req.headers.authorization, req.headers.address );
  //return res.send("No User Authentication");
  return res.status(400).json({ customError: "No User Authentication" });
}

const validateToken = (req) => {
  let response = {
    success: false,
    message: "",
    username: "",
    address: ""
  }
  let decoded;
  try{
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      console.log("##authorization header is missing");
      response.message = "authorization header is missing";
      return response;
    }
    const token = authHeader.split(" ")[1];
    if (!token) {
      console.log("##token is missing");
      response.message = "token is missing";
      return response;
    }
    try {
      decoded = jwt.verify(token, SHARED_SECRET);
    } catch (e) {
      console.log(e);
      response.message = "Invalid token";
      return response;
    }
  } catch(e){
    console.log(e);
    response.message = "Invalid token";
    return response;
  }
  console.log("##validateToken: ", decoded);
  response.success = true;
  response.address = decoded.address;
  response.username = decoded.username;
  return response;
}


app.get("/get-account-info", checkAuthenticated, async (req, res) => {
  let decoded = validateToken(req);
  if(!decoded || !decoded.success) {
    res.status(400).json({ customError: "Invalid token" });
    return;
  }
  res.json({ address: decoded.address, username: decoded.username });
});

app.post("/generate-payload", (_, res) => {
  const randomBits = crypto.randomBytes(8);
  const currentTime = Math.floor(Date.now() / 1000);
  const expirationTime = Buffer.alloc(8);
  expirationTime.writeBigUint64BE(BigInt(currentTime + PAYLOAD_TTL));
  const payload = Buffer.concat([randomBits, expirationTime]);
  const hmac = crypto.createHmac("sha256", SHARED_SECRET);
  hmac.update(payload);
  const signature = hmac.digest();
  const finalPayload = Buffer.concat([payload, signature]);
  const payloadHex = finalPayload.subarray(0, 32).toString("hex");
  res.json({ payload: payloadHex });
});

app.post("/generate-token",   async (req, res ) => {
    let body = req.body;
    console.log("/generate-token", body.initData);
    const initData  =  body.initData;
    const username  =  body.username;
    if (!username || username.length < 2 ) {
      res.status(401).json({
        customError: "Invalid username",
      });
      return;
    }
    if (!initData || initData.length < 2 ) {
      res.status(401).json({
        customError: "Invalid initData",
      });
      return;
    }
    if (!isValid(initData, TOKEN)) {
      res.status(401).json({
        customError: "Invalid initData payload",
      });
      return;
    }
    const now = Math.floor(Date.now() / 1000);
    const sesion = {
      exp: now + PAYLOAD_TTL,
      username: username,
      address: "",
    };

    let user = await saveOrUpdateUser("", username);
    const token = jwt.sign(sesion, SHARED_SECRET);
    console.log("generate-token user", user);
    res.json({ token: token, usr: user });
});



app.post("/check-proof",   async (req, res ) => {
    let body = req.body;
    const proof  =  body.proof;
    const address  =  body.address;
    const username  =  body.username;
 
    if (!username || username.length < 2 ) {
      res.status(401).json({
        customError: "Invalid username",
      });
      return;
    }
    try{
        const payload = Buffer.from(proof.payload, "hex");
        if (payload.length !== 32) {
          console.log(`invalid payload length, got ${payload.length}, expected 32`);
          res.status(400).json({
            customError: `invalid payload length, got ${payload.length}, expected 32`,
          });
          return;
        }
        const mac = crypto.createHmac("sha256", SHARED_SECRET);
        mac.update(payload.subarray(0, 16));
        const payloadSignatureBytes = mac.digest();
        const signatureValid = payload
          .subarray(16)
          .equals(payloadSignatureBytes.subarray(0, 16));
        if (!signatureValid) {
          console.log("invalid payload signature");
          res.status(400).json({ customError: "invalid payload signature" });
          return;
        }
        const now = Math.floor(Date.now() / 1000);
        // check payload expiration
        const expireBytes = payload.subarray(8, 16);
        const expireTime = expireBytes.readBigUint64BE();
        if (BigInt(now) > expireTime) {
          console.log("payload expired");
          res.status(400).json({ customError: "payload expired" });
          return;
        }
        // check ton proof expiration
        if (now > proof.timestamp + PROOF_TTL) {
          console.log("ton proof has been expired");
          res.status(400).json({ customError: "ton proof has been expired" });
          return;
        }
        if (proof.domain.value !== DOMAIN && proof.domain.value !== DOMAIN2 ) {
          console.log(`wrong domain, got ${proof.domain.value}, expected ${DOMAIN}`);
          res.status(400).json({
            customError: `wrong domain, got ${proof.domain.value}, expected ${DOMAIN}`,
          });
          return;
        }
        if (proof.domain.lengthBytes !== proof.domain.value.length) {
          console.log("domain length mismatched against provided length ");
          res.status(400).json({
            customError: `domain length mismatched against provided length bytes of ${proof.domain.lengthBytes}`,
          });
          return;
        }
        const parsedAddress = Address.parse(address);
        const wc = Buffer.alloc(4);
        wc.writeInt32BE(parsedAddress.workChain);
        const ts = Buffer.alloc(8);
        ts.writeBigUint64LE(BigInt(proof.timestamp));
        const dl = Buffer.alloc(4);
        dl.writeUint32LE(proof.domain.value.length);
        const tonProofPrefix = "ton-proof-item-v2/";
        const msg = Buffer.concat([
          Buffer.from(tonProofPrefix),
          wc,
          parsedAddress.hash,
          dl,
          Buffer.from(proof.domain.value),
          ts,
          Buffer.from(proof.payload),
        ]);
        const msgHash = crypto.createHash("sha256").update(msg).digest();
        const tonConnectPrefix = "ton-connect";
        const fullMsg = Buffer.concat([
          Buffer.from([0xff, 0xff]),
          Buffer.from(tonConnectPrefix),
          msgHash,
        ]);
        const fullMsgHash = crypto.createHash("sha256").update(fullMsg).digest();
        const endpoint = await getHttpEndpoint(); 
        const client3 = new TonClient({endpoint: endpoint});
        let pubkey;
        let executionRes;
        try{
          executionRes = await client3.runMethodWithError(
            parsedAddress,
            "get_public_key"
          );
          console.log("##executionRes:", executionRes);;
        } catch (e){
          console.log(e);
        }
        if (executionRes.exit_code === 0) {
          const pubkeyNum = executionRes.stack.readBigNumber();
          const pubkeyBn = new BN(pubkeyNum.toString());
          pubkey = pubkeyBn.toBuffer("be", 32);
        } else {
          const codes = {
            V1R1: "te6cckEBAQEARAAAhP8AIN2k8mCBAgDXGCDXCx/tRNDTH9P/0VESuvKhIvkBVBBE+RDyovgAAdMfMSDXSpbTB9QC+wDe0aTIyx/L/8ntVEH98Ik=",
            V1R2: "te6cckEBAQEAUwAAov8AIN0gggFMl7qXMO1E0NcLH+Ck8mCBAgDXGCDXCx/tRNDTH9P/0VESuvKhIvkBVBBE+RDyovgAAdMfMSDXSpbTB9QC+wDe0aTIyx/L/8ntVNDieG8=",
            V1R3: "te6cckEBAQEAXwAAuv8AIN0gggFMl7ohggEznLqxnHGw7UTQ0x/XC//jBOCk8mCBAgDXGCDXCx/tRNDTH9P/0VESuvKhIvkBVBBE+RDyovgAAdMfMSDXSpbTB9QC+wDe0aTIyx/L/8ntVLW4bkI=",
            V2R1: "te6cckEBAQEAVwAAqv8AIN0gggFMl7qXMO1E0NcLH+Ck8mCDCNcYINMf0x8B+CO78mPtRNDTH9P/0VExuvKhA/kBVBBC+RDyovgAApMg10qW0wfUAvsA6NGkyMsfy//J7VShNwu2",
            V2R2: "te6cckEBAQEAYwAAwv8AIN0gggFMl7ohggEznLqxnHGw7UTQ0x/XC//jBOCk8mCDCNcYINMf0x8B+CO78mPtRNDTH9P/0VExuvKhA/kBVBBC+RDyovgAApMg10qW0wfUAvsA6NGkyMsfy//J7VQETNeh",
            V3R1: "te6cckEBAQEAYgAAwP8AIN0gggFMl7qXMO1E0NcLH+Ck8mCDCNcYINMf0x/TH/gjE7vyY+1E0NMf0x/T/9FRMrryoVFEuvKiBPkBVBBV+RDyo/gAkyDXSpbTB9QC+wDo0QGkyMsfyx/L/8ntVD++buA=",
            V3R2: "te6cckEBAQEAcQAA3v8AIN0gggFMl7ohggEznLqxn3Gw7UTQ0x/THzHXC//jBOCk8mCDCNcYINMf0x/TH/gjE7vyY+1E0NMf0x/T/9FRMrryoVFEuvKiBPkBVBBV+RDyo/gAkyDXSpbTB9QC+wDo0QGkyMsfyx/L/8ntVBC9ba0=",
            V3R2Lockup: "te6ccgECHgEAAmEAART/APSkE/S88sgLAQIBIAIDAgFIBAUB8vKDCNcYINMf0x/TH4AkA/gjuxPy8vADgCJRqboa8vSAI1G3uhvy9IAfC/kBVBDF+RAa8vT4AFBX+CPwBlCY+CPwBiBxKJMg10qOi9MHMdRRG9s8ErAB6DCSKaDfcvsCBpMg10qW0wfUAvsA6NEDpEdoFBVDMPAE7VQdAgLNBgcCASATFAIBIAgJAgEgDxACASAKCwAtXtRNDTH9Mf0//T//QE+gD0BPoA9ATRgD9wB0NMDAXGwkl8D4PpAMCHHAJJfA+AB0x8hwQKSXwTg8ANRtPABghCC6vnEUrC9sJJfDOCAKIIQgur5xBu6GvL0gCErghA7msoAvvL0B4MI1xiAICH5AVQQNvkQEvL00x+AKYIQNzqp9BO6EvL00wDTHzAB4w8QSBA3XjKAMDQ4AEwh10n0qG+lbDGAADBA5SArwBQAWEDdBCvAFCBBXUFYAEBAkQwDwBO1UAgEgERIARUjh4igCD0lm+lIJMwI7uRMeIgmDX6ANEToUATkmwh4rPmMIADUCMjKHxfKHxXL/xPL//QAAfoC9AAB+gL0AMmAAQxRIqBTE4Ag9A5voZb6ANEToAKRMOLIUAP6AkATgCD0QwGACASAVFgAVven3gBiCQvhHgAwCASAXGAIBSBscAC21GH4AbYiGioJgngDGIH4Axj8E7eILMAIBWBkaABetznaiaGmfmOuF/8AAF6x49qJoaY+Y64WPwAARsyX7UTQ1wsfgABex0b4I4IBCMPtQ9iAAKAHQ0wMBeLCSW3/g+kAx+kAwAfAB",
            V4R1: "te6cckECFQEAAvUAART/APSkE/S88sgLAQIBIAIDAgFIBAUE+PKDCNcYINMf0x/THwL4I7vyY+1E0NMf0x/T//QE0VFDuvKhUVG68qIF+QFUEGT5EPKj+AAkpMjLH1JAyx9SMMv/UhD0AMntVPgPAdMHIcAAn2xRkyDXSpbTB9QC+wDoMOAhwAHjACHAAuMAAcADkTDjDQOkyMsfEssfy/8REhMUA+7QAdDTAwFxsJFb4CHXScEgkVvgAdMfIYIQcGx1Z70ighBibG5jvbAighBkc3RyvbCSXwPgAvpAMCD6RAHIygfL/8nQ7UTQgQFA1yH0BDBcgQEI9ApvoTGzkl8F4ATTP8glghBwbHVnupEx4w0kghBibG5juuMABAYHCAIBIAkKAFAB+gD0BDCCEHBsdWeDHrFwgBhQBcsFJ88WUAP6AvQAEstpyx9SEMs/AFL4J28ighBibG5jgx6xcIAYUAXLBSfPFiT6AhTLahPLH1Iwyz8B+gL0AACSghBkc3Ryuo41BIEBCPRZMO1E0IEBQNcgyAHPFvQAye1UghBkc3Rygx6xcIAYUATLBVjPFiL6AhLLassfyz+UEDRfBOLJgED7AAIBIAsMAFm9JCtvaiaECAoGuQ+gIYRw1AgIR6STfSmRDOaQPp/5g3gSgBt4EBSJhxWfMYQCAVgNDgARuMl+1E0NcLH4AD2ynftRNCBAUDXIfQEMALIygfL/8nQAYEBCPQKb6ExgAgEgDxAAGa3OdqJoQCBrkOuF/8AAGa8d9qJoQBBrkOuFj8AAbtIH+gDU1CL5AAXIygcVy//J0Hd0gBjIywXLAiLPFlAF+gIUy2sSzMzJcfsAyEAUgQEI9FHypwIAbIEBCNcYyFQgJYEBCPRR8qeCEG5vdGVwdIAYyMsFywJQBM8WghAF9eEA+gITy2oSyx/JcfsAAgBygQEI1xgwUgKBAQj0WfKn+CWCEGRzdHJwdIAYyMsFywJQBc8WghAF9eEA+gIUy2oTyx8Syz/Jc/sAAAr0AMntVEap808=",
            V4R2: "te6cckECFAEAAtQAART/APSkE/S88sgLAQIBIAIPAgFIAwYC5tAB0NMDIXGwkl8E4CLXScEgkl8E4ALTHyGCEHBsdWe9IoIQZHN0cr2wkl8F4AP6QDAg+kQByMoHy//J0O1E0IEBQNch9AQwXIEBCPQKb6Exs5JfB+AF0z/IJYIQcGx1Z7qSODDjDQOCEGRzdHK6kl8G4w0EBQB4AfoA9AQw+CdvIjBQCqEhvvLgUIIQcGx1Z4MesXCAGFAEywUmzxZY+gIZ9ADLaRfLH1Jgyz8gyYBA+wAGAIpQBIEBCPRZMO1E0IEBQNcgyAHPFvQAye1UAXKwjiOCEGRzdHKDHrFwgBhQBcsFUAPPFiP6AhPLassfyz/JgED7AJJfA+ICASAHDgIBIAgNAgFYCQoAPbKd+1E0IEBQNch9AQwAsjKB8v/ydABgQEI9ApvoTGACASALDAAZrc52omhAIGuQ64X/wAAZrx32omhAEGuQ64WPwAARuMl+1E0NcLH4AFm9JCtvaiaECAoGuQ+gIYRw1AgIR6STfSmRDOaQPp/5g3gSgBt4EBSJhxWfMYQE+PKDCNcYINMf0x/THwL4I7vyZO1E0NMf0x/T//QE0VFDuvKhUVG68qIF+QFUEGT5EPKj+AAkpMjLH1JAyx9SMMv/UhD0AMntVPgPAdMHIcAAn2xRkyDXSpbTB9QC+wDoMOAhwAHjACHAAuMAAcADkTDjDQOkyMsfEssfy/8QERITAG7SB/oA1NQi+QAFyMoHFcv/ydB3dIAYyMsFywIizxZQBfoCFMtrEszMyXP7AMhAFIEBCPRR8qcCAHCBAQjXGPoA0z/IVCBHgQEI9FHyp4IQbm90ZXB0gBjIywXLAlAGzxZQBPoCFMtqEssfyz/Jc/sAAgBsgQEI1xj6ANM/MFIkgQEI9Fnyp4IQZHN0cnB0gBjIywXLAlAFzxZQA/oCE8tqyx8Syz/Jc/sAAAr0AMntVAj45Sg=",
            V5Beta: "te6ccgEBAQEAIwAIQgLkzzsvTG1qYeoPK1RH0mZ4WyavNjfbLe7mvNGqgm80Eg==",
            V5R1: "te6cckECFAEAAoEAART/APSkE/S88sgLAQIBIAINAgFIAwQC3NAg10nBIJFbj2Mg1wsfIIIQZXh0br0hghBzaW50vbCSXwPgghBleHRuuo60gCDXIQHQdNch+kAw+kT4KPpEMFi9kVvg7UTQgQFB1yH0BYMH9A5voTGRMOGAQNchcH/bPOAxINdJgQKAuZEw4HDiEA8CASAFDAIBIAYJAgFuBwgAGa3OdqJoQCDrkOuF/8AAGa8d9qJoQBDrkOuFj8ACAUgKCwAXsyX7UTQcdch1wsfgABGyYvtRNDXCgCAAGb5fD2omhAgKDrkPoCwBAvIOAR4g1wsfghBzaWduuvLgin8PAeaO8O2i7fshgwjXIgKDCNcjIIAg1yHTH9Mf0x/tRNDSANMfINMf0//XCgAK+QFAzPkQmiiUXwrbMeHywIffArNQB7Dy0IRRJbry4IVQNrry4Ib4I7vy0IgikvgA3gGkf8jKAMsfAc8Wye1UIJL4D95w2zzYEAP27aLt+wL0BCFukmwhjkwCIdc5MHCUIccAs44tAdcoIHYeQ2wg10nACPLgkyDXSsAC8uCTINcdBscSwgBSMLDy0InXTNc5MAGk6GwShAe78uCT10rAAPLgk+1V4tIAAcAAkVvg69csCBQgkXCWAdcsCBwS4lIQseMPINdKERITAJYB+kAB+kT4KPpEMFi68uCR7UTQgQFB1xj0BQSdf8jKAEAEgwf0U/Lgi44UA4MH9Fvy4Iwi1woAIW4Bs7Dy0JDiyFADzxYS9ADJ7VQAcjDXLAgkji0h8uCS0gDtRNDSAFETuvLQj1RQMJExnAGBAUDXIdcKAPLgjuLIygBYzxbJ7VST8sCN4gAQk1vbMeHXTNC01sNe",
            HighLoadV1R1: "te6ccgEBBgEAhgABFP8A9KQT9KDyyAsBAgEgAgMCAUgEBQC88oMI1xgg0x/TH9Mf+CMTu/Jj7UTQ0x/TH9P/0VEyuvKhUUS68qIE+QFUEFX5EPKj9ATR+AB/jhghgBD0eG+hb6EgmALTB9QwAfsAkTLiAbPmWwGkyMsfyx/L/8ntVAAE0DAAEaCZL9qJoa4WPw==",
            HighLoadV1R2: "te6ccgEBCAEAmQABFP8A9KQT9LzyyAsBAgEgAgMCAUgEBQC88oMI1xgg0x/TH9Mf+CMTu/Jj7UTQ0x/TH9P/0VEyuvKhUUS68qIE+QFUEFX5EPKj9ATR+AB/jhghgBD0eG+hb6EgmALTB9QwAfsAkTLiAbPmWwGkyMsfyx/L/8ntVAAE0DACAUgGBwAXuznO1E0NM/MdcL/4ABG4yX7UTQ1wsfg=",
            HighLoadV2:   "te6ccgEBCQEA5QABFP8A9KQT9LzyyAsBAgEgAgcCAUgDBAAE0DACASAFBgAXvZznaiaGmvmOuF/8AEG+X5dqJoaY+Y6Z/p/5j6AmipEEAgegc30JjJLb/JXdHxQB6vKDCNcYINMf0z/4I6ofUyC58mPtRNDTH9M/0//0BNFTYIBA9A5voTHyYFFzuvKiB/kBVBCH+RDyowL0BNH4AH+OFiGAEPR4b6UgmALTB9QwAfsAkTLiAbPmW4MlochANIBA9EOK5jEByMsfE8s/y//0AMntVAgANCCAQPSWb6VsEiCUMFMDud4gkzM2AZJsIeKz",
            HighLoadV2R1: "te6ccgEBBwEA1gABFP8A9KQT9KDyyAsBAgEgAgMCAUgEBQHu8oMI1xgg0x/TP/gjqh9TILnyY+1E0NMf0z/T//QE0VNggED0Dm+hMfJgUXO68qIH+QFUEIf5EPKjAvQE0fgAf44YIYAQ9HhvoW+hIJgC0wfUMAH7AJEy4gGz5luDJaHIQDSAQPRDiuYxyBLLHxPLP8v/9ADJ7VQGAATQMABBoZfl2omhpj5jpn+n/mPoCaKkQQCB6BzfQmMktv8ld0fFADgggED0lm+hb6EyURCUMFMDud4gkzM2AZIyMOKz",
            HighLoadV2R2: "te6ccgEBCQEA6QABFP8A9KQT9LzyyAsBAgEgAgMCAUgEBQHu8oMI1xgg0x/TP/gjqh9TILnyY+1E0NMf0z/T//QE0VNggED0Dm+hMfJgUXO68qIH+QFUEIf5EPKjAvQE0fgAf44YIYAQ9HhvoW+hIJgC0wfUMAH7AJEy4gGz5luDJaHIQDSAQPRDiuYxyBLLHxPLP8v/9ADJ7VQIAATQMAIBIAYHABe9nOdqJoaa+Y64X/wAQb5fl2omhpj5jpn+n/mPoCaKkQQCB6BzfQmMktv8ld0fFAA4IIBA9JZvoW+hMlEQlDBTA7neIJMzNgGSMjDisw==",
          };
          const boc = Cell.fromBase64(proof.state_init);
          const code = boc.refs[0];
          const data = boc.refs[1];
          const version = code.toBoc().toString("base64");
          switch (version) {
            case codes.V1R1:
            case codes.V1R2:
            case codes.V1R3:
            case codes.V2R1:
            case codes.V2R2: {
              // skip seqno
              pubkey = data.asSlice().skip(32).loadBuffer(32);
              break;
            }
            case codes.V3R1:
            case codes.V3R2:
            case codes.V4R1:
            case codes.V4R2: {
              // skip seqno, walletId
              pubkey = data.asSlice().skip(64).loadBuffer(32);
              break;
            }
            case codes.V5Beta: {
              // skip isSignatureAuthAllowed, seqno, walletId
              pubkey = data.asSlice().skip(113).loadBuffer(32);
              break;
            }
            case codes.V5R1: {
              // skip isSignatureAuthAllowed, seqno, walletId
              pubkey = data.asSlice().skip(65).loadBuffer(32);
              break;
            }
            default: {
              console.log("unsupported wallet version");
              res.status(400).json({
                customError: "unsupported wallet version",
              });
              return;
            }
          }
        }
        const proofSignatureBytes = Buffer.from(proof.signature, "base64");
        const verified = nacl.sign.detached.verify(
          fullMsgHash,
          proofSignatureBytes,
          pubkey
        );
        if (!verified) {
          console.log("verification failed");
          res.status(401).json({
            customError: "verification failed",
          });
          return;
        }
        const claims = {
          exp: now + PAYLOAD_TTL,
          address: parsedAddress.toString(),
          username: username
        };
        const token = jwt.sign(claims, SHARED_SECRET);
        let user = await saveOrUpdateUser(parsedAddress.toString(), username);
        res.json({ token: token, usr: user });
      } catch(e){
        console.log("##check-proof #ERROR: ", e);
        res.status(500).json({
          customError: "verification failed",
        });
        return;
      }
});


app.post("/save-referal",   async (req, res ) => {
  let body = req.body;
  const username  =  body.username;
  const refcode  =  body.refcode;
  if (!username || username.length < 2 ) {
    console.log("/save-referal", username, refcode);
    res.status(401).json({
      customError: "Invalid username",
    });
    return;
  }
  let referal = await Referal.findOne({ username: username});
  let refUser = await User.findOne({ refcode: refcode});
  if(!referal){
    if (refUser){
      referal = new Referal({
        username: username,
        referrer: refUser.username,
        refcode: refcode
      });
    } else {
      referal = new Referal({
        username: username,
        referrer: "none",
        refcode: refcode
      });
    }
    await referal.save();
  } else {
    if (refUser){
      referal.referrer = refUser.username;
      referal.refcode = refcode;
      await referal.save();
    }
  }
  res.json({success: true});
  return;
});


const saveOrUpdateUser = async (address, username) => {
  console.log("## saveOrUpdateUser ", address, username);
  let user = await User.findOne({ username: username});
  let referal = await Referal.findOne({ username: username});
  let referrer = "none";
  if(referal){
    referrer = referal.referrer; // address
  } 
  if(!user){
    user = await User.findOne({ username: username});
  }
  if(!user){
    user = new User({
        address: username,
        username: username,
        referrer: referrer,
        referrals: 0,
        balance: USER_WELCOME_COINS ,
        tickets: USER_WELCOME_TICKETS,
        limit: USER_WELCOME_LIMIT,
        last_claim: Date.now(),
        next_claim: Date.now() + CLAIMING_TIME,
        total_claimed: 0,
        total_played: 0,
        total_profit: 0,
        bet_amount: 0,
        claimed_x: false,
        claimed_tg: false,
        games: 0,
        refcode: uid.rnd()
    });
    await user.save();
    let analytics = await Analytics.findOne({ game: 1});
    analytics.total_users += 1;
    analytics.total_claims += 1;
    analytics.total_claimed += USER_WELCOME_COINS;
    await analytics.save();
    if(referrer){
      let _referrer = await User.findOne({ username: referrer});
      if(_referrer){
        _referrer.referrals = _referrer.referrals + 1;
        _referrer.balance = _referrer.balance + USER_REFERAL_COINS;
        _referrer.tickets = _referrer.tickets + USER_REFERAL_TICKETS;
        _referrer.limit = _referrer.limit + USER_REFERAL_LIMIT;
        await _referrer.save();
        analytics.total_referals += 1;
        analytics.total_referals_amount += USER_REFERAL_COINS;
        await analytics.save();
      } 
    }
  } else {
    user.address = address;
    await user.save();
  }
  let userData = getUserData(user);
  return userData;
}

function getUserData(user){
    let userData = {};
    userData.address = user.address;
    userData.username = user.username;
    userData.balance = user.balance;
    userData.referrals = user.referrals;
    userData.tickets = user.tickets;
    userData.games = user.games;
    userData.limit = user.limit;
    userData.last_claim = user.last_claim.getTime();
    userData.next_claim = user.next_claim.getTime();
    userData.date =  Date.now();
    userData.refcode = user.refcode;
    userData.claimed_x = user.claimed_x;
    userData.claimed_tg = user.claimed_tg;
    return userData;

}

// Routes
app.get("/user", checkAuthenticated, async (req, res) => {
  if (!req.headers.username || req.headers.username.length < 3){
    console.log("##invalid username", req.headers.username);
    res.status(400).json({ customError: "invalid username" });
    return;
  } 
  let user = await User.findOne({ username: req.headers.username});
  if (!user){
    console.log("##USER not found", req.headers.username);
    res.status(400).json({ customError: "User not found" });
    return;
  } 
  let userData = getUserData(user);
  res.send(userData);
  console.log("##USER found", userData);
  return;
});

app.post("/claim_follow", checkAuthenticated, async (req, res) => {
  if (!req.headers.username || req.headers.username.length < 3){
    console.log("##invalid username", req.headers.username);
    res.status(400).json({ customError: "invalid username" });
    return;
  } 
  let user = await User.findOne({ username: req.headers.username});
  if(!user){
    res.status(400).json({ customError: "unknown user" });
    return;
  }
  if(req.body.claim_x){
    if(user.claimed_x){
      res.status(400).json({ customError: "already claimed" });
      return;
    }
    user.claimed_x = true;
  }else {
    if(user.claimed_tg){
      res.status(400).json({ customError: "already claimed" });
      return;
    }
    user.claimed_tg = true;
  }
  user.balance = user.balance + USER_REFERAL_COINS;
  user.tickets = user.tickets + USER_REFERAL_TICKETS;
  user.limit = user.limit + USER_REFERAL_LIMIT;
  await user.save();
  let userData = getUserData(user);
  res.json({success: true, users: userData});
  return;
});

app.post("/claim", checkAuthenticated, async (req, res) => {
  if (!req.headers.username || req.headers.username.length < 3){
    console.log("##invalid username", req.headers.username);
    res.status(400).json({ customError: "invalid username" });
    return;
  } 
  let user = await User.findOne({ username: req.headers.username});
  if(!user){
    res.status(400).json({ customError: "unknown user" });
    return;
  }
  if (user.next_claim.getTime() > Date.now() ){
    console.log("##CLAIM not in a claiming window", user);
    res.status(400).json({ customError: "Come back later" });
    return;
  } 
  user.balance = user.balance + USER_CLAIM_COINS;
  user.tickets = user.tickets + USER_CLAIM_TICKETS;
  user.limit = user.limit + USER_CLAIM_LIMIT;
  user.last_claim = Date.now();
  user.next_claim = Date.now() + CLAIMING_TIME;
  user.total_claimed = user.total_claimed + USER_CLAIM_COINS;
  await user.save();

  let analytics = await Analytics.findOne({ game: 1});
  analytics.total_claims += 1;
  analytics.total_claimed += USER_CLAIM_COINS;
  await analytics.save();
  console.log("##CLAIM success", user);
  let userData = getUserData(user);
  res.json({success: true, users: userData});
  return;
});
 

app.post('/send_bet', checkAuthenticated, async (req, res) => {
  if (!req.headers.username || req.headers.username.length < 3){
    console.log("##invalid username", req.headers.username);
    res.status(400).json({ customError: "invalid username" });
    return;
  } 
  if (!betting_phase) {
    res.status(400).json({ customError: "IT IS NOT THE BETTING PHASE" });
    return;
  }
  if (isNaN(req.body.bet_amount) == true ) {
    res.status(400).json({ customError: "Amount not a number" });
  }
  if ( req.body.bet_amount < 1) {
    res.status(400).json({ customError: "Invalid bet amount" });
  }
  let theLoop = await Game_loop.findById(GAME_LOOP_ID);
  let playerIdList = theLoop.active_player_id_list;
  for (var i = 0; i < playerIdList.length; i++) {
    if (playerIdList[i] === req.headers.username) {
      res.status(400).json({ customError: "You have an active bet in this round" });
      return;
    }
  }

  let thisUser = await User.findOne({ username: req.headers.username});

  if (req.body.bet_amount > thisUser.balance) {
    res.status(400).json({ customError: "Not enough coins" });
    return;
  }
  if (req.body.bet_amount > thisUser.limit) {
    res.status(400).json({ customError: "Bet too big" });
    return;
  }
  if ( thisUser.tickets < 1) {
    res.status(400).json({ customError: "No tickets left" });
    return;
  }
  thisUser.bet_amount = req.body.bet_amount;
  thisUser.balance = thisUser.balance - req.body.bet_amount;
  thisUser.games = thisUser.games + 1;
  thisUser.total_played = thisUser.total_played + req.body.bet_amount;
  thisUser.tickets = thisUser.tickets -1;

  await thisUser.save();
  await Game_loop.findByIdAndUpdate(GAME_LOOP_ID, { $push: { active_player_id_list: req.headers.username } });
  await Game_loop.findByIdAndUpdate(GAME_LOOP_ID, { 
    total_players: theLoop.total_players +1, 
    total_played: theLoop.total_played + req.body.bet_amount,
    total_profit: theLoop.total_played + req.body.bet_amount
  } );


  let info_json = {
    the_username: req.headers.username,
    bet_amount: req.body.bet_amount,
    cashout_multiplier: null,
    profit: null,
    b_bet_live: true,
  }
  live_bettors_table.push(info_json);
  let userData = getUserData(thisUser);

  io.emit("receive_live_betting_table", JSON.stringify(live_bettors_table));
  res.json({success: true, users: userData});
});


app.get('/reward', async (req, res) => {
    let userId = req.query.userId;
    let reward = await Rewards.findOne({ userid: userId});
    if(reward){
      res.status(400).json({ customError: "already claimed" });
      return;
    }
    reward.userid = userId; 
    await reward.save(); 
    res.json({ 
      success: true
    });
    return;
})

app.get('/get_game_status', async (req, res) => {
  if (betting_phase == true) {
    res.json({ 
      phase: 'betting_phase', 
      info: phase_start_time,
      users: JSON.stringify(live_bettors_table),
      previuos: previuos
    });
    return;
  }
  else if (game_phase == true) {
    res.json({ 
      phase: 'game_phase', 
      info: phase_start_time,
      users: JSON.stringify(live_bettors_table),
      previuos: previuos
    });
    return;
  }
})

app.post('/cashout', checkAuthenticated, async (req, res) => {
  if (!req.headers.username || req.headers.username.length < 3){
    console.log("##invalid username", req.headers.username);
    res.status(400).json({ customError: "invalid username" });
    return;
  } 
  if (!game_phase) {
    res.status(400).json({ customError: "Not in game" });
    return;
  }
  let theLoop = await Game_loop.findById(GAME_LOOP_ID);
  if(!theLoop.active_player_id_list.includes(req.headers.username)){
    res.status(400).json({ customError: "Not in game" });
    return;
  } 
  let time_elapsed = (Date.now() - phase_start_time) / 1000.0;
  let current_multiplier = (1.0024 * Math.pow(1.1318, time_elapsed)).toFixed(2);
  if (current_multiplier <= game_crash_value) {
    await theLoop.updateOne({ $pull: { "active_player_id_list": req.headers.username } });
    let currUser = await User.findOne({ username: req.headers.username});
    let betAmount = currUser.bet_amount;
    currUser.balance += betAmount * current_multiplier;
    currUser.total_profit += betAmount * current_multiplier;
    currUser.bet_amount = 0;
    await currUser.save();
    let userData = getUserData(currUser);
    await Game_loop.findByIdAndUpdate(GAME_LOOP_ID, { 
      total_profit: theLoop.total_profit - betAmount * current_multiplier
    });

    for (const bettorObject of live_bettors_table) {
      if (bettorObject.the_username === req.headers.username) {
        bettorObject.cashout_multiplier = current_multiplier;
        bettorObject.profit = (betAmount * current_multiplier) - betAmount;
        bettorObject.b_bet_live = false;
        io.emit("receive_live_betting_table", JSON.stringify(live_bettors_table));
        res.json({success: true, current_multiplier: current_multiplier, profit: (betAmount * current_multiplier), users: userData});
        return;
      }
    }
  }
  console.log("#cashout: Invalid request: ");
  res.json({success:false});
  return;
});
 
app.get('/retrieve_active_bettors_list', async (req, res) => {
  io.emit("receive_live_betting_table", JSON.stringify(live_bettors_table));
  return
});

app.get('/retrieve_bet_history', async (req, res) => {
  previuos =  await Previuos.find().sort('-updatedAt').limit(10);
  io.emit('crash_history', previuos);
  return
});

app.listen(4000, () => {});

let live_bettors_table = [];
let betting_phase = false;
let game_phase = false;
let cashout_phase = true;
let game_crash_value = -69;
let sent_cashout = true;
let phase_start_time = Date.now();

// Replace by a CRON JOB
setInterval(async () => {
  await loopUpdate()
}, 50);  

// Game Loop
const loopUpdate = async () => {
  let time_elapsed = (Date.now() - phase_start_time) / 1000.0;
  if (betting_phase) {
    if (time_elapsed > BEETING_TIME) {
      sent_cashout = false;
      betting_phase = false;
      game_phase = true;
      io.emit('start_multiplier_count');
      phase_start_time = Date.now();
    }
  } else if (game_phase) {
    let current_multiplier = (1.0024 * Math.pow(1.1318, time_elapsed)).toFixed(2);
    if (current_multiplier > game_crash_value) {
      game_phase = false;
      cashout_phase = true;
      io.emit('stop_multiplier_count', game_crash_value.toFixed(2));
      phase_start_time = Date.now();
    }
  } else if (cashout_phase) {
    cashout_phase = false;
    betting_phase = true;
    io.emit('start_betting_phase');
    let theLoop = await Game_loop.findById(GAME_LOOP_ID);
    if(!theLoop){
      //Initialize the GAME_LOOP
      theLoop = new Game_loop({
        _id: GAME_LOOP_ID,
        round_number: 0,
        active_player_id_list: [],
        multiplier_crash: 0,
        time_now: Date.now(),
        total_played: 0,
        total_profit: 0,
        total_players: 0,
        round_id_list:[]
      });
      await theLoop.save();
    }
    let analytics = await Analytics.findOne({ game: 1});
    if(!analytics){
      analytics = new Analytics({
        game: 1,
        total_rounds: 1,
        total_games: 0,
        total_users: 0,
        total_claims: 0,
        total_claimed: 0,
        total_referals: 0,
        total_referals_amount: 0,
        total_user_bet_amount: 0,
        total_user_earned: 0
      });
      await analytics.save();
    }

    sent_cashout = true;
    const _previous = new Previuos({
      value: game_crash_value,
      hash: "hash",
      seed: 0
    });
    let latest = new History({
      round_number: theLoop.round_number,
      active_player_id_list: theLoop.active_player_id_list,
      multiplier_crash: theLoop.multiplier_crash,
      time_now: theLoop.time_now,
      total_played: theLoop.total_played,
      total_profit: theLoop.total_profit,
      total_players: theLoop.total_players,
      round_id_list: theLoop.round_id_list
    });

    analytics.total_rounds += 1;
    analytics.total_user_bet_amount += theLoop.total_played;
    analytics.total_user_earned  += theLoop.total_profit;
    analytics.total_games += theLoop.total_players;

    await analytics.save();
    await latest.save();
    await _previous.save();
    let randomInt = Math.floor(Math.random() * (9999999999 - 0 + 1) + 0);
    console.log("#randomInt: ", randomInt);
    if (randomInt % 20 == 0) {
      game_crash_value = 1.1;
    } else {
      let random_int_0_to_1 = Math.random();
      while (random_int_0_to_1 == 0) {
        random_int_0_to_1 = Math.random();
      }
      console.log("#randomInt: ", randomInt);
      game_crash_value = 0.01 + (0.99 / random_int_0_to_1);
      console.log("#game_crash_value1: ", game_crash_value);
      game_crash_value = Math.round(game_crash_value * 100) / 100;
      console.log("#game_crash_value2: ", game_crash_value);
    }
    let rounds = await Previuos.find().estimatedDocumentCount();
    theLoop.active_player_id_list = [];
    theLoop.round_id_list = [];
    theLoop.total_played =0;
    theLoop.total_profit =0;
    theLoop.time_now = Date.now();
    theLoop.round_number = rounds;
    theLoop.multiplier_crash = game_crash_value;
    await theLoop.save();
    io.emit('update_user');
    previuos =  await Previuos.find().sort('-updatedAt').limit(10);
    io.emit('crash_history', previuos);
    io.emit('testingvariable');
    live_bettors_table = [];
   }


}
