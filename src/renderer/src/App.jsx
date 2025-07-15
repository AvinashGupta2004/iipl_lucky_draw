import { HashRouter as Router, Routes, Route } from "react-router-dom";
import RegistrationForm from "./components/RegistrationForm";
import LoginForm from "./components/LoginForm.jsx";
import Settings from "./components/Settings";
import GameWindow from "./components/GameWindow";
import ReportWindow from "./components/ReportWindow";

function App() {
  return (
    <Router>
      <Routes>
        <Route path={"/"} element={<RegistrationForm />} />
        <Route path={"sign-in"} element={<LoginForm />} />
        <Route path={"settings"} element={<Settings />} />
        <Route path={"main"} element={<GameWindow />} />
        <Route path={"report"} element={<ReportWindow />} />
      </Routes>
    </Router>
  );
}

export default App;
