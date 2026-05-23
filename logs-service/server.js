const express = require('express');
const cors = require('cors');
const Docker = require('dockerode');

const app = express();

app.use(cors());

const docker = new Docker();

app.get('/', (req, res) => {
    res.send('Logs Service Running');
});


// Get all containers with status
app.get('/status', async (req, res) => {

    try {

        const containers = await docker.listContainers({ all: true });

        const result = containers.map(container => ({
            id: container.Id,
            name: container.Names[0],
            image: container.Image,
            state: container.State,
            status: container.Status
        }));

        res.json(result);

    } catch (error) {

        res.status(500).json({
            error: error.message
        });
    }
});


// Get logs of a container
app.get('/logs/:id', async (req, res) => {

    try {

        const container = docker.getContainer(req.params.id);

        const logs = await container.logs({
            stdout: true,
            stderr: true,
            tail: 50
        });

        res.send(logs.toString());

    } catch (error) {

        res.status(500).json({
            error: error.message
        });
    }
});

app.listen(5001, () => {
    console.log('Logs service running on port 5001');
});