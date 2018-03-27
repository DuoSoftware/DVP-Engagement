#FROM ubuntu
#RUN apt-get update
#RUN apt-get install -y git nodejs npm nodejs-legacy
#RUN git clone git://github.com/DuoSoftware/DVP-Engagement.git /usr/local/src/engagementservice
#RUN cd /usr/local/src/engagementservice; npm install
#CMD ["nodejs", "/usr/local/src/engagementservice/app.js"]

#EXPOSE 8834

FROM node:9.9.0
ARG VERSION_TAG
RUN git clone -b $VERSION_TAG https://github.com/DuoSoftware/DVP-Engagement.git /usr/local/src/engagementservice
RUN cd /usr/local/src/engagementservice;
WORKDIR /usr/local/src/engagementservice
RUN npm install
EXPOSE 8834
CMD [ "node", "/usr/local/src/engagementservice/app.js" ]
