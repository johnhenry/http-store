#!/usr/bin/env node
////
//Initial Command Line Stuff
////

var yargs = require('yargs')
    .usage("\nUsage: $0 [options]\n\n\
    Options (excluding help, version, verbose, env) can also be set via environment.\n\
    Many options can be set at runtime via PATCH method.\n\
    See documentation for more details.")
    .describe("help", "Show [this] help screen.")
        .alias("help", "h")
    .describe("version", "Display version")
        .alias("verbose","V")
        .boolean("version")
    .describe("verbose", "Print verbose output to the command line.")
        .alias("verbose","v")
        .boolean("verbose")
    .describe("env", "Use file to set environment variables")
        .alias("env","e")
    .describe("port","Listening port for HTTP requests.")
        .string("port")
        .alias("port","p")
    .describe("charset","Default encoding for stored objects.")
        .string("charset")
    .describe("body-limit","Limit of body to read.")
        .string("body-limit")
    .describe("base-type","Default type assigned to stored objects.")
        .string("base-type")
    .describe("static", "Serve static files.")
        .alias("static","s")
    .describe("unsafe-get", "Enables removal of items through GET get method.")
        .boolean("unsafe-get")
        .alias("unsafe-get", "u")
    .describe("peek", "View items w/o removal")
        .boolean("peek")
    .describe("capture-headers", "Store headers along with body.")
        .boolean("capture-headers")
        .alias("capture-headers","c")
    .describe("http-queue", "Retreve as queue by default.")
        .boolean("http-queue")
        .alias("http-queue","q")
    .describe("allow-set-date","Allow date to be set via request headers." )
        .alias("allow-set-date","d")
    .boolean("allow-set-date")
    .describe("db-protocol","Protocol for connecting to database host.")
        .string("db-protocol")
    .describe("db-host","MongoDB database host.")
        .string("db-host")
    .describe("db-user","MongoDB database user name.")
        .string("db-user")
    .describe("db-pass","MongoDB database password.")
        .string("db-pass")
    .describe("db-port","MongoDB connection port.")
        .string("db-port")
    .describe("db-name","MongoDB database name.")
        .string("db-name")
    .describe("db-url","MongoDB database full url. Takes priority over other DB attributes.")
        .string("db-url")
    .describe("collection-name","MongoDB database collection name to use.")
        .string("collection-name")
        .default("collection-name", "_")
    .describe("method-all-http","Enable HTTP methods.Takes priority over other method attributes.")
        .boolean("method-all-http")
        .alias("method-all-http", "H")
    .describe("method-get","Enable GET method.")
        .boolean("method-get")
    .describe("method-put","Enable PUT method.")
        .boolean("method-put")
    .describe("method-post","Enable POST method.")
        .boolean("method-post")
    .describe("method-delete","Enable DELETE method.")
        .boolean("method-delete")
    .describe("method-patch","Enable PATCH method.")
        .boolean("method-patch")
    .describe("method-trace","Enable TRACE method.")
        .boolean("method-trace")
    .describe("method-head","Enable HEAD method.")
        .boolean("method-head")
    .describe("websockets","Enable websockets.")
        .boolean("websockets")
        .alias("websockets","w")
var argv = yargs.argv;
if(argv.help){
    console.log(yargs.help())
    process.exit();
}

////
//Imports
////
var url = require('url');
var fs = require('fs');
var WS = require('ws').Server;
var mongodb = require('mongodb');
var q = require('q');
var express = require('express');
var rawbody = require('raw-body');
var jsonpatch = require('jsonpatch');

if(argv.version){
    console.log("0.5.8");
    process.exit();
}
var LOG = function(){};
if(argv.verbose){
    var LOG = console.log;
}


var isInt = function(value) {
  return !isNaN(value) &&
         parseInt(Number(value)) == value &&
         !isNaN(parseInt(value, 10));
}
var isSetTrue = function(value, alt){
    return String(value).toLowerCase() === "true" ? true
    : String(value).toLowerCase() === "false" ? false
    : alt || false;
}
var isSetFalse = function(value, alt){
    return String(value).toLowerCase() === "false" ? true
    : String(value).toLowerCase() !== "true" ? alt
    : false
}
////
//Options
////

