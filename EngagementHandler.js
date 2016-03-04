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
var url = 'mongodb://localhost:27017/dvp-engagements';

var database;
MongoClient.connect(url, function (err, db) {
    assert.equal(null, err);
    console.log("Connected correctly to server");
    database = db.collection("Engagements");
});

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

var updateAncestors = function (sessionId, ancestors, insertedId, res) {
    var jsonString;

    database.updateOne({_id: sessionId}, {$set: {ancestors: ancestors}}, function (err, result) {
        if (!err) {
            logger.info('updateAncestors - [%s]', sessionId);
            jsonString = messageFormatter.FormatMessage(undefined, "EXCEPTION", result.result.ok == 1, insertedId);
            res.end(jsonString);
        }
        else {
            if (err.name == "MongoError") {
                resetConnection();
            }
            logger.error('updateAncestors - [%s]', sessionId, err);
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

var saveSessionId = function (sessionId) {

    var now = moment(new Date());
    var date = now.format("DDMMYYYY");
    var databaseUrl = config.DB.Host + "/" + config.DB.Database,
        collections = [date],
        db = require("mongojs")(databaseUrl, collections);


    db[date].findOne({sessionid: sessionId}, function (err, sid) {
        if (sid) {
            db[sessionId].save({
                sessionid: sessionId,
                create: now.format("DD-MM-YYYY-HH:mm:ss:SSS")
            }, function (err, result) {
                if (err) {
                    logger.error('saveSessionId - [%s]', sessionId, err);
                }
            });
        }
    });
};

var saveEngagementdata = function (tenant, company, sessionId, req, res) {

    res.setHeader('Content-Type', 'application/json');

    var collection = database.collection(sessionId.toString());
    var now = moment(new Date());
    var date = now.format("DD-MM-YYYY-HH:mm:ss:SSS");
    var jsonString;
    // Insert some documents
    collection.insertOne({
            sessionid: sessionId,
            engagementtype: req.body.EngagementType,
            tenant: tenant,
            company: company,
            data: req.body.Data,
            links: [],
            create: date
        }, function (err, result) {

            if (!err) {
                id = result._id;
                logger.info('saveEngagement - [%s]', sessionId);
                jsonString = messageFormatter.FormatMessage(undefined, "EXCEPTION", true, result);
                res.end(jsonString);
            }
            else {
                if (err.name == "MongoError") {
                    resetConnection();
                }
                logger.error('saveEngagement - [%s]', sessionId, err);
                jsonString = messageFormatter.FormatMessage(err, "EXCEPTION", false, undefined);
                res.end(jsonString);
            }
        }
    );


    /*var databaseUrl = config.DB.Host + "/" + config.DB.Database,//example.com/mydb
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
     create: date
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
     })*/
};

exports.saveEngagement = function (tenant, company, req, res) {


    /*var collection = database.collection("categories");

     collection.insert({_id: "MongoDB", ancestors: ["Books", "Programming", "Databases"], parent: "Databases"})
     collection.insert({_id: "dbm", ancestors: ["Books", "Programming", "Databases"], parent: "Databases"})
     collection.insert({_id: "Databases", ancestors: ["Books", "Programming"], parent: "Programming"})
     collection.insert({_id: "Languages", ancestors: ["Books", "Programming"], parent: "Programming"})
     collection.insert({_id: "Programming", ancestors: ["Books"], parent: "Books"})
     collection.insert({_id: "Books", ancestors: [], parent: null})

     var tt = collection.findOne({_id: "MongoDB"}).ancestors

     var twt = collection.findOne({_id: "MongoDB"}, function (er, r) {
     r.ancestors;
     })
     */

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
                        ancestors: [],
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
                            ancestors: [],
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
        /*task.push(function () {

         var now = moment(new Date());
         var schm = now.format("DDMMYYYY");
         var collection = database.collection(schm.toString());
         var now = moment(new Date());

         collection.findOne({sessionid: item.sessionId.toString()}, function (err, result) {
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
         );
         });*/
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
                ids = ids.map(function(id) { return ObjectID(id); });

                database.find({_id: {$in: ids}}).toArray(function (err, anc) {
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
    if(ObjectID.isValid(engagementId))
    {
        engagementId = new ObjectID(engagementId);
    }

    database.findOne({_id: engagementId}, function (err, eng) {
        if (!err) {
            if (eng) {
                var ids = eng.ancestors;
                ids = ids.map(function(id) {return ObjectID(id);});

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
                ancestors: [],
                parent: itemId
            }, function (err, itm) {
                if (!err) {
                    eng.ancestors.push(itm.insertedId.toString());
                    updateAncestors(sessionId, eng.ancestors, itm.insertedId, res);
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

    var collection = database.collection(selectedDate.toString());
    res.setHeader('Content-Type', 'application/json');
    var jsonString;


    collection.find({}).toArray(function (err, eng) {
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