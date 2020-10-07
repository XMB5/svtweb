FROM node:14

RUN mkdir /app
WORKDIR /app

COPY . ./
RUN npm install && npm run build && npm prune --production

ENV SVTWEB_HOST '0.0.0.0'
ENV SVTWEB_CONFIG_DIR '/config'
ENV SVTWEB_STATIC_DIR 'dist'

EXPOSE 9090

CMD ["node", "backend/app.js"]