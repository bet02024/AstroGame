import React, { useEffect, useState, useRef } from "react";
import Axios from "axios";
import { io }from "socket.io-client";
import { v4 as uuidv4 } from "uuid";
import { useTonConnectUI, ConnectedWallet, useTonAddress } from "@tonconnect/ui-react";
import { notification } from 'antd';
import { PhaserGame } from './game/PhaserGame';
import Countdown from 'react-countdown';
import ConfettiExplosion, { ConfettiProps } from 'react-confetti-explosion';
import { Avatar, Flex, Image, Button, Box, VStack, HStack, Stack, StackDivider, Heading, Text, Center, VisuallyHidden } from "@chakra-ui/react";
import { Link, Tabs, TabList, TabPanels, Tab, TabPanel } from '@chakra-ui/react'
import { Accordion, AccordionItem, AccordionButton, AccordionPanel, AccordionIcon} from '@chakra-ui/react';
import { Card, CardHeader, CardBody } from '@chakra-ui/react';
import { useDisclosure, Modal, ModalOverlay, ModalContent, ModalHeader, ModalFooter, ModalBody, ModalCloseButton } from '@chakra-ui/react';
import WebApp from "@twa-dev/sdk"; 

//const API_BASE = "http://localhost:4000";
const API_BASE = "https://api.astrodegen.com";
//const SOCKET_URL = "http://localhost:3001";
const SOCKET_URL =  "https://socket.astrodegen.com";


const truncateRegex = /^([a-zA-Z0-9]{4})[a-zA-Z0-9]+([a-zA-Z0-9]{4})$/;
const truncateEthAddress = (address: string) => {
  const match = address.match(truncateRegex);
  if (!match) return address;
  return `${match[1]}…${match[2]}`;
};

const mediumProps: ConfettiProps = {
  force: 0.5,
  duration: 4500,
  particleCount: 200,
  width: 1000,
  colors: ['#9A0023', '#FF003C', '#AF739B', '#FAC7F3', '#F7DBF4'],
};
interface UserData {
  address: string;
  username: string;
  balance: number;
  referrals: number;
  tickets: number;
  games:  number;
  limit: number;
  last_claim: number;
  next_claim: number;
  refcode: number;
  date: number;
  claimed_x : boolean;
  claimed_tg: boolean;
}

interface CrashHistoryEntry {
  value: number;
}


