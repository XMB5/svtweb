FROM node:14

RUN mkdir /app
WORKDIR /app

COPY package*.json ./
RUN npm install --only=prod

RUN mkdir backend
COPY backend/ backend/

RUN mkdir dist/
COPY dist/ dist/

ENV API_HOST '0.0.0.0'
ENV API_CONFIG_DIR '/config'
ENV API_SUBMISSIONS_DIR '/submissions'
ENV API_STATIC_DIR 'dist'

EXPOSE 9090

CMD ["node", "backend/app.js"]