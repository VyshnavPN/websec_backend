FROM node:20-alpine

# Install Docker CLI so the Node app can talk to the socket
RUN apk add --no-cache docker-cli

WORKDIR /app

# Run as root to ensure socket permissions
USER root

COPY package*.json ./
RUN npm install --only=production

COPY . .

# Match the port in server.js
EXPOSE 8080

CMD ["node", "server.js"]