//Set vars from .env file (if present)
if(argv["env"]){
    var envFile = issetTrue(argv["env"])
    ? __dirname + '/.env'
    : issetTrue(argv["env"]);
    try{
        require('node-env-file')(
            envFile,
            {overwrite: true, verbose :argv["verbose"]});
        LOG("Additional Environment Variables Loaded from: " + envFile);
    }catch(e){
        LOG("No Enviornemnt file (" + envFile + ") found.", e);
    };
}


var socketMountPoint = "";
var router = express.Router();
var MongoClient = mongodb.MongoClient;
var ObjectID = mongodb.ObjectID;
var Binary = mongodb.Binary;
var db;
var dbcollection;
var channels = {
    listen : {},
    subscribe : {}
};
//Set options based on environmental variables
var OPTIONS = {
    PORT : argv.port || process.env.PORT || 8080,
    BASE_TYPE : argv["base-type"] || process.env.BASE_TYPE || "application/octet-stream",
    CHARSET : argv["charset"] || process.env.CHARSET || "utf-8",
    BODY_LIMIT : argv["body-limit"] || process.env.BODY_LIMIT || "16mb",
    COLLECTION_NAME : argv["collection-name"] || process.env.COLLECTION_NAME || "_",
    STATIC : isSetTrue(argv["static"]) ? true
            : isSetTrue(process.env.STATIC) ? true
            : String(process.env.STATIC).toLowerCase() === "override"  ? "override"
            : String(argv["static"]).toLowerCase() === "override"  ? "override"
            : false,
    UNSAFE_GET : isSetTrue(argv["unsafe-get"])
        || isSetTrue(process.env.UNSAFE_GET)
        || false,
    CAPTURE_HEADERS : isSetTrue(argv["capture-headers"])
        || isSetTrue(process.env.CAPTURE_HEADERS)
        || false,
    HTTP_QUEUE : isSetTrue(argv["http-queue"])
        || isSetTrue(process.env.HTTP_QUEUE)
        || false,
    ALLOW_SET_DATE : isSetTrue(argv["allow-set-date"])
        || isSetTrue(process.env.ALLOW_SET_DATE)
        || false,
    PEEK : isSetFalse(argv["peek"], isSetFalse(process.env.PEEK, true)),
    METHOD_ALL_HTTP :
        isSetFalse(
            argv["method-all-http"],
            isSetFalse(process.env.METHOD_ALL_HTTP, true)),
    METHOD_GET : isSetFalse(
            argv["method-get"],
            isSetFalse(process.env.METHOD_GET, true)),
    METHOD_PUT : isSetFalse(
            argv["method-put"],
            isSetFalse(process.env.METHOD_PUT, true)),
    METHOD_POST: isSetFalse(
            argv["method-post"],
            isSetFalse(process.env.METHOD_POST, true)),
    METHOD_DELETE: isSetFalse(
            argv["method-delete"],
            isSetFalse(process.env.METHOD_DELETE, true)),
    METHOD_PATCH : isSetFalse(
            argv["method-patch"],
            isSetFalse(process.env.METHOD_PATCH, true)),
    METHOD_TRACE : isSetFalse(
            argv["method-trace"],
            isSetFalse(process.env.METHOD_TRACE, true)),
    METHOD_HEAD : isSetFalse(
            argv["method-get"],
            isSetFalse(process.env.METHOD_GET, true)),
    WEBSOCKETS : isSetFalse(
            argv["websockets"],
            isSetFalse(process.env.WEBSOCKETS, true)),
    DB_URL : (argv["db-url"] || process.env.DB_URL)
        || (argv["db-protocol"]
            || process.env.DB_PROTOCOL
            || "mongodb") + "://"
        + (argv["db-user"] || process.env.DB_USER || "")
        + ((argv["db-pass"] || process.env.DB_PASS) ?
            (":" + (argv["db-pass"] || process.env.DB_PASS)) : "")
        + ((argv["db-user"] || process.env.DB_USER) ? "@" : "")
        + (argv["db-host"] || process.env.DB_HOST || "127.0.0.1") +":"
        + (argv["db-port"] || process.env.DB_PORT || 27017) + "/"
        + (argv["db-name"] || process.env.DB_NAME || "http-store")
}
////
//Application
////
var server;
var setOptions = function(opts, first){
    var diff = {};
    if(opts.BASE_TYPE !== undefined){
        diff.BASE_TYPE = {
            old : OPTIONS.BASE_TYPE,
            new : String(opts.BASE_TYPE)
        }
        OPTIONS.BASE_TYPE = diff.BASE_TYPE.new
    }
    if(opts.CHARSET !== undefined){
        diff.CHARSET = {
            old : OPTIONS.CHARSET,
            new : String(opts.CHARSET)
        }
        OPTIONS.CHARSET = diff.CHARSET.new;
    }
    if(opts.BODY_LIMIT !== undefined || !OPTIONS.BODY_LIMIT){
        diff.BODY_LIMIT = {
            old : OPTIONS.BODY_LIMIT,
            new : String(opts.BODY_LIMIT || "16mb")
        }
        OPTIONS.BODY_LIMIT = diff.BODY_LIMIT.new
    }
    if(opts.COLLECTION_NAME !== undefined || !OPTIONS.COLLECTION_NAME){
        diff.COLLECTION_NAME = {
            old : OPTIONS.COLLECTION_NAME,
            new : String(opts.COLLECTION_NAME || "_")
        }
        dbcollection = db.collection(diff.COLLECTION_NAME.new);
        OPTIONS.COLLECTION_NAME = diff.COLLECTION_NAME.new;
    }
    if(opts.UNSAFE_GET !== undefined){
        diff.UNSAFE_GET = {
            old : OPTIONS.UNSAFE_GET,
            new : !!opts.UNSAFE_GET
        }
        OPTIONS.UNSAFE_GET = diff.UNSAFE_GET.new;
    }
    if(opts.CAPTURE_HEADERS !== undefined){
        diff.CAPTURE_HEADERS = {
            old : OPTIONS.CAPTURE_HEADERS,
            new : !!opts.CAPTURE_HEADERS
        }
        OPTIONS.CAPTURE_HEADERS = diff.CAPTURE_HEADERS.new;
    }
    if(opts.HTTP_QUEUE !== undefined){
        diff.HTTP_QUEUE = {
            old : OPTIONS.HTTP_QUEUE,
            new : !!opts.HTTP_QUEUE
        }
        OPTIONS.HTTP_QUEUE = diff.HTTP_QUEUE.new;
    }
    if(opts.ALLOW_SET_DATE !== undefined){
        diff.ALLOW_SET_DATE = {
            old : OPTIONS.ALLOW_SET_DATE,
            new : !!opts.ALLOW_SET_DATE
        }
        OPTIONS.ALLOW_SET_DATE = diff.ALLOW_SET_DATE.new;
    }
    if(opts.PEEK !== undefined){
        diff.PEEK = {
            old : OPTIONS.PEEK,
            new : !!opts.PEEK
        }
        OPTIONS.PEEK = diff.PEEK.new;
    }
    if(opts.WEBSOCKETS !== undefined){
        diff.WEBSOCKETS = {
            old : OPTIONS.WEBSOCKETS,
            new : !!opts.WEBSOCKETS
        }
        OPTIONS.WEBSOCKETS = diff.WEBSOCKETS.new;
    }
    if(first){
        diff.METHOD_ALL_HTTP = {
            new : !!opts.METHOD_ALL_HTTP
        }
        OPTIONS.METHOD_ALL_HTTP = diff.METHOD_ALL_HTTP.new;

        diff.METHOD_GET = {
            new : !!opts.METHOD_GET
        }
        OPTIONS.METHOD_GET = diff.METHOD_GET.new;

        diff.METHOD_PUT = {
            new : !!opts.METHOD_PUT
        }
        OPTIONS.METHOD_PUT = diff.METHOD_PUT.new;

        diff.METHOD_POST = {
            new : !!opts.METHOD_POST
        }
        OPTIONS.METHOD_POST = diff.METHOD_POST.new;

        diff.METHOD_DELETE = {
            new : !!opts.METHOD_DELETE
        }
        OPTIONS.METHOD_DELETE = diff.METHOD_DELETE.new;

        diff.METHOD_PATCH = {
            new : !!opts.METHOD_PATCH
        }
        OPTIONS.METHOD_PATCH = diff.METHOD_PATCH.new;

        diff.METHOD_TRACE = {
            new : !!opts.METHOD_TRACE
        }
        OPTIONS.METHOD_TRACE = diff.METHOD_TRACE.new;

        diff.METHOD_HEAD = {
            new : !!opts.METHOD_HEAD
        }
        OPTIONS.METHOD_HEAD = diff.METHOD_HEAD.new;
    }
    if(!first){
        LOG("OPTIONS:")
        for(o in diff){
            LOG(o, diff[o]);
        }
    }
    return q(diff);
}

