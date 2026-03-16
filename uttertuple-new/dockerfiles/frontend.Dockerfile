# Use the official Node.js 16 image based on Alpine Linux
FROM node:25-alpine

# Set the working directory inside the container
WORKDIR /app

# Disable Node.js 25+ Web Storage API to avoid --localstorage-file warning
ENV NODE_OPTIONS="--no-webstorage"

# Copy the package.json and package-lock.json files
COPY ./src/frontend/package*.json ./

# Install the dependencies
RUN npm install --force

# Copy the rest of the application code
COPY ./src/frontend/ ./

# Build the Next.js application
RUN npm run build

# Expose the port that your application runs on
EXPOSE 3015

# Run the Next.js production server (-H 0.0.0.0 ensures it listens on all interfaces in Docker)
CMD ["npx", "next", "start", "-p", "3015", "-H", "0.0.0.0"]