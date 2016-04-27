#FROM ubuntu
#RUN apt-get update
#RUN apt-get install -y git nodejs npm nodejs-legacy
#RUN git clone git://github.com/DuoSoftware/DVP-Engagement.git /usr/local/src/engagement
#RUN cd /usr/local/src/engagement; npm install
#CMD ["nodejs", "/usr/local/src/engagement/app.js"]

#EXPOSE 8812

FROM node:argon
RUN git clone git://github.com/DuoSoftware/DVP-Engagement.git /usr/local/src/engagement
RUN cd /usr/local/src/engagement;
WORKDIR /usr/local/src/engagement
RUN npm install
EXPOSE 8827
CMD [ "node", "/usr/local/src/engagement/app.js" ]