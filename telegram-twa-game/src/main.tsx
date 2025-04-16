import { TonConnectUIProvider } from "@tonconnect/ui-react";
import ReactDOM from "react-dom/client";
import App from "./App";
const manifestUrl = "https://astrodegen.com/manifest.json";

ReactDOM.createRoot(document.getElementById("root_app") as HTMLElement).render(
  <TonConnectUIProvider manifestUrl={manifestUrl}>
    <App />
    </TonConnectUIProvider>
);

 