export function Game() {
  const [sessionPayload, setSessionPayload] = useState(null);
  const [token, setToken] = useState<string | null >(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [liveMultiplier, setLiveMultiplier] = useState("");
  const [liveMultiplierSwitch, setLiveMultiplierSwitch] = useState(false);
  const [betActive, setBetActive] = useState(false);
  const [outsideTon, setOutsideTon] = useState(false);
  const [currentBet, setCurrentBet] = useState(0);
  const [currentProfit, setCurrentProfit] = useState(0);
  const [currentCashoutMultiplier, setCurrentCashoutMultiplier] = useState(0);
  const [currentCrashMultiplier, setCurrentCrashMultiplier] = useState(0);
  const [crashHistory, setCrashHistory] = useState<number[]>([]);
  const [bBettingPhase, setbBettingPhase] = useState(false);
  const [liveBettingTable, setLiveBettingTable] = useState<string | null>(null);
  const [globalTimeNow, setGlobalTimeNow] = useState(0);
  const [tonConnectUI] = useTonConnectUI();
  const address =  useTonAddress();
  const [sceneName, setSceneName] = useState(null);
  const [username, setUsername] = useState(null);
  const [userId, setUserId] = useState(0);
  const [refcode, setRefcode] = useState("none");
  const [initData, setInitData] = useState(null);
  const [api, contextHolder] = notification.useNotification();
  const [isMediumExploding, setIsMediumExploding] = React.useState(false);
  const [nextClaim, setNextClaim] = useState(0);
  const [error, setError] = useState(null);


  const { isOpen, onOpen, onClose } = useDisclosure();

  const { isOpen: isOpenModal, onOpen: onOpenModal,  onClose: onCloseModal } = useDisclosure();
 
    useEffect(() => {
      if(outsideTon){
        api.open({
          message: "Ups",
          description:  "App opened outside Telegram, You may not be able to refer others, please open the App from Telegram.",
          duration: 4,
        });
      }
    }, [outsideTon]);

    useEffect(() => {
      if(error && error.length > 1){
        api.open({
          message: "Ups",
          description:  error,
          duration: 4,
        });
        setError(null);
      }
    }, [error]);

    
    
  const phaserRef = useRef();
  const BEETING_TIME = 30;

  const currentScene = (scene: { scene: { key: string; }; }, name: string) => {
    setSceneName(name);
   }


  const changeTextMultiplier = (text : string) => {
    const scene = phaserRef && phaserRef.current && phaserRef.current.scene ? phaserRef.current.scene : null; // eslint-disable-line
    if (scene){
       try {
        scene.changeText(text);
      } catch(e){
        console.log(e);
      }
    }
  }

  useEffect(() => {
    const scene = phaserRef?.current.scene;
    if (scene){
      try {
        scene.updateScore(userData?.balance > 0 ? userData?.balance : 0, 
          userData?.tickets > 0 ? userData?.tickets : 0, 
          userData?.limit > 0 ? userData?.limit : 0,
          currentBet > 0 ? currentBet : 0, 
          currentProfit > 0 ? currentProfit : 0,
          currentCashoutMultiplier, 
          currentCrashMultiplier);
      } catch(e){
        console.log(e);
      }
    }
  }, [userData, sceneName, currentBet, currentProfit, currentCashoutMultiplier, currentCrashMultiplier]);

  useEffect(() => {
    const scene = phaserRef.current.scene;
    if (scene && sceneName){
        scene.setActiveBet(betActive, bBettingPhase, globalTimeNow);
    }
  }, [ betActive, bBettingPhase, sceneName]);

 
  useEffect(() => {
    if (token){
      localStorage.setItem('token', token);
    }  
  }, [token]);


  useEffect(() => {
    checkParams();
    if (sessionPayload) {
      tonConnectUI.setConnectRequestParameters({
          state: "ready",
          value: { tonProof: sessionPayload }
      });
    }
  }, [sessionPayload]);

  useEffect(() => {
    getUser();
    get_game_status();
  }, [address, token]);


 
  // Socket.io setup
  useEffect(() => {
    tonConnectUI.onStatusChange(wallet => {
        if (wallet && wallet.connectItems?.tonProof && 'proof' in wallet.connectItems.tonProof) {
          checkProof(wallet.connectItems.tonProof.proof, wallet);
        } else {
          console.log("##Disconected###");
        }
        if (!tonConnectUI.connected){
          //onOpen();
        }
    });
    const socket = io(SOCKET_URL);
    socket.on("start_multiplier_count", function () {
      setGlobalTimeNow(Date.now());
      setLiveMultiplierSwitch(true);
      get_game_status();
      setbBettingPhase(false);
      setCurrentProfit(0);
      setCurrentCashoutMultiplier(0);
      //console.log("##start_multiplier_count event##");
    });
    socket.on("stop_multiplier_count", function (data: React.SetStateAction<string>) {
      setGlobalTimeNow(Date.now());
      setLiveMultiplierSwitch(false);
      setBetActive(false);
      get_game_status();
      setCurrentBet(0);
      setbBettingPhase(true);
      setCurrentCrashMultiplier(parseFloat(data.toString()));
    });

    socket.on("crash_history", function (data: CrashHistoryEntry[]) {
      let history: number[] = [];
      for (var i = 0; i < data.length; i++) {
        history.push(data[i].value);
      }
      setCrashHistory(history.reverse()); 
    });

    socket.on("start_betting_phase", function () {
      setGlobalTimeNow(Date.now());
      setbBettingPhase(true);
      setLiveBettingTable(null);
      setBetActive(false);
      setCurrentBet(0);
      setLiveMultiplierSwitch(false);
      get_game_status(); 
      //console.log("##start_betting_phase event##");
    });

    socket.on("receive_live_betting_table", (data: string) => {
      setLiveBettingTable(data);
      get_game_status();
    });

    const _token = localStorage.getItem('token');
    if (_token) {
      setToken(_token);
    }
    generateSessionPayload();
    get_game_status();
    return () => {
      socket.disconnect();
    };
  }, []);

  //// Game live counter update
  useEffect(() => {
    let gameCounter: NodeJS.Timeout;
    if (liveMultiplierSwitch) {
      gameCounter = setInterval(() => {
        const time_elapsed = (Date.now() - globalTimeNow) / 1000.0;
        const multi = (1.0024 * Math.pow(1.1318, time_elapsed)).toFixed(2);
        setLiveMultiplier(multi);
        changeTextMultiplier(multi + "X");
      }, 50);
    }
    return () => {
      clearInterval(gameCounter);
    };
  }, [liveMultiplierSwitch, globalTimeNow]);

  //// Betting phase started
  useEffect(() => {
    let bettingInterval: NodeJS.Timeout;
    if (bBettingPhase) {
      bettingInterval = setInterval(() => {
        const time_elapsed = (Date.now() - globalTimeNow) / 1000.0;
        const time_remaining = (BEETING_TIME - time_elapsed).toFixed(0);
        if (parseInt(time_remaining) > 0) {
          changeTextMultiplier("Next in " + parseInt(time_remaining));
        }
      }, 200);
    }
    return () => {
      clearInterval(bettingInterval);
      changeTextMultiplier("");
    };
  }, [bBettingPhase, globalTimeNow]);


  const checkParams = async () => {
    try{
      console.log("#WebApp#", WebApp.initDataUnsafe);
      console.log(WebApp.initData);
      setInitData(WebApp.initData);
      setUsername(WebApp.initDataUnsafe.user.username);
      setRefcode(WebApp.initDataUnsafe.start_param);
      setUserId(WebApp.initDataUnsafe.user.id);
      const _token = localStorage.getItem('token');
      await saveReferal();
      if (!_token){
        await generateToken();
      }
    } catch(e){
      console.log("#e#", e);
      if(!outsideTon){
        setOutsideTon(true);
      }
    }
  };

  const validateConnection = async () => {
    await get_game_status(); 
    if (!token){
      setOutsideTon(true);
    }
  };

  const clickCashoutGame = async () => {
    if(betActive && parseFloat(liveMultiplier) > 0.0 ){
      cashout();
    }
  };

  const clickBetGame = async (value: string) => {
    send_bet( parseInt(value));
  };


  const claim_follow = async (claim_x: boolean) => {
    if (!token ){
      return;
    }
    if(claim_x){
      WebApp.openLink('https://x.com/AstroPunkDegen');
    } else {
      WebApp.openTelegramLink('https://t.me/astrodegenpunk');
    }
    try {
        let res = await Axios({
          method: "POST",
          headers: getAuthHeader(),
          data: {
            claim_x: claim_x,
          },
          url: API_BASE + "/claim_follow"  
        });
        if (res.status == 200){
            setUserData(res.data.users);
            setNextClaim( Date.now() + res.data.users.next_claim - res.data.users.date);
        } else {
            console.log(res.data);
            setError(res.data.customError);
        } 
    } catch(e){
      setError(e.response.data.customError);
    }
  };
  
  const copyCipboard = () => {
    let url = "https://t.me/AstroDegenBot/AstroDegen?startapp=" + userData?.refcode;
    let text = "Start playing this new tap to earn game Astro, 🚀 and try to escape before the crash!💥";
     WebApp.openTelegramLink(`https://t.me/share/url?url=${url}&text=${text}`);
  };
  
  const generateSessionPayload = async () => {
    let res = await Axios({ method: "POST", url: API_BASE + "/generate-payload"});
    //console.log("generateSessionPayload:: ", res.data);
    setSessionPayload(res.data.payload);
    return;
  };

  const generateToken = async ( ) => {
    const reqBody = {
      initData: initData,
      username: username
    };
    let res = await Axios({ method: "POST", data: reqBody, url: API_BASE + "/generate-token" });
    if (res.status == 200){
      //console.log("setToken ", res.data);
      setToken(res.data.token);
      setUserData(res.data.usr);
      setNextClaim( Date.now() + res.data.usr.next_claim - res.data.usr.date);
      onOpenModal();
      setIsMediumExploding(!isMediumExploding);
      setTimeout(onCloseModal, 2000);
      WebApp.HapticFeedback.impactOccurred('heavy');
    } else {
      console.log(res.data);
      setError(res.data.customError);
    }
  };

  const checkProof = async ( proof: { timestamp: number; domain: { lengthBytes: number; value: string; }; payload: string; signature: string; } , wallet: ConnectedWallet) => {
    //console.log("#checkProof ", username, wallet.account.address)
    const reqBody = {
      address: wallet.account.address,
      username: username,
      userId: userId,
      proof: {
        ...proof,
        state_init: wallet.account.walletStateInit,
      },
    };
    try { 
      let res = await Axios({ method: "POST", data: reqBody, url: API_BASE + "/check-proof" });
      if (res.status == 200){
        //console.log("setToken ", res.data);
        setToken(res.data.token);
        setUserData(res.data.usr);
        setNextClaim( Date.now() + res.data.usr.next_claim - res.data.usr.date);
      } else {
        console.log(res.data);
        setError(res.data.customError);
      }
    } catch(e){
      setError(e.response.data.customError);
    }

    
  };

  const saveReferal = async () => {
    if (!username || !refcode){
      return;
    }
    const reqBody = {
      username: username,
      refcode: refcode,
    };
    try { 
      let res = await Axios({ method: "POST", data: reqBody, url: API_BASE + "/save-referal" });
      if (res.status != 200){
        console.log(res.data);
        setError(res.data.customError);
      } 
    } catch(e){
      setError(e.response.data.customError);
    }
  };

  const getAuthHeader = () => {
    let header =  {
      Authorization: `Bearer ${token}`,
      Address: `${address}`,
      Username: `${username}`,
      Initdata: `${initData}`,
      'Content-Type': 'application/json',
    }
    return header;
  };

  const getUser = async () => {
    if (!token ){
      return;
    }
    try {
      let res = await Axios({
        method: "GET",
        headers: getAuthHeader(),
        url: API_BASE + "/user",
      });
      if (res.status == 200){
        setUserData(res.data);
        setNextClaim( Date.now() + res.data.next_claim - res.data.date);
        get_game_status();
      } else {
        console.log(res.data);
        localStorage.removeItem('token');
      }
    } catch(e){
      //setError(e.response.data.customError);
      localStorage.removeItem('token');
      checkParams();
    }
  };
 

  const send_bet = async (val:number) => {
    if (!token || val < 1){
      return;
    }
    try {
      let res = await Axios({
        method: "POST",
        headers: getAuthHeader(),
        data: {
          bet_amount: val,
        },
        url: API_BASE + "/send_bet",
      });
      if (res.status == 200){
        setUserData(res.data.users);
        setNextClaim( Date.now() + res.data.users.next_claim - res.data.users.date);
        setBetActive(true);
        setCurrentBet(val);
        setCurrentProfit(0);
        setCurrentCashoutMultiplier(0);
      } else {
        setError(res.data.customError);
      }
    } catch(e){
      setError(e.response.data.customError);
    }
  };

  const get_game_status = () => {
    Axios.get(API_BASE + "/get_game_status")
      .then((res) => {
        //console.log("##get_game_status ", res.data);
        if (res.data.phase === "betting_phase") {
          setGlobalTimeNow(res.data.info);
          setbBettingPhase(true);
          setLiveMultiplierSwitch(false);
        } else if (res.data.phase === "game_phase") {
          setGlobalTimeNow(res.data.info);
          setLiveMultiplierSwitch(true);
          setbBettingPhase(false);
        }
        let history: number[] = [];
        for (var i = 0; i < res.data.previuos.length; i++) {
          history.push(res.data.previuos[i].value);
        }
        setCrashHistory(history.reverse()); 
        setLiveBettingTable(res.data.users);
      });
  };

  //
  const claim =  async () => {
    if (!token ){
      return;
    }
    try {
        let res = await Axios({
            method: "POST",
            headers: getAuthHeader(),
            url: API_BASE + "/claim"  
          });
            if (res.status == 200){
              setUserData(res.data.users);
              setIsMediumExploding(!isMediumExploding);
              setNextClaim( Date.now() + res.data.users.next_claim - res.data.users.date);
            } else {
              console.log("/claim ", res.data);
              setError(res.data.customError);
            } 
    } catch(e){
      setError(e.response.data.customError);
    }
  };




  const cashout = async () => {
    if (!token ){
      return;
    }
    try {
        let res = await Axios({
          method: "POST",
          headers: getAuthHeader(),
          url: API_BASE + "/cashout"  
        });
        if (res.status == 200){
            setUserData(res.data.users);
            setNextClaim( Date.now() + res.data.users.next_claim - res.data.users.date);
            setBetActive(false);
            setCurrentProfit(res.data.profit);
            setCurrentCashoutMultiplier(res.data.current_multiplier);
        } else {
            console.log(res.data);
            setError(res.data.customError);
        } 
    } catch(e){
      setError(e.response.data.customError);
    }
  };

  // JSX
  return (
      <Box w="100%" h="100%" className="App">
        {contextHolder}
          <Tabs  w="100%" h="100%" p={0} m={0} variant='enclosed' size="lg" colorScheme="pink">
            <TabList mb='1em' w="100%" >
              <Tab w="100%" onClick={validateConnection}> <Avatar  size='sm' src='assets/play.png' />&nbsp;Play</Tab>
              <Tab w="100%" onClick={validateConnection}>  <Avatar  size='sm' src='assets/farming.png' />&nbsp;Farming</Tab>
            </TabList>
            <TabPanels>
              <TabPanel w="100%" >
                  <Image  w="500px"   />
                  <PhaserGame 
                    ref={phaserRef} 
                    callBackCashout={clickCashoutGame} 
                    callBackClick={clickBetGame}
                    currentActiveScene={currentScene} />
                  <Accordion allowMultiple w="100%">
                              <AccordionItem>
                                <h2>
                                  <AccordionButton>
                                    <Box as='span' flex='1' textAlign='center'>
                                    Live Tracker
                                    </Box>
                                    <AccordionIcon />
                                  </AccordionButton>
                                </h2>
                                <AccordionPanel pb={4}>
                                <HStack h="100%" w="100%" p={0} m={0}>
                                    <Box  w="20%" className="grid-elements"  p={0} m={0}>
                                          <div className="container-crash-history">
                                            <ul className="history-table"> 
                                            <li className="history-table-header">
                                              <div className="col-5">History</div>
                                            </li>
                                            
                                              {crashHistory.slice(0).reverse().map((crash, index) => {
                                                return (
                                                  <div className="row-history-wrapper" key={uuidv4()}>
                                                    <li
                                                      className={
                                                        crash >= 2 ? "table-row-blue" : "table-row-red"
                                                      }
                                                    >
                                                      <div className="col-5">{crash}x</div>
                                                    </li>
                                                  </div>
                                                );
                                              })}
                                            </ul>
                                          </div>
                                        </Box>
                                    <Box w="80%" className="grid-elements"  p={0} m={0}>
                                        <div className="container-crash-history">
                                          <ul className="active-bet-table">
                                            <li className="active-bet-table">
                                              <div className="col col-1">User</div>
                                              <div className="col col-2">Staked</div>
                                              <div className="col col-3">Cashout</div>
                                              <div className="col col-4">Profit</div>
                                            </li>
                                          </ul>
                                        </div>
                                        <div>
                                          {liveBettingTable && liveBettingTable !== "[]" ? (
                                              <span key={uuidv4()}>
                                                {JSON.parse(liveBettingTable).map((message: { cashout_multiplier: string | number | boolean | React.ReactElement<any, string | React.JSXElementConstructor<any>> | React.ReactFragment | React.ReactPortal | null | undefined; the_username: string | number | boolean | React.ReactElement<any, string | React.JSXElementConstructor<any>> | React.ReactFragment | React.ReactPortal | null | undefined; bet_amount: string | number | boolean | React.ReactElement<any, string | React.JSXElementConstructor<any>> | React.ReactFragment | React.ReactPortal | null | undefined; profit: number; }) => {
                                                  return (
                                                    <div className="container-crash-history" key={uuidv4()}>
                                                      <ul className="active-bet-table">
                                                        <div
                                                          className="row-bet-wrapper"
                                                          key={uuidv4()}
                                                        >
                                                          <li
                                                            className={
                                                              message.cashout_multiplier
                                                                ? "table-row-green"
                                                                : "table-row-blue"
                                                            }
                                                            key={uuidv4()}
                                                          >
                                                            <div className="col col-1">
                                                              {truncateEthAddress(message.the_username)}
                                                            </div>
                                                            <div className="col col-2">
                                                              {message.bet_amount}
                                                            </div>
                                                            <div className="col col-3">
                                                              {message.cashout_multiplier ? (
                                                                message.cashout_multiplier
                                                              ) : (
                                                                "--"
                                                              )}
                                                            </div>
                                                            <div className="col col-4">
                                                              {message.profit ? (
                                                                message.profit.toFixed(2)
                                                              ) : (
                                                                "--"
                                                              )}
                                                            </div>
                                                          </li>
                                                        </div>
                                                      </ul>
                                                    </div>
                                                  );
                                                })}
                                            </span>
                                          ) : (
                                            ""
                                          )}

                                        </div>
                                      </Box>
                                  </HStack>
                                </AccordionPanel>
                              </AccordionItem>
                  </Accordion>
              </TabPanel>
              <TabPanel  w="100%"  >
                  <Box w="100%">
                    <Center  w="100%" p={0} m={0}>
                       <Image  w="200px"  src="assets/logo_astro.png"  />
                    </Center>
                    {userData?.username}  &nbsp;&nbsp;
                      <Avatar  size='xs' src='assets/coin.png' /> ${userData?.balance > 0 ?  new Intl.NumberFormat().format(userData?.balance) : "$0" }   
                      &nbsp;&nbsp;&nbsp;&nbsp;
                      <Avatar  size='xs'  src='assets/ticket.png' /> {userData?.tickets > 0 ? userData?.tickets : 0}
                     &nbsp;&nbsp;
                     Referrals {userData?.referrals > 0 ? userData?.referrals : 0}
                  </Box>                                      
                  <Card w="100%" >
                        <CardBody w="100%">
                          <Stack divider={<StackDivider />} spacing='4'>                            
                            { userData ? ( 
                              <>
                               <Box w="100%">
                                  <Heading size='md' fontFamily={'Pixellari'}>
                                  <Center  w="100%" p={0} m={0}>
                                    <VStack  w="100%"> 
                                        { userData && nextClaim > Date.now()  ? ( 
                                            <>
                                                Wait
                                                <div>
                                                    <Countdown daysInHours={true} zeroPadDays={0} date={nextClaim}   />                              
                                                </div>             
                                                Until next claim                        
                                            </>
                                          ) : (
                                            <Button
                                              colorScheme="red"
                                              size="lg"
                                              onClick={claim}
                                            >
                                              Claim Now 
                                            </Button>
                                          )}      
                                          <Center  w='100%' >
                                          {isMediumExploding && <ConfettiExplosion {...mediumProps} />}
                                          </Center>
                                          <Center  w='100%' >
                                            <Text pt='5' fontSize='small'>
                                             Get 2,000 $ASTRO & 5 Tickets (every 6 hours)
                                            </Text>
                                            </Center>
                                            <br></br>
                                      </VStack>
                                    </Center>
                                </Heading>
                                 
                                </Box>
                                  <Box w="100%">
                                    <Heading size='md' fontFamily={'Pixellari'}>
                                      Invite a friend
                                        <Text pt='5' fontSize='small' fontFamily={'Pixellari'}>
                                          Get 5,000 $ASTRO & 10 Tickets for each referred
                                        </Text>
                                    </Heading>
                                    <br></br>
                                    <Center w='100%' color='white'>
                                        <Button
                                            colorScheme="blue"
                                            size="lg"
                                            onClick={copyCipboard}
                                          >
                                            Share your invite link
                                        </Button>
                                    </Center>
                                  </Box>
                                  { userData && (!userData.claimed_x ||  !userData.claimed_tg )? ( 
                                  <Box  w="100%">
                                    <Heading size='md' fontFamily={'Pixellari'}>
                                    <br></br>
                                      Follow us on X & TG
                                          <Text pt='5' fontSize='md'> 
                                            Get 5,000 $ASTRO & 10 Tickets for each follow
                                          </Text>
                                          <br></br>
                                      </Heading>
                                     <Center  w="100%" p={0} m={0}>
                                     <VStack  w="100%">  
                                        { userData && userData.claimed_x === true ? ( 
                                            <Text pt='5' fontSize='md'> 
                                              Follow us on X (claimed)
                                            </Text>
                                          ) : (
                                            <Button
                                                colorScheme="blue"
                                                size="lg"
                                                onClick={() => {claim_follow(true)}}
                                              >
                                                <Link href='#' >Follow us on X </Link>
                                            </Button>
                                          )}
                                            &nbsp;
                                            { userData && userData.claimed_tg === true  ? ( 
                                            <Text pt='5' fontSize='md'> 
                                              Follow us on TG (claimed)
                                            </Text>
                                          ) : (
                                            <Button
                                                colorScheme="blue"
                                                size="lg"
                                                onClick={() => {claim_follow(false)}}
                                              >
                                                <Link href='#' >Follow us on TG </Link>
                                            </Button>
                                          )}  
                                    </VStack>
                                    </Center>
                                  </Box>
                                  ) : (
                                    <></>
                                  )}

                            </>
                              ) : (
                                <>
                                   <Center  w="100%" p={0} m={0}>
                                    <VStack  w="100%" >
                                        <Heading size='md' fontFamily={'Pixellari'}>Disconnected</Heading>
                                        <Image  w="120px"  src="assets/disconnected.png"  />
                                        <Text pt='5' fontSize='md'> 
                                          
                                          <Button
                                                colorScheme="blackAlpha"
                                                size="lg"
                                                onClick={() => {claim_follow(false)}}
                                              >
                                                <Link href='https://t.me/AstroDegenBot/AstroDegen' isExternal>Open this App on Telegram</Link>
                                            </Button>
                                          
                                        </Text>
                                    </VStack>
                                  </Center>
                                </>
                              )}                               
                          </Stack>
                        </CardBody>
                      </Card> 
              </TabPanel>
            </TabPanels>
          </Tabs>

          <Modal isOpen={isOpen} onClose={onClose}>
                  <ModalOverlay />
                  <ModalContent>
                    <ModalHeader>Connect to Play & Farm $ASTRO</ModalHeader>
                    <ModalCloseButton />
                    <ModalBody>
                    <Image  w="80%"  src="assets/logo_black.png"  />
                    <Card>
                        <CardBody>
                          <Stack divider={<StackDivider />} spacing='4'>
                            <Box>
                              <Heading size='md' fontFamily={'Pixellari'}>
                                Farming (every 6 hours)
                              </Heading>
                              <Text pt='5' fontSize='small'>
                              <Avatar  size='sm' src='assets/coin.png' /> 2,000 $ASTRO  <br></br>
                              <Avatar  size='sm'  src='assets/ticket.png' />  5 Tickets 
                              </Text>
                            </Box>
                            <Box>
                              <Heading size='md' fontFamily={'Pixellari'}>
                              Play to multiply your $ASTRO
                              </Heading>
                              <Text pt='5' fontSize='sm' fontFamily={'Pixellari'}>
                              <Avatar size={"sm"} src="assets/rocket_full.png"   />
                               Cashout before it crashed (1X to 100X)
                              </Text>
                            </Box>
                            <Box>
                              <Heading size='md' fontFamily={'Pixellari'}>
                                Welcome bonus
                              </Heading>
                              <Text pt='5' fontSize='sm'>
                              <Avatar  size='sm' src='assets/coin.png' /> 10,000 $ASTRO <br></br>
                              <Avatar  size='sm'  src='assets/ticket.png' /> 10 Tickets
                              </Text>
                            </Box>
                          </Stack>
                        </CardBody>
                      </Card>                 
                    </ModalBody>
                    <ModalFooter alignContent={"center"}>
                    <Center w='100%'  color='white'>
                       <Button
                          colorScheme="purple"
                          size="lg" onClick={() => {onClose(); tonConnectUI.connectWallet(); }}>
                        <Image boxSize='40px' objectFit='cover' src='assets/tonicon.png' />
                             Connect Wallet
                      </Button>
                      </Center>
                    </ModalFooter>
                  </ModalContent>
          </Modal>  


          <Modal isOpen={isOpenModal} onClose={onCloseModal}>
                  <ModalOverlay />
                    <ModalContent>
                         <ModalHeader w='100%'>  You got a welcome bonus { username  ? username : ""} 🚀🚀 <br></br>
                         <Avatar  size='sm' src='assets/coin.png' /> 10,000 $ASTRO <br></br>
                         <Avatar  size='sm'  src='assets/ticket.png' /> 10 Tickets
                         </ModalHeader>
                     <ModalCloseButton />
                    <ModalBody>
                    <Card>
                        <CardBody>
                          <Box w='100%'>
                            <Center  w='100%' >
                              {isMediumExploding && <ConfettiExplosion {...mediumProps} />}
                            </Center>
                          </Box>
                        </CardBody>
                      </Card>                 
                    </ModalBody> 
                  </ModalContent>
          </Modal>   
          <Image h="1500px"  />
          <input id="clipboardtext" type="hidden" value={"https://t.me/AstroDegenBot/AstroDegen?startapp=" + refcode}></input>
       </Box>
  );
}