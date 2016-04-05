/**
 * Created by Rajinda on 2/29/2016.
 */


var config = require('config');
var logger = require('dvp-common/LogHandler/CommonLogHandler.js').logger;
var messageFormatter = require('dvp-common/CommonMessageGenerator/ClientMessageJsonFormatter.js');
var moment = require("moment");
var async = require("async");

var MongoClient = require('mongodb').MongoClient
    , assert = require('assert'),
    ObjectID = require('mongodb').ObjectID;

// Connection URL
var url = 'mongodb://'+config.Mongo.ip+':'+config.Mongo.port+'/'+config.Mongo.dbname; //'mongodb://localhost:27017/dvp-engagements';

var database;
var baseDb;
MongoClient.connect(url, function (err, db) {
    assert.equal(null, err);
    console.log("Connected correctly to server");
    database = db.collection("Engagements");
    baseDb=db;
});

/*
baseDb.authenticate(config.Mongo.user, config.Mongo.password, function(err, success){
    if(success){
        callback(null, db);
    }
    else {
        callback(err ? err : new Error('Could not authenticate user ' + user), null);
    }
});

*/

var resetConnection = function () {
    try {
        MongoClient.connect(url, function (err, db) {
            assert.equal(null, err);
            console.log("Reset Connection.....");
            database = db;
        });
    }
    catch (ex) {
        var jsonString = messageFormatter.FormatMessage(ex, "EXCEPTION", false, undefined);
        logger.error('[resetConnection] -  : %s ', jsonString);
    }
};

var updateSiblings = function (sessionId, siblings, insertedId, res) {
    var jsonString;

    database.updateOne({_id: sessionId}, {$set: {siblings: siblings}}, function (err, result) {
        if (!err) {
            logger.info('updateSiblings - [%s]', sessionId);
            jsonString = messageFormatter.FormatMessage(undefined, "EXCEPTION", result.result.ok == 1, insertedId);
            res.end(jsonString);
        }
        else {
            if (err.name == "MongoError") {
                resetConnection();
            }
            logger.error('updateSiblings - [%s]', sessionId, err);
            jsonString = messageFormatter.FormatMessage(err, "EXCEPTION", false, undefined);
            res.end(jsonString);
        }
    })
};

var updateLinks = function (sessionId, links, eng, res) {

    var jsonString;

    database.updateOne({_id: sessionId}, {$set: {links: links}}, function (err, result) {
        if (!err) {
            logger.info('updateLinks - [%s]', sessionId);
            jsonString = messageFormatter.FormatMessage(undefined, "EXCEPTION", result.result.ok == 1, eng.insertedId);
            res.end(jsonString);
        }
        else {
            if (err.name == "MongoError") {
                resetConnection();
            }
            logger.error('updateLinks - [%s]', sessionId, err);
            jsonString = messageFormatter.FormatMessage(err, "EXCEPTION", false, undefined);
            res.end(jsonString);
        }
    })

};

