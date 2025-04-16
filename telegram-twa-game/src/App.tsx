import "./css/App.css";
import { Game } from "./Game";
import {
  ChakraProvider,
} from '@chakra-ui/react';
 
function App() {
  return (
    <ChakraProvider>
        <Game/>
    </ChakraProvider>
  );
}

export default App;