var removeAllPromise = function (key){
    var d = q.defer();
    var callback = function(error, result){
        if(error) d.reject(error);
        else d.resolve(result);
    }
    dbcollection.remove(
        { key : key } ,
        true,
        callback
    )
    return d.promise;
}

var removeOnePromise = function (id){
    var d = q.defer();
    var callback = function(error, result){
        if(error){
            d.reject(error);
            LOG("DELETE FAILURE:", error)
        }
        else{
            d.resolve(result);
            LOG("DELETE", id)
        }
    }
    dbcollection.remove(
        { _id : new ObjectID(id) } ,
        false,
        callback
    )
    return d.promise;
}

var getPromise = function (key, order, index, remove, skip){
    var d = q.defer();
    var callback = function(error, result){
        if(error) d.reject(error);
        if(result) result.toArray(function(error, result){
            if(error) d.reject(error);
            if(!result.length) d.reject(result);
            result = result[0];
            if(result && result.binary && result.binary.buffer){
                result.value = result.binary.buffer;
            }
            if(!remove || !result || !result._id) {
                if(!result || !result._id){
                    d.reject(result);
                    return;
                }
                pushUpdate(key,
                    result, skip);
                d.resolve(result);
                return;
            }
            removeOnePromise(result._id)
                .then(function(){
                    pushUpdate(key,
                    result, skip);
                    d.resolve(result);

                }).fail(function(){
                    pushUpdate(key,
                        result, skip);
                    d.resolve(result);
                })
            return;
        })
    }
    dbcollection.find(
        { $query:
            { key : key},
          $orderby:
            { date : order }},
        {headers : false},
        { limit : 1 , skip : index},
        callback
    )
    return d.promise;
}
var getEmptyPromise = function (key, order, index){
    var d = q.defer();
    var callback = function(error, result){
        if(error) d.reject(error);
        if(result) result.toArray(function(error, result){
            if(error || !result) d.reject(error);
            if(result && !result.length){
                d.reject(result);
                return;
            }
            result = result[0];
            d.resolve(result);
        })
    }
    dbcollection.find(
        { $query:
            { key : key},
          $orderby:
            { date : order }},
        {value:false, headers:false},
        { limit : 1 , skip : index},
        callback
    )
    return d.promise;
}

