import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { HubPage } from "./pages/HubPage";
import { ImagesPage } from "./pages/ImagesPage";
import { PdfPage } from "./pages/PdfPage";
import "./styles/hub.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HubPage />} />
        <Route path="/images" element={<ImagesPage />} />
        <Route path="/pdf" element={<PdfPage />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
