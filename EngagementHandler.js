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

/*
 // Connection URL
 var url = 'mongodb://dave:password@localhost:27017?authMechanism=DEFAULT&authSource=db';
*/


// Connection URL
var url = 'mongodb://'+config.Mongo.user+':'+config.Mongo.password+'@'+config.Mongo.ip+':'+config.Mongo.port+'/'+config.Mongo.dbname; //'mongodb://localhost:27017/dvp-engagements';

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

var updateSiblings = function (engagementId,insertedId, res) {
    var jsonString;

    database.updateOne({_id: engagementId}, {
        $push: {
            siblings: {
                $each: [ insertedId],
            }
        }
    }, function (err, result) {
        if (!err) {
            logger.info('updateSiblings - [%s]', engagementId);
            jsonString = messageFormatter.FormatMessage(undefined, "EXCEPTION", result.result.ok == 1, insertedId);
            res.end(jsonString);
        }
        else {

            logger.error('updateSiblings - [%s]', engagementId, err);
            jsonString = messageFormatter.FormatMessage(err, "EXCEPTION", false, undefined);
            res.end(jsonString);
        }
    })
};



var updateLinks = function (engagementId, insertedId, res) {

    var jsonString;

    database.updateOne({_id: engagementId}, {
        $push: {
            links: {
                $each: [ insertedId],
            }
        }
    }, function (err, result) {
        if (!err) {
            logger.info('updateLinks - [%s]', engagementId);
            jsonString = messageFormatter.FormatMessage(undefined, "EXCEPTION", result.result.ok == 1, insertedId);
            res.end(jsonString);
        }
        else {

            logger.error('updateLinks - [%s]', engagementId, err);
            jsonString = messageFormatter.FormatMessage(err, "EXCEPTION", false, undefined);
            res.end(jsonString);
        }
    })

};

