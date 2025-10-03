# client/Dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
ARG REACT_APP_ENVIRONMENT=production
ARG REACT_APP_FRONTEND_URL=http://localhost:8080
ARG REACT_APP_API_BASE_URL=http://localhost:3001
ARG REACT_APP_API_PATH=/api
ENV REACT_APP_ENVIRONMENT=${REACT_APP_ENVIRONMENT}
ENV REACT_APP_FRONTEND_URL=${REACT_APP_FRONTEND_URL}
ENV REACT_APP_API_BASE_URL=${REACT_APP_API_BASE_URL}
ENV REACT_APP_API_PATH=${REACT_APP_API_PATH}
COPY . .
ARG OUT_DIR=build
RUN npm run build

FROM nginx:1.27-alpine
RUN rm -rf /usr/share/nginx/html/*
ARG OUT_DIR=build
COPY --from=build /app/${OUT_DIR} /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