var insertPromise = function(obj, binary){
    var d = q.defer();
    if(binary) {
        obj.binary = Binary(obj.value);
        delete obj.value;
    };
    var callback = function(error, result){
        if(error) d.reject(error);
        else d.resolve(result);
        insertUpdate(obj.key);
    }
    dbcollection.insert(
        obj,
        callback
    )
    return d.promise;
}

////
//Socket
////
var onChannel = function(channelName, key, socket){
    var chan = channels[channelName][key];
    if(!chan) return false;
    if(!chan.length) return false;
    var index = chan.indexOf(socket);
    if(index === -1) return false;
    return chan;
}

//Returns true if succesully added
var addToChannel = function(channelName, key, socket){
    var chan = onChannel(channelName, key, socket);
    if(chan){
        return false;
    }
    chan =
    channels[channelName][key] =
    channels[channelName][key] || []
    channels[channelName][key].push(socket);
    return chan;
};

//Returns true if successfully removed
var removeFromChannel = function(channelName, key, socket){
    var chan = onChannel(channelName, key, socket);
    if(chan){
        chan.splice(chan.indexOf(socket), 1);
        if(chan.length < 1){
            delete channels[channelName][key];
        }
        return true;
    }
    return chan;
};

//returns true if on channel
var toggleChannel = function(channelName, key, socket){
    if(onChannel(channelName, key, socket)){
        return !removeFromChannel(channelName, key, socket);
    }else{
        return addToChannel(channelName, key, socket)
    }
}

