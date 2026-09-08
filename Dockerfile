FROM node:22-bookworm-slim
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
RUN npm test && npm run build
EXPOSE 4173
CMD ["npm", "run", "preview"]
