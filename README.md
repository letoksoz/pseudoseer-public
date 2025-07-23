# PseudoSeer Redirect

This is a redirect page for the PseudoSeer application hosted at Penn State University. Due to university security restrictions that prevent iframe embedding, this page serves as a clean redirect to the main application.

## Features

- **Automatic Redirect**: Automatically redirects to the main PseudoSeer application after 5 seconds
- **Manual Redirect**: Users can click the button to redirect immediately
- **Modern Design**: Clean, responsive design with gradient backgrounds
- **Information Display**: Provides context about the application and why the redirect is necessary

## Deployment

This project is configured for deployment on Netlify with the following files:

- `index.html` - Main redirect page
- `_redirects` - Netlify redirect rules
- `netlify.toml` - Netlify configuration
- `README.md` - This documentation

## How to Deploy

1. **Connect to Netlify**:
   - Push your code to a Git repository (GitHub, GitLab, or Bitbucket)
   - Connect your repository to Netlify
   - Netlify will automatically detect the static site and deploy it

2. **Manual Deployment**:
   - Drag and drop the project folder to Netlify's deploy area
   - The site will be deployed automatically

3. **Custom Domain** (Optional):
   - In your Netlify dashboard, go to Domain settings
   - Add your custom domain
   - Configure DNS settings as instructed

## Configuration Files

### `_redirects`
Handles URL routing and ensures all paths serve the main page.

### `netlify.toml`
Configures build settings, security headers, and redirect rules.

## Security

The site includes security headers to protect against common web vulnerabilities:
- X-Frame-Options: DENY
- X-XSS-Protection: 1; mode=block
- X-Content-Type-Options: nosniff
- Referrer-Policy: strict-origin-when-cross-origin

## Target URL

The redirect points to: `https://pseudoseer.ist.psu.edu`

## License

This project is part of the PseudoSeer research tool developed at Penn State University. 