var removeFromAllChannels = function(socket){
    for(channelName in channels){
        for(key in channels[channelName]){
            removeFromChannel(channelName, key, socket);
        }
    }
}

var insertUpdate = function(key, id){
    var sockets = channels.listen[key] || [];
    sockets.forEach(function(socket){
        socket.send();
    })
}
var pushUpdate = function(key, obj, skip){
    var sockets = channels.subscribe[key] || [];
    if(skip) sockets.forEach(function(socket){
        if(socket !== skip){
            if(socket.att.full){
                socket.send(JSON.stringify(obj));
            }else{
                socket.send(obj.value)
            }
        }
    })
}

var placeOnChannel = function(key, message, type, binary){
    //if(type.indexOf("application/json") === -1) message = JSON.parse(message);
    var obj = {
        key : key,
        value : message,
        date : OPTIONS.ALLOW_SET_DATE ? headers["date"]
        || Date.now() : Date.now(),
        type: type,
    }
    return insertPromise(obj, binary);
}

var socketConnection = function(socket) {
    LOG("SOCKET CONNECTED", socket.readyState);
    socket.on("close", function(reason){
        LOG("SOCKET CLOSED", socket._closeCode, socket._closeMessage);
        removeFromAllChannels(socket);
    })
    var path = url.parse(socket.upgradeReq.url, true, true);
    var key = path.pathname.substr(1);
    if(key.indexOf(socketMountPoint) === 0){
        key = key.substr(socketMountPoint.length)
    }else if(socketMountPoint !== "/"){
        key = "_";
    }/*
    if(!key){
        socket.send("Please connect using " + socketMountPoint + ":key");
        socket.close();
        return;
    }*/

    var query = path.query;
    socket.att = {};
    socket.att.queue = isSetTrue(query.queue);//?queue=
    socket.att.peek = isSetTrue(query.peek) && OPTIONS.PEEK;//?peek=
    socket.att.full = isSetTrue(query.full);//?full=
    socket.att.binary = isSetTrue(query.binary);//?binary=
    socket.att.public = isSetTrue(query.public);//?public=
    socket.att.type = query.type || "";//?type=
    if(isSetTrue(query.listen)){
        addToChannel("listen", key, socket);
    }
    if(isSetTrue(query.subscribe)){
        addToChannel("subscribe", key, socket);
    }
    if(query.enqueue !== undefined){
        placeOnChannel(
            key, query.enqueue, socket.att.type, socket.att.binary)
            .then(function(result){
                LOG("PUT", result[0]);
            })
    }

    socket.on("message", function(message){
        message = message || "";
        if(socket.att.queue){
            placeOnChannel(
                key, message, socket.att.type, socket.att.binary)
                .then(function(result){
                    LOG("PUT", result[0]);
                })
            return;
        }
        message = message.split(" ");
        var command = message.shift();
        switch(command){
            //Sending
            case "enqueue":
                //Add item to queue with the set encoding and type
                //enqueue <object>
                message = message.join(" ");
                var p = placeOnChannel(
                    key, message, socket.att.type, socket.att.binary);
                    p.then(function(result){
                        LOG("PUT", result[0]);
                    })
                break;
            case "binary":
                //Set Enqueue Encoding
                //binary <boolean>
                socket.att.binary = isSetTrue(message[0], !socket.att.binary);
                socket.send(socket.att.binary ? "+binary" : "-binary");
                break;
            case "type":
                //Set Enqueue Type
                //type <type>
                socket.att.type = message[0];
                socket.send("type " + socket.att.type);
                break;
            case "queue":
                //Converts sockets such that all further messages will
                //be enqueued and commands will not be separated.
                //messages
                //queue <binary> <type>)
                //all further messages will be enqueued
                socket.att.queue = true;
                socket.att.binary = isSetTrue(message[0], socket.att.binary);
                socket.att.type = message[1] ? message[1] :  socket.att.type;
                socket.send(
                    "+queue"
                    + " " + (socket.att.binary ? "+binary" : "-binary")
                    + " " + socket.att.type);
                break;
            //Receiving
            case "dequeue":
            case "pop":
                //Remove Item From of Queue/Stack
                //dedueue/pop <peek=false> <full=false> <index=0>
                var index = isInt(message[0]) ? Number(message[0]) : 0;
                var p = isSetTrue(message[1], socket.att.peek);
                var f = isSetTrue(message[2], socket.att.full);
                var pub = isSetTrue(message[3], socket.att.public);
                var order = command === "dequeue" ? 1 : -1;
                getPromise(key, order, index, !p,
                    pub ? socket : undefined).then(function(result){

                        if(f){
                            socket.send(JSON.stringify(result));
                        }else{
                            socket.send(result.value);
                        }
                    })
                break;
            case "peek":
                var p = message[0];
                if(isSetTrue(p)) socket.att.peek = true;
                else if(isSetFalse(p)) socket.att.peek = false;
                else socket.att.peek = !socket.att.peek;
                socket.att.peek = socket.att.peek && OPTIONS.PEEK;
                socket.send(socket.att.peek ? "+peek" : "-peek");
                break;
            case "public":
                var p = message[0];
                if(isSetTrue(p)) socket.att.public = true;
                else if(isSetFalse(p)) socket.att.public = false;
                else socket.att.public = !socket.att.public;
                socket.send(socket.att.public ? "+public" : "-public");
                break;
            case "full":
                var f = message[0];
                if(isSetTrue(f)) socket.att.full = true;
                else if(isSetFalse(f)) socket.att.full = false;
                else socket.att.full = !socket.att.full;
                socket.send(socket.att.full ? "+full" : "-full");
                break;
            //Channels
            case "listen":
                var sub = message[0]
                    if(isSetTrue(sub)){
                        addToChannel("listen", key, socket);
                        sub = true;
                    }
                    else if(isSetFalse(sub)){
                        removeFromChannel("listen", key, socket);
                        sub = false;
                    }
                    else
                        sub =
                        toggleChannel("listen", key, socket);
                socket.send(sub ? "+listen" : "-listen");
                break;
            case "subscribe":
                var sub = message[0]
                    if(isSetTrue(sub)){
                        addToChannel("subscribe", key, socket);
                        sub = true;
                    }
                    else if(isSetFalse(sub)){
                        removeFromChannel("subscribe", key, socket);
                        sub = false;
                    }
                    else
                        sub =
                        toggleChannel("subscribe", key, socket);
                socket.send(sub ? "+subscribe" : "-subscribe");
                break;
        }
    })
}

