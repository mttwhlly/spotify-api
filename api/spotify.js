// CommonJS version with multi-domain CORS - api/spotify.js
module.exports = async function handler(req, res) {
  // Get the origin of the request
  const origin = req.headers.origin;
  
  // List of allowed origins
  const allowedOrigins = [
    'https://mattwhalley.com',
    'https://www.mattwhalley.com',
    'https://mttwhlly.github.io',
    'http://localhost:4321', // For local development
    'http://127.0.0.1:4321'  // Alternative local
  ];

  // Set CORS headers
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // POST method for getting access token
  if (req.method === 'POST') {
    try {
      console.log('Spotify API endpoint hit from:', origin);

      // Get environment variables
      const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
      const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
      const REFRESH_TOKEN = process.env.SPOTIFY_REFRESH_TOKEN;

      console.log('Environment variables check:', {
        hasClientId: !!CLIENT_ID,
        hasClientSecret: !!CLIENT_SECRET,
        hasRefreshToken: !!REFRESH_TOKEN,
      });

      // Validate credentials
      if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
        console.error('Missing credentials');
        
        return res.status(500).json({
          error: 'Missing credentials',
          details: 'One or more required environment variables are missing',
        });
      }

      // Create authorization header
      const credentials = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
      const authHeader = `Basic ${credentials}`;

      // Create body parameters
      const bodyParams = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: REFRESH_TOKEN,
      });

      console.log('Requesting token from Spotify API');

      // Get a new access token using the refresh token
      const response = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: authHeader,
        },
        body: bodyParams.toString(),
      });

      console.log('Spotify token response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Spotify token request failed:', response.status);

        return res.status(500).json({
          error: 'Token request failed',
          status: response.status,
          details: errorText,
        });
      }

      const data = await response.json();
      console.log('Successfully obtained access token');

      return res.status(200).json({
        access_token: data.access_token,
        expires_in: data.expires_in,
      });

    } catch (error) {
      console.error('Spotify auth error:', error);
      return res.status(500).json({
        error: 'Authentication failed',
        details: error.message,
      });
    }
  }

  // GET method for debug/health check
  if (req.method === 'GET') {
    return res.status(200).json({
      message: 'Spotify API endpoint is working. Please use POST method for authentication.',
      allowed_origins: allowedOrigins,
      request_origin: origin,
      env_check: {
        has_client_id: !!process.env.SPOTIFY_CLIENT_ID,
        has_client_secret: !!process.env.SPOTIFY_CLIENT_SECRET,
        has_refresh_token: !!process.env.SPOTIFY_REFRESH_TOKEN,
      },
      timestamp: new Date().toISOString(),
    });
  }

  // Method not allowed
  return res.status(405).json({
    error: 'Method not allowed',
    message: 'Only GET and POST methods are supported',
  });
};