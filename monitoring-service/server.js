const express = require('express');
const cors = require('cors');
const si = require('systeminformation');
const Docker = require('dockerode');

const app = express();

app.use(cors());

const docker = new Docker();

app.get('/', (req, res) => {
    res.send('Monitoring Service Running');
});

app.get('/system', async (req, res) => {

    try {

        const cpu = await si.currentLoad();
        const memory = await si.mem();

        res.json({
            cpu: cpu.currentLoad.toFixed(2),
            totalRam: memory.total,
            usedRam: memory.used
        });

    } catch (error) {
        res.status(500).json({
            error: error.message
        });
    }
});

app.get('/containers', async (req, res) => {

    try {

        const containers = await docker.listContainers();

        res.json(containers);

    } catch (error) {

        res.status(500).json({
            error: error.message
        });
    }
});

app.listen(5000, () => {
    console.log('Monitoring service running on port 5000');
});