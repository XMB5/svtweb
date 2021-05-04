FROM node:14

RUN mkdir /app
WORKDIR /app

ENV SVTWEB_HOST '0.0.0.0'
ENV SVTWEB_CONFIG_DIR '/game_configs'
ENV SVTWEB_REDCAP_CONFIGS_FILE '/redcap_configs.json'
ENV SVTWEB_STATIC_DIR 'dist'

EXPOSE 9090

COPY . ./
RUN npm install && npm run build && npm prune --production

CMD ["node", "backend/app.js"]