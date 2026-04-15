FROM node:22-alpine
RUN apk add --no-cache ffmpeg
WORKDIR /app
COPY package.json ./
COPY encoder.mjs ./
ENV PORT=8080
ENV TIMELAPSE_DATA_ROOT=/data/timelapse/current
EXPOSE 8080
CMD ["node", "encoder.mjs"]
