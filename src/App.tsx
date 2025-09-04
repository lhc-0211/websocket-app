import "./App.css";
import SocketIOViewer from "./components/SocketIOViewer";

function App() {
  return (
    <>
      <h1 className="font-bold text-lg mb-2">Socket Viewer</h1>

      <div className="p-4 ">
        <SocketIOViewer />
      </div>
    </>
  );
}

export default App;