exports.saveEngagement = function (tenant, company, req, res) {

    var items = [{tenant: tenant, company: company, sessionId: req.body.sessionId.toString(), req: req, res: res}];
    var task = [];
    res.setHeader('Content-Type', 'application/json');
    items.forEach(function (item) {
        task.push(function () {
            var now = moment(new Date());
            var date = now.format("DD-MM-YYYY-HH:mm:ss:SSS");
            var jsonString;
            database.findOne({_id: item.sessionId}, function (err, eng) {
                if (!err) {
                    var newEng = {
                        _id: item.sessionId,
                        sessionid: item.sessionId.toString(),
                        engagementtype: item.req.body.EngagementType,
                        tenant: item.tenant,
                        company: item.company,
                        data: item.req.body.Data,
                        links: [],
                        siblings: [],
                        parent: null,
                        create: date
                    };
                    if (eng) {
                        newEng = {
                            sessionid: item.sessionId.toString(),
                            engagementtype: item.req.body.EngagementType,
                            tenant: item.tenant,
                            company: item.company,
                            data: item.req.body.Data,
                            links: [],
                            siblings: [],
                            parent: null,
                            create: date
                        };
                    }

                    database.insertOne(newEng, function (err, result) {
                        if (!err) {
                            if (eng) {
                                eng.links.push(result.insertedId.toString());
                                updateLinks(item.sessionId, eng.links, result, res);
                            }
                            else {
                                jsonString = messageFormatter.FormatMessage(undefined, "EXCEPTION", true, result.insertedId);
                                res.end(jsonString);
                            }
                        }
                        else {
                            if (err.name == "MongoError") {
                                resetConnection();
                            }
                            logger.error('save Root Engagement - [%s]', item.sessionId, err);
                            jsonString = messageFormatter.FormatMessage(err, "EXCEPTION", false, undefined);
                            res.end(jsonString);
                        }
                    })
                }
                else {
                    if (err.name == "MongoError") {
                        resetConnection();
                    }
                    logger.error('getEngagementBySessionId - [%s]', sessionId, err);
                    jsonString = messageFormatter.FormatMessage(err, "EXCEPTION", false, undefined);
                    res.end(jsonString);
                }
            });
        });
        task.push(function () {

            var now = moment(new Date());
            var schm = now.format("DDMMYYYY");
            var collection = baseDb.collection(schm.toString());
            var now = moment(new Date());


            collection.insertOne({
                _id:item.sessionId.toString(),
                sessionid: item.sessionId.toString(),
                create: now.format("DD-MM-YYYY-HH:mm:ss:SSS")
            }, function (err, result) {
                if (err) {
                    logger.error('saveSessionId - [%s]', item.sessionId, err);
                }
            });


            /*collection.findOne({sessionid: item.sessionId.toString()}, function (err, result) {
                    if (!err) {
                        if (!result) {
                            collection.insertOne({
                                sessionid: item.sessionId.toString(),
                                create: now.format("DD-MM-YYYY-HH:mm:ss:SSS")
                            }, function (err, result) {
                                if (err) {
                                    logger.error('saveSessionId - [%s]', item.sessionId, err);
                                }
                            });
                        }
                    }
                    else {
                        if (err.name == "MongoError") {
                            resetConnection();
                        }
                    }

                }
            );*/
        });
    });
    async.parallel(task, null);
};

exports.getEngagementBySessionId = function (tenant, company, req, res) {

    var sessionId = req.params.sessionId.toString();
    res.setHeader('Content-Type', 'application/json');
    var jsonString;

    database.findOne({_id: sessionId}, function (err, eng) {
        if (!err) {
            logger.info('getEngagementBySessionId - [%s]', sessionId);
            jsonString = messageFormatter.FormatMessage(undefined, "EXCEPTION", true, eng);
            res.end(jsonString);
        }
        else {
            if (err.name == "MongoError") {
                resetConnection();
            }
            logger.error('getEngagementBySessionId - [%s]', sessionId, err);
            jsonString = messageFormatter.FormatMessage(err, "EXCEPTION", false, undefined);
            res.end(jsonString);
        }
    });

};

exports.getEngagementsBySessionId = function (tenant, company, req, res) {

    var sessionId = req.params.sessionId.toString();
    res.setHeader('Content-Type', 'application/json');
    var jsonString;

    database.findOne({_id: sessionId}, function (err, eng) {
        if (!err) {
            if (eng) {
                var ids = eng.links;
                ids = ids.map(function (id) {
                    return ObjectID(id);
                });

                var page = parseInt(req.params.Page),
                    size = parseInt(req.params.Size),
                    skip = page > 0 ? ((page - 1) * size) : 0;

                database.find({_id: {$in: ids}}).skip(skip).limit(size).toArray(function (err, anc) {
                    if (!err) {
                        logger.info('getEngagementBySessionId - [%s]', sessionId);
                        jsonString = messageFormatter.FormatMessage(undefined, "EXCEPTION", true, anc);
                        res.end(jsonString);
                    }
                    else {
                        jsonString = messageFormatter.FormatMessage(err, "EXCEPTION", false, undefined);
                        res.end(jsonString);
                    }
                });
            }
            else {
                jsonString = messageFormatter.FormatMessage(new Error("No data"), "EXCEPTION", false, undefined);
                res.end(jsonString);
            }
        }
        else {
            if (err.name == "MongoError") {
                resetConnection();
            }
            logger.error('getEngagementBySessionId - [%s]', sessionId, err);
            jsonString = messageFormatter.FormatMessage(err, "EXCEPTION", false, undefined);
            res.end(jsonString);
        }
    });

};

