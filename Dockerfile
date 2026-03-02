FROM node:18-alpine

# Install system dependencies + Python tools
RUN apk add --no-cache nmap whois bind-tools python3 py3-pip py3-requests

# Install Sherlock via pip
RUN pip install sherlock-project --break-system-packages

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

EXPOSE 8080
CMD ["node", "server.js"]