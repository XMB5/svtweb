FROM node:14

RUN mkdir /app
WORKDIR /app

COPY . ./
RUN npm install && npm run build && npm prune --production

ENV API_HOST '0.0.0.0'
ENV API_CONFIG_DIR '/config'
ENV API_SUBMISSIONS_DIR '/submissions'
ENV API_STATIC_DIR 'dist'

EXPOSE 9090

CMD ["node", "backend/app.js"]