import { BrowserRouter, Routes, Route } from "react-router-dom";
import EditorPage from "./pages/EditorPage";
import HomePage from "./pages/HomePage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/room/:roomId" element={<EditorPage />} />
      </Routes>
    </BrowserRouter>
  );
}