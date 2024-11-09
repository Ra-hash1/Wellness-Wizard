document.addEventListener('DOMContentLoaded', () => {
    // Chart configuration for each sensor type
    const chartConfig = {
        temperature: { label: 'Temperature', min: 85, max: 104, unit: '°F' },
        heartRate: { label: 'Heart Rate', min: 40, max: 140, unit: 'bpm' },
        ecg: { label: 'ECG', min: -2.5, max: 2.5, unit: 'mV' },
        emg: { label: 'EMG', min: 0, max: 600, unit: 'µV' },
        oximeter: { label: 'Oximeter', min: 85, max: 105, unit: '%' }
    };

    const charts = {};

    // Initialize charts
    Object.keys(chartConfig).forEach(sensorType => {
        const canvas = document.getElementById(`${sensorType}Trend`);
        if (canvas) {
            const ctx = canvas.getContext('2d');
            charts[sensorType] = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [{
                        label: chartConfig[sensorType].label,
                        data: [],
                        borderColor: 'rgb(75, 192, 192)',
                        tension: 0.1
                    }]
                },
                options: {
                    scales: {
                        y: {
                            beginAtZero: false,
                            suggestedMin: chartConfig[sensorType].min,
                            suggestedMax: chartConfig[sensorType].max
                        }
                    },
                    maintainAspectRatio: false
                }
            });
        } else {
            console.error(`Canvas element with ID ${sensorType}Trend not found.`);
        }
    });

    // Update chart data
    const updateData = (sensorType, y) => {
        const chart = charts[sensorType];
        if (!chart) {
            console.error(`Chart not found for sensor type: ${sensorType}`);
            return;
        }

        const now = new Date();
        chart.data.labels.push(now.toLocaleTimeString());
        chart.data.datasets[0].data.push(y);

        if (chart.data.labels.length > 10) {
            chart.data.labels.shift();
            chart.data.datasets[0].data.shift();
        }
        chart.update();

        document.getElementById(`${sensorType}Reading`).textContent = y.toFixed(1);

        const analysis = analyzeDataPoint(sensorType, y);
        document.getElementById(`${sensorType}Prediction`).textContent = analysis;
    };

    // Analyze sensor data
    function analyzeDataPoint(sensorType, value) {
        const config = chartConfig[sensorType];
        const range = config.max - config.min;
        const normalizedValue = (value - config.min) / range;

        let analysis = '';
        if (normalizedValue < 0.2) {
            analysis = 'Very Low';
        } else if (normalizedValue < 0.4) {
            analysis = 'Low';
        } else if (normalizedValue > 0.8) {
            analysis = 'Very High';
        } else if (normalizedValue > 0.6) {
            analysis = 'High';
        } else {
            analysis = 'Normal';
        }

        return `${analysis} (${value.toFixed(1)} ${config.unit})`;
    }

    // Generate health recommendations based on current readings
    function generateHealthRecommendations() {
        const temp = parseFloat(document.getElementById('tempReading').textContent) || 0;
        const hr = parseFloat(document.getElementById('hrReading').textContent) || 0;
        const oxy = parseFloat(document.getElementById('oximeterReading').textContent) || 0;
        const ecg = parseFloat(document.getElementById('ecgReading').textContent) || 0;
        const emg = parseFloat(document.getElementById('emgReading').textContent) || 0;

        let recommendation = "<strong>Health Analysis:</strong><br>";

        // Temperature recommendations
        if (temp > 100.4) {
            recommendation += "🔴 Your temperature is high (fever). Rest, stay hydrated, and consider taking fever-reducing medication. Consult a doctor if fever persists for more than 3 days or exceeds 102°F.<br>";
        } else if (temp < 97) {
            recommendation += "🔵 Your body temperature is low. Warm up with blankets or warm drinks. If temperature drops below 95°F, seek emergency medical care.<br>";
        }

        // Heart rate recommendations
        if (hr > 100) {
            recommendation += "🔴 Elevated heart rate detected (tachycardia). Relax, practice deep breathing, and stay hydrated. If this persists, consult a healthcare provider to check for stress, dehydration, or heart issues.<br>";
        } else if (hr < 60) {
            recommendation += "🔵 Low heart rate detected (bradycardia). If you experience dizziness or fatigue, contact a healthcare professional, especially if you're not an athlete.<br>";
        }

        // Oxygen saturation recommendations
        if (oxy < 95) {
            recommendation += "🔴 Low oxygen saturation detected. Practice deep breathing and, if the reading drops below 90%, seek medical attention as it could indicate respiratory issues.<br>";
        }

        // ECG recommendations
        if (ecg > 0.5 || ecg < -0.5) {
            recommendation += "🔴 Abnormal ECG reading detected. This could indicate an irregular heartbeat. Seek medical advice, especially if experiencing symptoms like chest pain or shortness of breath.<br>";
        } else if (ecg > 1.5) {
            recommendation += "🟠 High ECG reading detected. Consider consulting a cardiologist for further tests to rule out arrhythmias.<br>";
        }

        // EMG recommendations
        if (emg > 500) {
            recommendation += "🔴 High muscle activity detected. You may be overexerting yourself. Take rest and hydrate. If muscle pain or weakness persists, consult a healthcare provider.<br>";
        } else if (emg < 50) {
            recommendation += "🔵 Low muscle activity detected. Consider light exercise or stretching. If muscle fatigue persists, consult a doctor.<br>";
        }

        // If all readings are normal
        if (recommendation === "<strong>Detailed Health Recommendations:</strong><br>") {
            recommendation += "✅ All your readings are within normal ranges. Keep up the good work!";
        }

        

        document.getElementById('healthRecommendations').innerHTML = recommendation;
    }

    // Fetch sensor data from API
    const fetchSensorData = async () => {
        try {
            const response = await fetch('http://localhost:3000/api/sensor-data');
            const data = await response.json();

            const tempReading = document.getElementById("tempReading");
            const hrReading = document.getElementById("hrReading");
            const ecgReading = document.getElementById("ecgReading");
            const emgReading = document.getElementById("emgReading");
            const oximeterReading = document.getElementById("oximeterReading");

            tempReading.innerHTML = data.temperature;
            hrReading.innerHTML = data.heartRate;
            ecgReading.innerHTML = data.ecg;
            emgReading.innerHTML = data.emg;
            oximeterReading.innerHTML = data.spo2;

            // Update charts
            Object.keys(chartConfig).forEach(sensorType => {
                if (data[sensorType] !== undefined && data[sensorType] >= chartConfig[sensorType].min && data[sensorType] <= chartConfig[sensorType].max) {
                    updateData(sensorType, data[sensorType]);
                } else {
                    console.warn(`Invalid data for sensor type: ${sensorType}`, data[sensorType]);
                }
            });

            // Generate health recommendations
            generateHealthRecommendations();
        } catch (error) {
            console.error('Error fetching sensor data:', error);
        }
    };

    // Get place name from coordinates
    async function getPlaceName(latitude, longitude) {
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
            const data = await response.json();
            return data.display_name;
        } catch (error) {
            console.error('Error fetching place name:', error);
            return 'Unknown location';
        }
    }

    // Update environmental factors
    async function updateEnvironmentalFactors(latitude, longitude) {
        try {
            const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=3dcaf325ce3b8d0aa96596cc9bdbf67d&units=metric`);
            const data = await response.json();
            
            let environmentalInfo = "<strong>Current Environmental Conditions:</strong><br>";
            environmentalInfo += `Temperature: ${data.main.temp.toFixed(1)}°C<br>`;
            environmentalInfo += `Feels Like: ${data.main.feels_like.toFixed(1)}°C<br>`;
            environmentalInfo += `Humidity: ${data.main.humidity}%<br>`;
            environmentalInfo += `Weather: ${data.weather[0].description}<br>`;
            environmentalInfo += `Wind Speed: ${(data.wind.speed * 3.6).toFixed(1)} km/h<br>`; // Convert m/s to km/h
            environmentalInfo += `Cloudiness: ${data.clouds.all}%<br>`;
            
            if (data.rain) {
                environmentalInfo += `Rainfall (last 1h): ${data.rain['1h']} mm<br>`;
            }
            
            if (data.snow) {
                environmentalInfo += `Snowfall (last 1h): ${data.snow['1h']} mm<br>`;
            }
            environmentalInfo += `Atmospheric Pressure: ${data.main.pressure} hPa<br>`;
            
            if (data.visibility) {
                environmentalInfo += `Visibility: ${(data.visibility / 1000).toFixed(1)} km<br>`;
            }

            // Add some basic advice based on the environmental factors
            if (data.main.temp > 30) {
                environmentalInfo += "🌡️ High temperature detected. Stay hydrated and avoid prolonged sun exposure.<br>";
            } else if (data.main.temp < 5) {
                environmentalInfo += "❄️ Low temperature detected. Dress warmly and be cautious of icy conditions.<br>";
            }
            if (data.main.humidity > 60) {
                environmentalInfo += "💧 High humidity. This may affect your comfort and hydration needs.<br>";
            }
            if (data.weather[0].main === "Rain") {
                environmentalInfo += "☔ Rainy weather. Consider indoor activities and stay dry.<br>";
            }
            if (data.wind.speed > 10) { // Wind speed > 36 km/h
                environmentalInfo += "💨 Strong winds. Be careful when outside, especially if carrying large objects.<br>";
            }
            if (data.visibility && data.visibility < 1000) {
                environmentalInfo += "🌫️ Low visibility. Take extra care if driving or moving around outside.<br>";
            }
            
            document.getElementById('environmentalAlerts').innerHTML = environmentalInfo;
        } catch (error) {
            console.error('Error fetching environmental data:', error);
            document.getElementById('environmentalAlerts').innerHTML = "Unable to retrieve environmental data.";
        }
    }

    // Setup SOS button functionality
    function setupSOSButton() {
        const sosButton = document.querySelector('.sos-button');
        const stopAlarmButton = document.querySelector('.stop-alarm-button');
        const audio = document.getElementById('alarmSound');

        sosButton.addEventListener('click', () => {
            audio.loop = true;
            audio.play();
            alert('SOS activated! Emergency services have been notified.');
            stopAlarmButton.style.display = 'block';

            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(async (position) => {
                    const latitude = position.coords.latitude;
                    const longitude = position.coords.longitude;
                    const placeName = await getPlaceName(latitude, longitude);
                    document.getElementById('locationInfo').innerHTML = `Location: ${placeName}<br>Coordinates: ${latitude}, ${longitude}`;
                    updateEnvironmentalFactors(latitude, longitude);
                }, () => {
                    document.getElementById('locationInfo').textContent = 'Unable to retrieve location';
                });
            } else {
                document.getElementById('locationInfo').textContent = 'Geolocation is not supported by this browser';
            }
        });

        stopAlarmButton.addEventListener('click', () => {
            audio.pause();
            audio.currentTime = 0;
            stopAlarmButton.style.display = 'none';
        });
    }

    // Initialize functionality
    fetchSensorData();
    setupSOSButton();
    setInterval(fetchSensorData, 2500);
    setInterval(generateHealthRecommendations, 1000);

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((position) => {
            const latitude = position.coords.latitude;
            const longitude = position.coords.longitude;
            updateEnvironmentalFactors(latitude, longitude);
        }, () => {
            document.getElementById('environmentalAlerts').textContent = 'Unable to retrieve location for environmental data';
        });
    } else {
        document.getElementById('environmentalAlerts').textContent = 'Geolocation is not supported by this browser';
    }
});