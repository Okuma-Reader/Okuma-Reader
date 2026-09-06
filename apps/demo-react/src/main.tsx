import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { HubPage } from "./pages/HubPage";
import { ImagesPage } from "./pages/ImagesPage";
import { PdfPage } from "./pages/PdfPage";
import { publicUrl, routerBasename } from "./publicUrl";
import "./styles/hub.css";
import "./styles/reader-host.css";

document.documentElement.style.setProperty(
  "--okuma-host-paper",
  `url(${JSON.stringify(publicUrl("bg.webp"))})`,
);

const favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
if (favicon) favicon.href = publicUrl("favicon.webp");

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter basename={routerBasename()}>
      <Routes>
        <Route path="/" element={<HubPage />} />
        <Route path="/images" element={<ImagesPage />} />
        <Route path="/pdf" element={<PdfPage />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
