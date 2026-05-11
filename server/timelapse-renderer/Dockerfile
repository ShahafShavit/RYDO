FROM mcr.microsoft.com/playwright:v1.59.1-jammy
WORKDIR /app
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
RUN npm run build
ENV NODE_ENV=production
ENV PORT=3001
ENV TIMELAPSE_DATA_ROOT=/data/timelapse/current
EXPOSE 3001
CMD ["node", "server.mjs"]
