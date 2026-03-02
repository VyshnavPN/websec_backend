FROM node:20-alpine

# Install the actual security tools directly into the container OS
RUN apk add --no-cache nmap whois bind-tools python3 py3-pip py3-requests

WORKDIR /app
COPY package*.json ./
RUN npm install --only=production
COPY . .

EXPOSE 8080
CMD ["node", "server.js"]