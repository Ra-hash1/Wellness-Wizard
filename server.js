const express = require('express');
const path = require('path');
const app = express();
const port = 3000;

app.use(express.json());

// Serve static files from the 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// Global variable to store the latest sensor data
let latestSensorData = {
    temperature: '--',
    ecg: '--',
    emg: '--',
    heartRate: '--',
    spo2: '--'
};

// Serve the frontend HTML
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Handle POST request from ESP32 to store sensor data
app.post('/api/sensor-data', (req, res) => {
    const sensorData = req.body;
    console.log("Received data from ESP32: ", sensorData);
    latestSensorData = sensorData;
    res.json({ message: "Sensor data received successfully!", receivedData: sensorData });
});

// Handle GET request to send the latest sensor data
app.get('/api/sensor-data', (req, res) => {
    res.json(latestSensorData);
});

// Start the server
app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on port ${port}`);
});
