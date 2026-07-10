# Start Astro's fast development server with live reload.
dev *args:
    npm run dev -- {{ args }}

# Create the production Cloudflare build in dist/.
build:
    npm run build

# Build, then serve the result in Cloudflare's local Workers runtime.
preview *args: build
    npm run preview -- {{ args }}
