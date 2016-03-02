/**
 * Created by Pawan on 6/1/2015.
 */

var restify = require('restify');
var cors = require('cors');
var messageFormatter = require('dvp-common/CommonMessageGenerator/ClientMessageJsonFormatter.js');

var config = require('config');

var port = config.Host.port || 3000;
var version = config.Host.version;
var logger = require('dvp-common/LogHandler/CommonLogHandler.js').logger;
var engagementHandler = require('./EngagementHandler');



//-------------------------  Restify Server ------------------------- \\
var RestServer = restify.createServer({
    name: "engagementService",
    version: '1.0.0'
});

restify.CORS.ALLOW_HEADERS.push('authorization');
RestServer.use(restify.CORS());
RestServer.use(restify.fullResponse());

//Server listen
RestServer.listen(port, function () {
    console.log('%s listening at %s', RestServer.name, RestServer.url);


});

//Enable request body parsing(access)
RestServer.use(restify.bodyParser());
RestServer.use(restify.acceptParser(RestServer.acceptable));
RestServer.use(restify.queryParser());
RestServer.use(cors());

// ---------------- Security -------------------------- \\
var jwt = require('restify-jwt');
var secret = require('dvp-common/Authentication/Secret.js');
var authorization = require('dvp-common/Authentication/Authorization.js');
RestServer.use(jwt({secret: secret.Secret}));
// ---------------- Security -------------------------- \\


//-------------------------  Restify Server ------------------------- \\

//-------------------------  CampaignHandler ------------------------- \\

RestServer.post('/DVP/API/' + version + '/EngagementService/Engagement/', authorization({
    resource: "engagement",
    action: "write"
}), function (req, res, next) {
    try {

        logger.info('[saveEngagement] - [HTTP]  - Request received -  Data - %s ', JSON.stringify(req.body));

        if (!req.user ||!req.user.tenant || !req.user.company)
            throw new Error("invalid tenant or company.");
        var tenantId = req.user.tenant;
        var companyId = req.user.company;

        engagementHandler.saveEngagement(tenantId,companyId,req,res);

    }
    catch (ex) {

        logger.error('[saveEngagement] - [HTTP]  - Exception occurred -  Data - %s ', JSON.stringify(req.body), ex);
        var jsonString = messageFormatter.FormatMessage(ex, "EXCEPTION", false, undefined);
        logger.debug('[saveEngagement] - Request response : %s ', jsonString);
        res.end(jsonString);
    }
    return next();
});

RestServer.get('/DVP/API/' + version + '/EngagementService/Engagement/:sessionId', authorization({
    resource: "engagement",
    action: "write"
}), function (req, res, next) {
    try {

        logger.info('[getEngagement] - [HTTP]  - Request received -  Data - %s ', JSON.stringify(req.body));

        if (!req.user ||!req.user.tenant || !req.user.company)
            throw new Error("invalid tenant or company.");
        var tenantId = req.user.tenant;
        var companyId = req.user.company;

        engagementHandler.getEngagementBySessionId(tenantId,companyId,req,res);

    }
    catch (ex) {

        logger.error('[getEngagement] - [HTTP]  - Exception occurred -  Data - %s ', JSON.stringify(req.body), ex);
        var jsonString = messageFormatter.FormatMessage(ex, "EXCEPTION", false, undefined);
        logger.debug('[getEngagement] - Request response : %s ', jsonString);
        res.end(jsonString);
    }
    return next();
});

RestServer.get('/DVP/API/' + version + '/EngagementService/Engagement/:engagementId/items', authorization({
    resource: "engagement",
    action: "read"
}), function (req, res, next) {
    try {

        logger.info('[getAllattachments] - [HTTP]  - Request received -  Data - %s ', JSON.stringify(req.body));

        if (!req.user ||!req.user.tenant || !req.user.company)
            throw new Error("invalid tenant or company.");
        var tenantId = req.user.tenant;
        var companyId = req.user.company;

        engagementHandler.getAllAttachments(tenantId,companyId,req,res);

    }
    catch (ex) {

        logger.error('[getAllattachments] - [HTTP]  - Exception occurred -  Data - %s ', JSON.stringify(req.body), ex);
        var jsonString = messageFormatter.FormatMessage(ex, "EXCEPTION", false, undefined);
        logger.debug('[getAllattachments] - Request response : %s ', jsonString);
        res.end(jsonString);
    }
    return next();
});

RestServer.get('/DVP/API/' + version + '/EngagementService/Engagement/:engagementId/item/:itemId', authorization({
    resource: "engagement",
    action: "read"
}), function (req, res, next) {
    try {

        logger.info('[getAttachment] - [HTTP]  - Request received -  Data - %s ', JSON.stringify(req.body));

        if (!req.user ||!req.user.tenant || !req.user.company)
            throw new Error("invalid tenant or company.");
        var tenantId = req.user.tenant;
        var companyId = req.user.company;

        engagementHandler.getAttachment(tenantId,companyId,req,res);

    }
    catch (ex) {

        logger.error('[getAttachment] - [HTTP]  - Exception occurred -  Data - %s ', JSON.stringify(req.body), ex);
        var jsonString = messageFormatter.FormatMessage(ex, "EXCEPTION", false, undefined);
        logger.debug('[getAttachment] - Request response : %s ', jsonString);
        res.end(jsonString);
    }
    return next();
});

RestServer.post('/DVP/API/' + version + '/EngagementService/Engagement/item', authorization({
    resource: "engagement",
    action: "write"
}), function (req, res, next) {
    try {

        logger.info('[addItemToEngagement] - [HTTP]  - Request received -  Data - %s ', JSON.stringify(req.body));

        if (!req.user ||!req.user.tenant || !req.user.company)
            throw new Error("invalid tenant or company.");
        var tenantId = req.user.tenant;
        var companyId = req.user.company;

        engagementHandler.addItemToEngagement(tenantId,companyId,req,res);

    }
    catch (ex) {

        logger.error('[addItemToEngagement] - [HTTP]  - Exception occurred -  Data - %s ', JSON.stringify(req.body), ex);
        var jsonString = messageFormatter.FormatMessage(ex, "EXCEPTION", false, undefined);
        logger.debug('[addItemToEngagement] - Request response : %s ', jsonString);
        res.end(jsonString);
    }
    return next();
});

//------------------------- End-CampaignHandler ------------------------- \\
