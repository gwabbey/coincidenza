FROM node:20-alpine
WORKDIR /app

COPY package.json bun.lockb ./
RUN npm install --frozen-lockfile

COPY . .
RUN npm run build

ENV PORT=3003

CMD ["npm", "run", "start"]