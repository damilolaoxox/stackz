import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { installSoundTriggers } from "./audio/sound";
import "./styles/global.css";
import "./styles/hero.css";
import "./styles/waitlist.css";
import "./styles/sections.css";

installSoundTriggers();

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root element");

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
