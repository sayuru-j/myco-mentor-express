const express = require('express');
const axios = require('axios');
const router = express.Router();

// Environmental data endpoint
router.get('/environmental-data', async (req, res) => {
  try {
    // Get latitude and longitude from request query
    const { latitude, longitude } = req.query;
    
    if (!latitude || !longitude) {
      return res.status(400).json({ 
        error: 'Latitude and longitude are required' 
      });
    }
    
    // Fetch all data in parallel
    const [weatherData, lightData, phData] = await Promise.all([
      fetchWeatherData(latitude, longitude),
      fetchLightIntensity(latitude, longitude),
      fetchWaterPH(latitude, longitude)
    ]);
    
    // Return combined data
    res.json({
      temperature: weatherData.temperature,
      humidity: weatherData.humidity,
      
      intensity: lightData.intensity,
      pH: phData.pH
    });
    
  } catch (error) {
    console.error('Error fetching environmental data:', error);
    res.status(500).json({ error: 'Failed to fetch environmental data' });
  }
});

// Weather data function
async function fetchWeatherData(latitude, longitude) {
  try {
    const API_KEY = process.env.OPENWEATHER_API_KEY;
    const response = await axios.get(
      `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&units=metric&appid=${API_KEY}`
    );
    
    const data = response.data;
    
    return {
      temperature: Math.round(data.main.temp),
      humidity: data.main.humidity
    };
  } catch (error) {
    console.error('Error fetching weather data:', error);
    return { temperature: null, humidity: null };
  }
}

// Light intensity function
async function fetchLightIntensity(latitude, longitude) {
  try {
    const response = await axios.get(
      `https://api.sunrise-sunset.org/json?lat=${latitude}&lng=${longitude}&formatted=0`
    );
    
    const data = response.data;
    
    if (data.status === 'OK') {
      const now = new Date();
      const sunrise = new Date(data.results.sunrise);
      const sunset = new Date(data.results.sunset);
      
      // Calculate day length in milliseconds
      const dayLength = sunset - sunrise;
      
      // Calculate light intensity based on time of day
      let intensity;
      
      if (now < sunrise || now > sunset) {
        // It's night time
        intensity = 10; // Low light at night
      } else {
        // It's daytime - calculate how far we are into the day (0 to 1)
        const dayProgress = (now - sunrise) / dayLength;
        
        // Peak light at noon (0.5 dayProgress)
        intensity = Math.round(100 * (1 - 4 * Math.pow(dayProgress - 0.5, 2)));
        
        // Ensure value is between 10 and 100
        intensity = Math.max(10, Math.min(100, intensity));
      }
      
      return { intensity };
    } else {
      return { intensity: null };
    }
  } catch (error) {
    console.error('Error fetching light intensity:', error);
    return { intensity: null };
  }
}

// Water pH function
function fetchWaterPH(latitude, longitude) {
  try {
    // Use coordinates to create a deterministic but varied pH value
    const latSeed = Math.sin(latitude);
    const lngSeed = Math.cos(longitude);
    const regionalVariation = (latSeed + lngSeed) / 2;
    
    // Generate a pH value between 6.5 and 8.5
    const pH = (7.5 + regionalVariation).toFixed(1);
    
    return { pH };
  } catch (error) {
    console.error('Error calculating water pH:', error);
    return { pH: null };
  }
}

module.exports = router;