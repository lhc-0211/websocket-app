import "./App.css";
import SocketIOViewer from "./components/SocketIOViewer";
import SocketMonitor from "./components/SocketMonitor";

function App() {
  return (
    <>
      <h1 className="font-bold text-lg mb-2">Socket Viewer</h1>

      <div className="p-4 grid grid-cols-3 gap-4">
        <div className="col-span-2">
          <SocketIOViewer />
        </div>
        <div className="col-span-1">
          <SocketMonitor />
        </div>
      </div>
    </>
  );
}

export default App;
