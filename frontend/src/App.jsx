import { useEffect, useState } from 'react';
import axios from 'axios';

function App() {

  const [system, setSystem] = useState({});
  const [containers, setContainers] = useState([]);
  const [logs, setLogs] = useState('');
  const [selectedContainer, setSelectedContainer] = useState('');

  useEffect(() => {

    fetchSystemInfo();
    fetchContainers();

  }, []);

  const fetchSystemInfo = async () => {

    try {

      const res = await axios.get('http://localhost:5000/system');

      setSystem(res.data);

    } catch (error) {

      console.log(error);
    }
  };

  const fetchContainers = async () => {

    try {

      const res = await axios.get('http://localhost:5001/status');

      setContainers(res.data);

    } catch (error) {

      console.log(error);
    }
  };

  const fetchLogs = async (id, name) => {

    try {

      const res = await axios.get(`http://localhost:5001/logs/${id}`);

      setLogs(res.data);

      setSelectedContainer(name);

    } catch (error) {

      console.log(error);
    }
  };

  return (

    <div style={{
      padding: '20px',
      fontFamily: 'Arial'
    }}>

      <h1>DockWatch Dashboard</h1>

      <hr />

      <h2>System Information</h2>

      <p>
        <strong>CPU Usage:</strong> {system.cpu}%
      </p>

      <p>
        <strong>Total RAM:</strong> {system.totalRam}
      </p>

      <p>
        <strong>Used RAM:</strong> {system.usedRam}
      </p>

      <hr />

      <h2>Containers</h2>

      {
        containers.map((container) => (

          <div
            key={container.id}
            style={{
              border: '1px solid gray',
              marginBottom: '10px',
              padding: '10px',
              borderRadius: '5px'
            }}
          >

            <p>
              <strong>Name:</strong> {container.name}
            </p>

            <p>
              <strong>Image:</strong> {container.image}
            </p>

            <p>
              <strong>Status:</strong> {container.status}
            </p>

            <button
              onClick={() =>
                fetchLogs(container.id, container.name)
              }
            >
              View Logs
            </button>

          </div>
        ))
      }

      <hr />

      <h2>
        Logs: {selectedContainer}
      </h2>

      <div
        style={{
          backgroundColor: 'black',
          color: 'lime',
          padding: '15px',
          minHeight: '300px',
          overflow: 'auto',
          whiteSpace: 'pre-wrap'
        }}
      >

        {logs}

      </div>

    </div>
  );
}

export default App;