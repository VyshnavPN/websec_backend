FROM node:18-alpine

# Install system dependencies + Nikto + Perl
RUN apk add --no-cache nmap whois bind-tools python3 py3-pip nikto perl \
    && nikto -Version || echo "[WARN] nikto test failed"

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

EXPOSE 8080
CMD ["node", "server.js"]