////
//Helpers
////

var render = function(response, obj, status, key){
    if(status === 404 && OPTIONS.STATIC){
        var path = __dirname + "/static/" + key;
        fs.exists(path + "/index.html", function(yes){
            if(yes){
                response.sendFile(path + "/index.html");
                LOG("RENDER", "static");
            }else{
                fs.exists(path, function(yes){
                    if(yes){
                        response.sendFile(path);
                        LOG("RENDER", "static");
                    }else{
                        response.status(status).end();
                        LOG("RENDER", "null");
                    }
                });
            }
        })
    }else if (status === 404){
        response.status(status).end();
        LOG("RENDER", "null");
    }else{
        response.status(status || 200);
        if(obj._id) response.setHeader("ETag", obj._id);
        if(obj.date) response.setHeader("Last-Modified", obj.date);
        if(obj.type) response.setHeader("Content-Type", obj.type);
        response.send(obj.value);
        LOG("RENDER", obj);
    }
}

////
//Application Middleware
////

var rawBody = function(request, response, next){
    var contentType =  (request.headers["content-type"] || "")
    .split(" ").join("").split(";");
    request.BASE_TYPE = contentType[0] || OPTIONS.BASE_TYPE;
    request.encoding = ((contentType[1] || "").split("charset=")[1] || "").toLowerCase()
        || OPTIONS.CHARSET;
    rawbody(request, {
        length: request.length,
        limit: OPTIONS.BODY_LIMIT || undefined,
        encoding: request.encoding !== "binary" ? request.encoding : null
    },function(error, body){
        request.raw = body;
        next();
    })
}

