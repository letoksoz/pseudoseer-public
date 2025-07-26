const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  console.log('Proxy request:', {
    method: event.httpMethod,
    path: event.path,
    queryParams: event.queryStringParameters,
    headers: event.headers
  });

  // Handle OPTIONS requests for CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: ''
    };
  }

  try {
    // Get the path from the request
    let path = event.path.replace('/.netlify/functions/proxy', '');
    
    // Handle the case where the path might be duplicated
    if (path.includes('/.netlify/functions/proxy')) {
      path = path.replace('/.netlify/functions/proxy', '');
    }
    
    // Redirect root path to index2
    if (path === '' || path === '/') {
      path = '/index2';
    }
    
    const targetUrl = `https://pseudoseer.ist.psu.edu${path}`;
    
    // Get query parameters
    const queryString = event.queryStringParameters ? 
      '?' + Object.keys(event.queryStringParameters)
        .map(key => `${key}=${encodeURIComponent(event.queryStringParameters[key])}`)
        .join('&') : '';
    
    const fullTargetUrl = targetUrl + queryString;
    
    console.log('Target URL:', fullTargetUrl);

    // Prepare headers
    const headers = {
      'User-Agent': 'Mozilla/5.0 (compatible; PseudoSeer-Proxy/1.0)',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Referer': 'https://pseudoseer.ist.psu.edu/',
    };

    // Handle POST requests (like search forms)
    let fetchOptions = {
      method: event.httpMethod,
      headers: headers,
    };

    if (event.httpMethod === 'POST') {
      console.log('POST request body:', event.body);
      fetchOptions.body = event.body;
      if (event.headers['content-type']) {
        headers['Content-Type'] = event.headers['content-type'];
      }
    }

    // Fetch the content from PSU server
    const response = await fetch(fullTargetUrl, fetchOptions);
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      console.error('Response not ok:', response.status, response.statusText);
      return {
        statusCode: response.status,
        headers: {
          'Content-Type': 'text/plain',
          'Access-Control-Allow-Origin': '*',
        },
        body: `Error: ${response.status} ${response.statusText} - URL: ${fullTargetUrl}`
      };
    }

    // Get the content type
    const contentType = response.headers.get('content-type') || 'text/html';
    
    console.log('Content type:', contentType);
    
    // Handle different content types
    if (contentType.includes('text/html')) {
      // Handle HTML content
      const content = await response.text();
      let modifiedContent = content;
      
      // Replace relative URLs with proxy URLs, but be more careful
      modifiedContent = modifiedContent.replace(
        /href=["']\/([^"']*)["']/g, 
        'href="/.netlify/functions/proxy/$1"'
      );
      
      modifiedContent = modifiedContent.replace(
        /src=["']\/([^"']*)["']/g, 
        'src="/.netlify/functions/proxy/$1"'
      );
      
      // Handle form action URLs more carefully - don't rewrite search endpoints
      modifiedContent = modifiedContent.replace(
        /action=["']([^"']*)["']/g, 
        (match, url) => {
          if (url.startsWith('http')) {
            return match; // Keep absolute URLs as is
          } else if (url.startsWith('/search_es') || url.startsWith('search_es')) {
            // Keep search endpoints as they are, just add proxy prefix
            if (url.startsWith('/')) {
              return `action="/.netlify/functions/proxy${url}"`;
            } else {
              return `action="/.netlify/functions/proxy/${url}"`;
            }
          } else if (url.startsWith('/')) {
            return `action="/.netlify/functions/proxy${url}"`;
          } else if (url === '') {
            return `action="/.netlify/functions/proxy${path}"`;
          } else {
            return `action="/.netlify/functions/proxy/${url}"`;
          }
        }
      );
      
      // Handle JavaScript URLs
      modifiedContent = modifiedContent.replace(
        /url\(["']?\/([^"']*)["']?\)/g, 
        'url("/.netlify/functions/proxy/$1")'
      );
      
      // Handle AJAX/fetch URLs in JavaScript
      modifiedContent = modifiedContent.replace(
        /fetch\(["']\/([^"']*)["']/g, 
        'fetch("/.netlify/functions/proxy/$1"'
      );
      
      modifiedContent = modifiedContent.replace(
        /XMLHttpRequest\(["']\/([^"']*)["']/g, 
        'XMLHttpRequest("/.netlify/functions/proxy/$1"'
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
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=300',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
        body: modifiedContent
      };
      
    } else if (contentType.includes('text/css')) {
      // Handle CSS content
      const content = await response.text();
      let modifiedContent = content;
      
      // Replace relative URLs in CSS
      modifiedContent = modifiedContent.replace(
        /url\(["']?\/([^"']*)["']?\)/g, 
        'url("/.netlify/functions/proxy/$1")'
      );
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=3600', // Cache CSS longer
          'Access-Control-Allow-Origin': '*',
        },
        body: modifiedContent
      };
      
    } else if (contentType.includes('application/javascript') || contentType.includes('text/javascript')) {
      // Handle JavaScript content
      const content = await response.text();
      let modifiedContent = content;
      
      // Replace relative URLs in JavaScript
      modifiedContent = modifiedContent.replace(
        /["']\/([^"']*)["']/g, 
        '"/.netlify/functions/proxy/$1"'
      );
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=3600', // Cache JS longer
          'Access-Control-Allow-Origin': '*',
        },
        body: modifiedContent
      };
      
    } else {
      // Handle binary content (images, etc.) - stream it through
      const buffer = await response.buffer();
      
      return {
        statusCode: 200,
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=86400', // Cache images for 24 hours
          'Access-Control-Allow-Origin': '*',
        },
        body: buffer.toString('base64'),
        isBase64Encoded: true
      };
    }

  } catch (error) {
    console.error('Proxy error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'text/plain',
        'Access-Control-Allow-Origin': '*',
      },
      body: 'Internal Server Error: ' + error.message + '\n\nRequest details:\n' + JSON.stringify({
        method: event.httpMethod,
        path: event.path,
        queryParams: event.queryStringParameters
      }, null, 2)
    };
  }
}; 