exports.getAllAttachments = function (tenant, company, req, res) {

    var engagementId = req.params.engagementId.toString();
    res.setHeader('Content-Type', 'application/json');
    var jsonString;
    if (ObjectID.isValid(engagementId)) {
        engagementId = new ObjectID(engagementId);
    }

    database.findOne({_id: engagementId}, function (err, eng) {
        if (!err) {
            if (eng) {
                var ids = eng.siblings;
                ids = ids.map(function (id) {
                    return ObjectID(id);
                });

                database.find({_id: {$in: ids}}).toArray(function (err, anc) {
                    if (!err) {
                        logger.info('getAllAttachments - [%s]', engagementId);
                        jsonString = messageFormatter.FormatMessage(undefined, "EXCEPTION", true, anc);
                        res.end(jsonString);
                    }
                    else {
                        jsonString = messageFormatter.FormatMessage(err, "EXCEPTION", false, undefined);
                        res.end(jsonString);
                    }
                });
            }
            else {
                jsonString = messageFormatter.FormatMessage(new Error("No data"), "EXCEPTION", false, undefined);
                res.end(jsonString);
            }


        }
        else {
            if (err.name == "MongoError") {
                resetConnection();
            }
            logger.error('getAllAttachments - [%s]', engagementId, err);
            jsonString = messageFormatter.FormatMessage(err, "EXCEPTION", false, undefined);
            res.end(jsonString);
        }
    });

};

exports.getAttachment = function (tenant, company, req, res) {

    var attachmentId = req.params.itemId;

    res.setHeader('Content-Type', 'application/json');
    var jsonString;

    try {
        database.findOne({_id: new ObjectID(attachmentId)}, function (err, eng) {
            if (!err) {
                logger.info('getAttachment - [%s]', attachmentId);
                jsonString = messageFormatter.FormatMessage(undefined, "EXCEPTION", true, eng);
                res.end(jsonString);
            }
            else {
                if (err.name == "MongoError") {
                    resetConnection();
                }
                logger.error('getAttachment - [%s]', attachmentId, err);
                jsonString = messageFormatter.FormatMessage(err, "EXCEPTION", false, undefined);
                res.end(jsonString);
            }
        });
    }
    catch (err) {
        logger.error('getAttachment - [%s]', attachmentId, err);
        jsonString = messageFormatter.FormatMessage(new Error("Invalid Item Id."), "EXCEPTION", false, undefined);
        res.end(jsonString);
    }
};

exports.addItemToEngagement = function (tenant, company, req, res) {

    var sessionId = req.body.sessionId.toString();
    var itemId = req.body.itemId;


    res.setHeader('Content-Type', 'application/json');
    var jsonString;

    var now = moment(new Date());
    var date = now.format("DD-MM-YYYY-HH:mm:ss:SSS");
    database.findOne({_id: sessionId}, function (err, eng) {
        if (err) {
            logger.error('getEngagement - [%s]', sessionId, err);
            jsonString = messageFormatter.FormatMessage(err, "EXCEPTION", false, undefined);
            res.end(jsonString);
            if (err.name == "MongoError") {
                resetConnection();
            }
            return;
        }
        if (eng) {
            database.insertOne({
                sessionid: sessionId,
                itemtype: req.body.ItemType,
                tenant: tenant,
                company: company,
                data: req.body.Data,
                create: date,
                links: [],
                siblings: [],
                parent: itemId
            }, function (err, itm) {
                if (!err) {
                    eng.siblings.push(itm.insertedId.toString());
                    updateSiblings(sessionId, eng.siblings, itm.insertedId, res);
                }
                else {
                    if (err.name == "MongoError") {
                        resetConnection();
                    }
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

    });
};

exports.getAllEngagementsByDate = function (tenant, company, req, res) {

    var selectedDate = req.params.Date;
    var page = parseInt(req.params.Page),
        size = parseInt(req.params.Size),
        skip = page > 0 ? ((page - 1) * size) : 0;

    var collection = baseDb.collection(selectedDate.toString());
    res.setHeader('Content-Type', 'application/json');
    var jsonString;

//db.companies.find().skip(3).limit(3)
    collection.find({}).skip(skip).limit(size).toArray(function (err, eng) {
        if (!err) {
            logger.info('getAllEngagementsByDate - [%s]', selectedDate);
            jsonString = messageFormatter.FormatMessage(undefined, "EXCEPTION", true, eng);
            res.end(jsonString);
        }
        else {
            if (err.name == "MongoError") {
                resetConnection();
            }
            logger.error('getAllEngagementsByDate - [%s]', selectedDate, err);
            jsonString = messageFormatter.FormatMessage(err, "EXCEPTION", false, undefined);
            res.end(jsonString);
        }
    });

};