exports.saveEngagement = function (tenant, company, req, res) {

    res.setHeader('Content-Type', 'application/json');


    var attachments = [{tenant: tenant, company: company, engagementId: req.body.engagementId.toString(), req: req, res: res}];
    var task = [];
    res.setHeader('Content-Type', 'application/json');
    attachments.forEach(function (attachment) {
        task.push(function () {
            var now = moment(new Date());
            var date = now.format("DD-MM-YYYY-HH:mm:ss:SSS");


            var newEng = {
                _id: attachment.engagementId,
                engagementId: attachment.engagementId.toString(),
                engagementType: attachment.req.body.engagementType,
                tenant: attachment.tenant,
                company: attachment.company,
                data: attachment.req.body.data,
                links: [],
                siblings: [],
                parent: null,
                create: date
            };

            database.insertOne(newEng, function (err, result) {
                var jsonString;
                if (!err) {
                    logger.info('updateLinks - [%s]', newEng.engagementId);
                    jsonString = messageFormatter.FormatMessage(undefined, "EXCEPTION", result.result.ok == 1, result.insertedId.toString());
                    res.end(jsonString);
                }
                else {
                    logger.error('save Root Engagement - [%s]', newEng.engagementId, err);
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
                _id:attachment.engagementId.toString(),
                engagementId: attachment.engagementId.toString(),
                create: now.format("DD-MM-YYYY-HH:mm:ss:SSS")
            }, function (err, result) {
                if (err) {
                    logger.error('saveId - [%s]', attachment.engagementId, err);
                }
            });
        });
    });
    async.parallel(task, null);

};

exports.updateEngagement = function (tenant, company, req, res) {

    res.setHeader('Content-Type', 'application/json');

    var now = moment(new Date());
    var date = now.format("DD-MM-YYYY-HH:mm:ss:SSS");
    var newEng = {
        engagementId: req.params.engagementId.toString(),
        engagementType: req.body.engagementType,
        tenant: tenant,
        company: company,
        data: req.body.data,
        links: [],
        siblings: [],
        parent: null,
        create: date
    };

    database.insertOne(newEng, function (err, result) {
        if (!err) {
            updateLinks(newEng.engagementId,result.insertedId.toString(), res);
        }
        else {
            logger.error('save Root Engagement - [%s]', newEng.engagementId, err);
            var jsonString = messageFormatter.FormatMessage(err, "EXCEPTION", false, undefined);
            res.end(jsonString);
        }
    });
};

exports.getEngagementById = function (tenant, company, req, res) {

    var engagementId = req.params.engagementId.toString();
    res.setHeader('Content-Type', 'application/json');
    var jsonString;

    database.findOne({_id: engagementId}, function (err, eng) {
        if (!err) {
            logger.info('getEngagementById - [%s]', engagementId);
            jsonString = messageFormatter.FormatMessage(undefined, "EXCEPTION", true, eng);
            res.end(jsonString);
        }
        else {
                     logger.error('getEngagementById - [%s]', engagementId, err);
            jsonString = messageFormatter.FormatMessage(err, "EXCEPTION", false, undefined);
            res.end(jsonString);
        }
    });

};

exports.getEngagementsById = function (tenant, company, req, res) {

    var engagementId = req.params.engagementId.toString();
    res.setHeader('Content-Type', 'application/json');
    var jsonString;

    var page = parseInt(req.params.Page),
        size = parseInt(req.params.Size),
        skip = page > 0 ? ((page - 1) * size) : 0;

    database.findOne({_id: engagementId}, function (err, eng) {
        if (!err) {
            if (eng) {
                var ids = eng.links;
                ids = ids.map(function (id) {
                    return ObjectID(id);
                });

                database.find({_id: {$in: ids}}).skip(skip).limit(size).toArray(function (err, anc) {
                    if (!err) {
                        logger.info('getEngagementById - [%s]', engagementId);
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
            logger.error('getEngagementById - [%s]', engagementId, err);
            jsonString = messageFormatter.FormatMessage(err, "EXCEPTION", false, undefined);
            res.end(jsonString);
        }
    });

};

exports.isExistingEngagement = function (tenant, company, req, res) {

    var engagementId = req.params.engagementId.toString();
    res.setHeader('Content-Type', 'application/json');
    var jsonString;


    database.findOne({_id: engagementId}, function (err, eng) {
        if (!err) {
            logger.info('getEngagementById - [%s]', engagementId);
            jsonString = messageFormatter.FormatMessage(undefined, "EXCEPTION", eng!=undefined, undefined);
            res.end(jsonString);
        }
        else {

            logger.error('getEngagementById - [%s]', engagementId, err);
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

            logger.error('getAllAttachments - [%s]', engagementId, err);
            jsonString = messageFormatter.FormatMessage(err, "EXCEPTION", false, undefined);
            res.end(jsonString);
        }
    });

};

exports.getAttachment = function (tenant, company, req, res) {

    var attachmentId = req.params.attachmentId;

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

exports.createEngagementAndAddAttachment = function (tenant, company, req, res) {

    var engagementId = req.params.engagementId.toString();

    res.setHeader('Content-Type', 'application/json');
    var jsonString;

    var now = moment(new Date());
    var date = now.format("DD-MM-YYYY-HH:mm:ss:SSS");

    function saveItem() {
        database.insertOne({
            engagementId: engagementId,
            attachmentType: req.body.attachmentType,
            tenant: tenant,
            company: company,
            data: req.body.data,
            create: date,
            links: [],
            siblings: [],
            parent: engagementId
        }, function (err, itm) {
            if (!err) {
                updateSiblings(engagementId, itm.insertedId.toString(), res);
            }
            else {

                logger.error('saveEngagement - [%s]', engagementId, err);
                jsonString = messageFormatter.FormatMessage(err, "EXCEPTION", false, undefined);
                res.end(jsonString);
            }
        })
    }

    var newEng = {
        _id: engagementId,
        engagementId: engagementId,
        engagementType: req.body.engagementType,
        tenant: tenant,
        company: company,
        data: req.body.data,
        links: [],
        siblings: [],
        parent: null,
        create: date
    };

    database.insertOne(newEng, function (err, result) {
        if (!err) {
            saveItem();
        }
        else {
            logger.error('save Root Engagement - [%s]', newEng.engagementId, err);
            var jsonString = messageFormatter.FormatMessage(err, "EXCEPTION", false, undefined);
            res.end(jsonString);
        }
    });

    /*
    database.findOne({_id: engagementId}, function (err, eng) {
        if (err) {
            logger.error('getEngagement - [%s]', engagementId, err);
            jsonString = messageFormatter.FormatMessage(err, "EXCEPTION", false, undefined);
            res.end(jsonString);
            if (err.name == "MongoError") {
                resetConnection();
            }
            return;
        }
        if (eng) {
            database.insertOne({
                engagementId: engagementId,
                attachmentType: req.body.attachmentType,
                tenant: tenant,
                company: company,
                data: req.body.data,
                create: date,
                links: [],
                siblings: [],
                parent: parentId
            }, function (err, itm) {
                if (!err) {
                    eng.siblings.push(itm.insertedId.toString());
                    updateSiblings(engagementId, eng.siblings, itm.insertedId, res);
                }
                else {
                    if (err.name == "MongoError") {
                        resetConnection();
                    }
                    logger.error('saveEngagement - [%s]', engagementId, err);
                    jsonString = messageFormatter.FormatMessage(err, "EXCEPTION", false, undefined);
                    res.end(jsonString);
                }
            })
        }
        else {

            jsonString = messageFormatter.FormatMessage(undefined, "Invalid  ID or Item ID", false, undefined);
            res.end(jsonString);
        }

    });
    */
};

exports.addAttachmentToEngagement = function (tenant, company, req, res) {

    var engagementId = req.params.engagementId.toString();
    var parentId = req.params.parentId;


    res.setHeader('Content-Type', 'application/json');
    var jsonString;

    var now = moment(new Date());
    var date = now.format("DD-MM-YYYY-HH:mm:ss:SSS");
    database.insertOne({
        engagementId: engagementId,
        attachmentType: req.body.attachmentType,
        tenant: tenant,
        company: company,
        data: req.body.data,
        create: date,
        links: [],
        siblings: [],
        parent: parentId
    }, function (err, itm) {
        if (!err) {
            updateSiblings(engagementId, itm.insertedId.toString(), res);
        }
        else {

            logger.error('saveEngagement - [%s]', engagementId, err);
            jsonString = messageFormatter.FormatMessage(err, "EXCEPTION", false, undefined);
            res.end(jsonString);
        }
    })
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
    collection.find({}).skip(skip).limit(size).toArray(function (err, ids) {
        if (!err) {
            var arrOfVals = ids.map(function(it){ return it._id})
//database.find({_id: {$in: ids}}).toArray(function (err, anc) {
            database.find({_id: {$in: arrOfVals}}).toArray(function (err, eng) {
                if (!err) {
                    logger.info('getAllEngagementsByDate - [%s]', selectedDate);
                    jsonString = messageFormatter.FormatMessage(undefined, "EXCEPTION", true, eng);
                    res.end(jsonString);
                }else{
                    logger.error('getAllEngagementsByDate - [%s]', selectedDate, err);
                    jsonString = messageFormatter.FormatMessage(err, "EXCEPTION", false, undefined);
                    res.end(jsonString);
                }
            });

        }
        else {

            logger.error('getAllEngagementsByDate - [%s]', selectedDate, err);
            jsonString = messageFormatter.FormatMessage(err, "EXCEPTION", false, undefined);
            res.end(jsonString);
        }
    });

};

exports.getAllEngagementsIdsByDate = function (tenant, company, req, res) {

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

            logger.error('getAllEngagementsByDate - [%s]', selectedDate, err);
            jsonString = messageFormatter.FormatMessage(err, "EXCEPTION", false, undefined);
            res.end(jsonString);
        }
    });

};