////
//Application Middleware:Routing
////

var getFunc = function(request, response){
    var key = request.params.key || "_";
    if(request.params[0]) key += request.params[0];
    var obj = {
        key : key,
        date : OPTIONS.ALLOW_SET_DATE ? headers["date"]
        || Date.now() : Date.now(),
        type : request.headers["content-type"]
    };
    var index = isInt(request.query.index) ? Number(request.query.index) : 0;

    var order;
    var remove;
    var respond;
    if(OPTIONS.HTTP_QUEUE){
        order = isSetTrue(request.query.pop) ? -1 : 1;
        remove =
            (request.method === "DELETE"
            || (OPTIONS.UNSAFE_GET && isSetTrue(request.query.dequeue)))
            && (request.method !== "HEAD");
    }else{//Default
        order = isSetTrue(request.query.dequeue) ? 1 : -1;
        remove =
            (request.method === "DELETE"
            || (OPTIONS.UNSAFE_GET && isSetTrue(request.query.pop)))
            && (request.method !== "HEAD");
    }
    if(!OPTIONS.PEEK
         && OPTIONS.UNSAFE_GET
         && request.method === "GET") remove = true;
    respond = request.method === "GET"
        || request.method === "HEAD"
        || isSetTrue(request.query.pop)
        || isInt(request.query.index)
        || isSetTrue(request.query.dequeue);
    var getObject = function(){
        return (request.method !== "HEAD"  ? getPromise : getEmptyPromise )
        (key, order, index)
            .then(function(result){
                LOG("GET", result);
                return q(result);
            }).fail(function(e){
                LOG("GET FAILURE", e);
                return q();
            })
    }
    var deleteObject = function(result){
        if(result) return removeOnePromise(result._id)
            .then(function(deleted){
                return q(result);
            }).fail(function(e){
                return q(result);
            })
        return q(result);
    }
    var renderObject = function(result){
        if(result){
            obj.value = result.value;
            obj._id = result._id;
            obj.type = result.type;
            obj.date = result.date;
            render(response, obj, 200, key);
        }else{
            render(response, obj, 404, key);
        }
    }
    if(respond){
        if(remove){
            getObject()
            .then(deleteObject)
            .then(renderObject)
            .fail(renderObject)
        }else{
            getObject()
            .then(renderObject)
            .fail(renderObject)
        }
    }else{
        removeAllPromise(key)
            .then(function(result){
                delete obj.type;
                delete obj.value;
                delete obj._id;
                render(response, obj, result? 410 : 404);
            })
    }
}



var putFunc = function(request, response){
    var key = request.params.key || "_";
    if(request.params[0]) key += request.params[0];
    var obj = {
        key : key,
        value : request.raw,
        date : OPTIONS.ALLOW_SET_DATE ? headers["date"]
        || Date.now() : Date.now(),
        type : request.headers["content-type"]
    }
    if(OPTIONS.CAPTURE_HEADERS) obj.headers = request.headers;
    var remove = request.method === "POST" ?
        isSetFalse(request.query.enqueue) :
        !isSetTrue(request.query.enqueue);
    var deletePreviousObjects = function(){
        return removeAllPromise(key)
            .then(function(deleted){
                LOG("DELETE", key);
                return q();
            }).fail(function(e){
                LOG("DELETE FAILURE", e);
                return q([]);
            })
    }
    var createObject = function(){
        return insertPromise(obj, request.encoding === "binary")
            .then(function(result){
                LOG("PUT", result[0]);
                return q(result);
            }).fail(function(e){
                LOG("GET FAILURE", e);
                return q([]);
            })
    }
    var renderObject = function(result){
        result = result[0];
        obj._id = result._id;
        render(response, obj, 200, key);
    }
    if(remove){
        deletePreviousObjects()
        .then(createObject)
        .then(renderObject)
        .fail(renderObject);
    }else{
        createObject()
        .then(renderObject)
        .fail(renderObject);
    }
}

