const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      body: 'Method Not Allowed'
    };
  }

  try {
    // Get the path from the request
    const path = event.path.replace('/.netlify/functions/proxy', '');
    const targetUrl = `https://pseudoseer.ist.psu.edu${path}`;

    // Fetch the content from PSU server
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PseudoSeer-Proxy/1.0)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
    });

    if (!response.ok) {
      return {
        statusCode: response.status,
        body: `Error: ${response.statusText}`
      };
    }

    // Get the content
    const contentType = response.headers.get('content-type');
    const content = await response.text();

    // Modify the content to fix relative URLs and remove problematic headers
    let modifiedContent = content;
    
    // Replace relative URLs with proxy URLs
    modifiedContent = modifiedContent.replace(
      /href="\/([^"]*)"/g, 
      'href="/.netlify/functions/proxy/$1"'
    );
    
    modifiedContent = modifiedContent.replace(
      /src="\/([^"]*)"/g, 
      'src="/.netlify/functions/proxy/$1"'
    );
    
    modifiedContent = modifiedContent.replace(
      /action="\/([^"]*)"/g, 
      'action="/.netlify/functions/proxy/$1"'
    );

    // Remove any X-Frame-Options or CSP headers that might be in the HTML
    modifiedContent = modifiedContent.replace(
      /<meta[^>]*http-equiv=["']X-Frame-Options["'][^>]*>/gi, 
      ''
    );
    
    modifiedContent = modifiedContent.replace(
      /<meta[^>]*http-equiv=["']Content-Security-Policy["'][^>]*>/gi, 
      ''
    );

    return {
      statusCode: 200,
      headers: {
        'Content-Type': contentType || 'text/html',
        'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: modifiedContent
    };

  } catch (error) {
    console.error('Proxy error:', error);
    return {
      statusCode: 500,
      body: 'Internal Server Error'
    };
  }
}; 