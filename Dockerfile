#DOCKER-VERSION 1.3
FROM node:0.10-onbuild
COPY . /src
RUN cd /src; npm install
EXPOSE 8080
CMD ["node", "/src/server.js", "-v"]
