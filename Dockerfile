# Imagen única: el backend sirve también el frontend.
FROM node:22-alpine
WORKDIR /app
COPY backend/package.json backend/
RUN cd backend && npm install --omit=dev
COPY backend backend
COPY frontend frontend
ENV NODE_ENV=production PORT=3000
EXPOSE 3000
CMD ["node", "--disable-warning=ExperimentalWarning", "backend/server.js"]
