FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production

# Install dependencies first so Docker can cache this layer
COPY package*.json ./
RUN npm install --omit=dev

# Copy the rest of the app
COPY . .

# Let the non-root "node" user write the messages file
RUN mkdir -p /app/data && chown -R node:node /app
USER node

EXPOSE 3000
CMD ["node", "server.js"]
