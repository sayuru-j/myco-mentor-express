const express = require('express');
const axios = require('axios');
const router = express.Router();

// Environmental data endpoint
router.get('/environmental-data', async (req, res) => {
  try {
    // Get latitude and longitude from request query
    const { latitude, longitude } = req.query;
    
    console.log('Environmental data request:', { latitude, longitude });
    
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
    const responseData = {
      temperature: weatherData.temperature,
      humidity: weatherData.humidity,
      intensity: lightData.intensity,
      pH: phData.pH
    };
    
    console.log('Sending environmental data:', responseData);
    res.json(responseData);
    
  } catch (error) {
    console.error('Error fetching environmental data:', error.message);
    if (error.response) {
      console.error('API response error:', error.response.data);
    }
    res.status(500).json({ error: 'Failed to fetch environmental data' });
  }
});

// Weather data function
async function fetchWeatherData(latitude, longitude) {
  try {
    const API_KEY = process.env.OPENWEATHER_API_KEY;
    
    // Check if API key is available
    if (!API_KEY) {
      console.warn('OpenWeather API key not found in environment variables');
      return { 
        temperature: Math.round(20 + Math.random() * 10), // Random temp between 20-30
        humidity: Math.round(40 + Math.random() * 40)     // Random humidity between 40-80
      };
    }
    
    const response = await axios.get(
      `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&units=metric&appid=${API_KEY}`,
      { timeout: 5000 } // Add timeout
    );
    
    const data = response.data;
    
    return {
      temperature: Math.round(data.main.temp),
      humidity: data.main.humidity
    };
  } catch (error) {
    console.error('Error fetching weather data:', error.message);
    // Provide fallback data if API fails
    return { 
      temperature: Math.round(20 + Math.random() * 10),
      humidity: Math.round(40 + Math.random() * 40)
    };
  }
}

// Light intensity function
async function fetchLightIntensity(latitude, longitude) {
  try {
    const response = await axios.get(
      `https://api.sunrise-sunset.org/json?lat=${latitude}&lng=${longitude}&formatted=0`,
      { timeout: 5000 } // Add timeout
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
      return { intensity: 50 }; // Default value if API returns unexpected format
    }
  } catch (error) {
    console.error('Error fetching light intensity:', error.message);
    // Fallback to a reasonable default based on current time
    const hour = new Date().getHours();
    let intensity;
    
    if (hour < 6 || hour > 18) {
      // Night time
      intensity = 10;
    } else if (hour >= 10 && hour <= 14) {
      // Mid-day
      intensity = 90;
    } else {
      // Morning/evening
      intensity = 50;
    }
    
    return { intensity };
  }
}

// Water pH function
function fetchWaterPH(latitude, longitude) {
  try {
    // Use coordinates to create a deterministic but varied pH value
    const latSeed = Math.sin(parseFloat(latitude));
    const lngSeed = Math.cos(parseFloat(longitude));
    const regionalVariation = (latSeed + lngSeed) / 2;
    
    // Generate a pH value between 6.5 and 8.5
    const pH = (7.5 + regionalVariation).toFixed(1);
    
    return { pH };
  } catch (error) {
    console.error('Error calculating water pH:', error.message);
    return { pH: '7.0' }; // Neutral pH as fallback
  }
}

module.exports = router;