var traceFunc = function(request, response){
    var key = request.params.key;
    var obj = {
        date : OPTIONS.ALLOW_SET_DATE ? headers["date"]
        || Date.now() : Date.now(),
        value : request.encoding === "binary" ? Binary(request.raw) : request.raw,
        type : request.headers["content-type"]
    };
    render(response, obj, 200);
}
var patchable = [
"CHARSET",
"BODY_LIMIT",
"BASE_TYPE",
"STATIC",
"PEEK",
"UNSAFE_GET",
"CAPTURE_HEADERS",
"HTTP_QUEUE",
"ALLOW_SET_DATE",
"COLLECTION_NAME",
"WEBSOCKETS"
].map(function(item){return "/"+item;});

var patchFunc = function(request, response){
    var obj = {
        value : request.raw,
        date : Date.now(),
        type : "application/json"
    }
    try{
        var filter = JSON.parse(obj.value).filter(function(item){
            return patchable.indexOf(item.path) !== -1 && item.op === "replace";
        })
        var opts = jsonpatch.apply_patch(OPTIONS, filter)
        setOptions(opts)
            .then(function(options){
                obj.value = options;
                render(response, obj, 200);
            })
    }catch(e){
        obj.value = e;
        render(response, obj, 400);
    }
}


var initDB = function(options){
    var d = q.defer();
    MongoClient.connect(
        options.DB_URL,
        function(error, database){
            if(error){
                d.reject(new Error(error))
                return;
            }
            LOG("Database Connected");
            db = database;
            d.resolve(options);
        }
    )
    return d.promise;
}
var initRoutes = function(options){
    var d = q.defer();
    app.use(rawBody);
    if(OPTIONS.METHOD_ALL_HTTP){
        if(OPTIONS.METHOD_DELETE) router.delete("/:key*", getFunc);
        if(OPTIONS.METHOD_GET) router.get("/:key*", getFunc);
        if(OPTIONS.METHOD_HEAD) router.head("/:key*", getFunc);
        if(OPTIONS.METHOD_PUT) router.put("/:key*", putFunc);
        if(OPTIONS.METHOD_POST) router.post("/:key*", putFunc);
        if(OPTIONS.METHOD_TRACE) router.trace("/:key*", traceFunc);
        if(OPTIONS.METHOD_PATCH) router.patch("/", patchFunc);
    }
    if(OPTIONS.STATIC === "override")
        app.use(express.static(__dirname + "/static"));
    app.use('/', router);
    if(OPTIONS.STATIC) app.use(express.static(__dirname + "/static"));
    return q(OPTIONS)
}
var unroute = function(router, path){

}

var wss;
var mountSocket = function(server, mountPoint){
    wss = new WS({ server: server});
    socketMountPoint =
    (mountPoint || "")
    .split("/")
    .filter(function(item){return !!item})
    .join("/") + "/";
    wss.on('connection', socketConnection);
}
var unmountSocket = function(){
    if(wss) wss._server = undefined;
}

var app = express();
var main = module.exports = function(options){
    initDB(OPTIONS = options || OPTIONS)
    .then(function(options){
        if(require.main === module){
            server = app.listen(options.PORT);
            if(OPTIONS.WEBSOCKETS)
                mountSocket(server);
            LOG("http store started");
            LOG("__________________");
        }
        return setOptions(options, true);
    })
    .then(initRoutes)
    .then(function(options){
        for(o in OPTIONS){
            LOG(o, OPTIONS[o]);
        }
        LOG("__________________");
        LOG("(Control-C to quit)");
    }).fail(function(error){
        LOG("Error Logging In: " + error)
        throw(new Error(error));
    })
    return app;
};
var exitHandler = function(options, error){
    LOG("\n__________________");
    LOG("http store stopped");
    process.exit();
}
process.on("SIGINT", exitHandler);
app.mountSocket = mountSocket;
app.unmountSocket = unmountSocket;
if(require.main === module){
    main(OPTIONS)
}else{
}
