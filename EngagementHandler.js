/**
 * Created by Rajinda on 2/29/2016.
 */

var ObjectID = require('mongodb').ObjectID;
var config = require('config');
var logger = require('dvp-common/LogHandler/CommonLogHandler.js').logger;
var messageFormatter = require('dvp-common/CommonMessageGenerator/ClientMessageJsonFormatter.js');
var moment = require("moment");

var updateLinks = function (db,sessionId,itemId, links,res) {

    var jsonString;
    db[sessionId].update({_id: db.ObjectId(itemId)},{$set: {links: links}}, function (err, eng) {
        if (!err) {
            logger.info('updateLinks - [%s]', sessionId);
            jsonString = messageFormatter.FormatMessage(undefined, "EXCEPTION", eng.ok==1, eng);
            res.end(jsonString);
        }
        else {
            logger.error('updateLinks - [%s]', sessionId, err);
            jsonString = messageFormatter.FormatMessage(err, "EXCEPTION", false, undefined);
            res.end(jsonString);
        }
    })

};

var saveSessionId = function(sessionId){

    var now = moment(new Date());
    var date = now.format("DDMMYYYY");
    var databaseUrl = config.DB.Host+"/"+config.DB.Database,
        collections = [date],
        db = require("mongojs")(databaseUrl, collections);


    db[date].findOne({ sessionid: sessionId}, function (err, sid) {
        if(sid){
            db[sessionId].save({sessionid: sessionId, create:now.format("DD-MM-YYYY-HH:mm:ss:SSS")},function(err,result){
                if (err) {
                    logger.error('saveSessionId - [%s]', sessionId, err);
                }
            });
        }
    });
};

var saveEngagementdata = function(tenant, company,sessionId, req, res){

    var databaseUrl = config.DB.Host+"/"+config.DB.Database,//example.com/mydb
        collections = [sessionId],
        db = require("mongojs")(databaseUrl, collections);
    res.setHeader('Content-Type', 'application/json');
    var jsonString;

    var now = moment(new Date());
    var date = now.format("DD-MM-YYYY-HH:mm:ss:SSS");
    db[sessionId].save({
        sessionid: sessionId,
        engagementtype: req.body.EngagementType,
        tenant: tenant,
        company: company,
        data: req.body.Data,
        links: [],
        create:date
    }, function (err, eng) {
        if (!err) {
            id = eng._id;
            logger.info('saveEngagement - [%s]', sessionId);
            jsonString = messageFormatter.FormatMessage(undefined, "EXCEPTION", true, eng);
            res.end(jsonString);
        }
        else {
            logger.error('saveEngagement - [%s]', sessionId, err);
            jsonString = messageFormatter.FormatMessage(err, "EXCEPTION", false, undefined);
            res.end(jsonString);
        }
    })
};

exports.saveEngagement = function (tenant, company, req, res) {

    var sessionId = req.body.sessionId;


};

exports.getEngagementBySessionId = function (tenant, company, req, res) {

    var sessionId = req.params.sessionId;

    var databaseUrl = config.DB.Host+"/"+config.DB.Database,
        collections = [sessionId],
        db = require("mongojs")(databaseUrl, collections);
    res.setHeader('Content-Type', 'application/json');
    var jsonString;



    db[sessionId].find({sessionid:sessionId}, function (err, eng) {
        if (!err) {
            logger.info('getEngagementBySessionId - [%s]', sessionId);
            jsonString = messageFormatter.FormatMessage(undefined, "EXCEPTION", true, eng);
            res.end(jsonString);
        }
        else {
            logger.error('getEngagementBySessionId - [%s]', sessionId, err);
            jsonString = messageFormatter.FormatMessage(err, "EXCEPTION", false, undefined);
            res.end(jsonString);
        }
    });

};

exports.getAllAttachments = function (tenant, company, req, res) {

    var itemId = req.params.engagementId;

    var databaseUrl = config.DB.Host+"/"+config.DB.Database,
        collections = [itemId],
        db = require("mongojs")(databaseUrl, collections);
    res.setHeader('Content-Type', 'application/json');
    var jsonString;


    db[itemId].find({}, function (err, eng) {
        if (!err) {
            logger.info('getAllattachments - [%s]', itemId);
            jsonString = messageFormatter.FormatMessage(undefined, "EXCEPTION", true, eng);
            res.end(jsonString);
        }
        else {
            logger.error('getAllattachments - [%s]', itemId, err);
            jsonString = messageFormatter.FormatMessage(err, "EXCEPTION", false, undefined);
            res.end(jsonString);
        }
    });

};

exports.getAttachment = function (tenant, company, req, res) {

    var itemId = req.params.engagementId;
    var attachmentId = req.params.itemId;

    var databaseUrl = config.DB.Host+"/"+config.DB.Database,
        collections = [itemId],
        db = require("mongojs")(databaseUrl, collections);
    res.setHeader('Content-Type', 'application/json');
    var jsonString;


    db[itemId].findOne({_id:  db.ObjectId(attachmentId)}, function (err, eng) {
        if (!err) {
            logger.info('getAttachment - [%s]', itemId);
            jsonString = messageFormatter.FormatMessage(undefined, "EXCEPTION", true, eng);
            res.end(jsonString);
        }
        else {
            logger.error('getAttachment - [%s]', itemId, err);
            jsonString = messageFormatter.FormatMessage(err, "EXCEPTION", false, undefined);
            res.end(jsonString);
        }
    });

};

exports.addItemToEngagement = function (tenant, company, req, res) {

    var sessionId = req.body.sessionId;
    var itemId = req.body.itemId;

    var databaseUrl = config.DB.Host+"/"+config.DB.Database,
        collections = [sessionId,itemId],
        db = require("mongojs")(databaseUrl, collections);
    res.setHeader('Content-Type', 'application/json');
    var jsonString;

    var now = moment(new Date());
    var date = now.format("DD-MM-YYYY-HH:mm:ss:SSS");
    db[sessionId].findOne({ _id:  db.ObjectId(itemId)}, function (err, eng) {
        if (!err) {
            if (eng) {
                db[itemId].save({
                    sessionid: sessionId,
                    itemtype: req.body.ItemType,
                    tenant: tenant,
                    company: company,
                    data: req.body.Data,
                    links: [],
                    create:date
                }, function (err, itm) {
                    if (!err) {
                        eng.links.push(itm._id.toString());
                        updateLinks(db,sessionId,itemId,eng.links,res);
                    }
                    else {
                        logger.error('saveEngagement - [%s]', sessionId, err);
                        jsonString = messageFormatter.FormatMessage(err, "EXCEPTION", false, undefined);
                        res.end(jsonString);
                    }
                })
            }
            else {
                jsonString = messageFormatter.FormatMessage(undefined, "Invalid Session ID or Item ID", false, undefined);
                res.end(jsonString);
            }
        }
        else {
            logger.error('getEngagement - [%s]', sessionId, err);
            jsonString = messageFormatter.FormatMessage(err, "EXCEPTION", false, undefined);
            res.end(jsonString);
        }
    });

};