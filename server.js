#!/usr/bin/env node

////
//Initial Command Line Stuff
////
var argv = require('yargs')
    .alias("v","verbose")
    .alias("p","port")
    .boolean("verbose")
    .default("verbose", false)
    .default("static")
    .boolean("unsafe-get")
    .default("unsafe-get", false)
    .boolean("peek")
    .default("peek", true)
    .boolean("capture-headers")
    .default("capture-headers", false)
    .boolean("enable-env-file")
    .default("enable-env-file", true)
    .alias("e","enable-env-file")
    .alias("f","env-file")
    .argv
var LOG = argv.verbose ? console.log : function(){};
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
////
//Options
////

//Set vars from .env file (if present)
if(argv["enable-env-file"]){
    var envFile = (argv["env-file"]) || __dirname + '/.env';
    try{
        require('node-env-file')(envFile);
        LOG("Additional Environment Variables Loaded from: ", envFile);
    }catch(e){
        LOG("No Enviornemnt file ("+envFile+") found.", e);
    };
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

var router = express.Router();
var MongoClient = mongodb.MongoClient;
var ObjectID = mongodb.ObjectID;
var Binary = mongodb.Binary;
var wss;
var db;
var app = express();
var channels = {
    subscribe : {}
};

//Set options based on environmental variables
var OPTIONS = {
    PORT : argv.port || process.env.PORT || 8080,
    BASETYPE : argv.basetype || process.env.CHARSET | "text/plain",
    CHARSET : argv.charset || process.env.CHARSET || "utf-8",
    BODYLIMIT : argv.bodylimit || process.env.BODYLIMIT || "16mb",
    STATIC : isSetTrue(argv["static"]) ? true
            : String(argv["static"]).toLowerCase() === "override"  ? "override"
            : false,
    PEEK : isSetFalse(argv["peek"]) ? false
            : isSetFalse(process.env.PEEK) ? false
            : "true",
    UNSAFEGET : isSetTrue(argv["unsafe-get"])
        || isSetTrue(process.env.UNSAFEGET)
        || false,
    CAPTUREHEADERS : isSetTrue(argv["capture-headers"])
        || isSetTrue(process.env.CAPTUREHEADERS)
        || false,
    MONGOURL : argv.mongourl
        || (argv.mongourl || process.env.MONGOURL)
        || (argv.mongoprotocol
            || process.env.MONGOPROTOCOL
            || "mongodb") + "://"
        + (argv.mongouser || process.env.MONGOUSER || "") + ":"
        + (argv.mongopass || process.env.MONGOPASS || "") + "@"
        + (argv.mongohost || process.env.MONGOHOST || "127.0.0.1") +":"
        + (argv.mongoport || process.env.MONGOPORT || 27017) + "/"
        + (argv.mongobase || process.env.MONGOBASE || "")
}
////
//Application
////

var setOptions = function(opts, first){
    var diff = {};
    if(opts.BASETYPE !== undefined){
        diff.BASETYPE = {
            old : OPTIONS.BASETYPE,
            new : String(opts.BASETYPE)
        }
        OPTIONS.BASETYPE = diff.BASETYPE.new
    }
    if(opts.CHARSET !== undefined){
        diff.CHARSET = {
            old : OPTIONS.CHARSET,
            new : String(opts.CHARSET)
        }
        OPTIONS.CHARSET = diff.CHARSET.new;
    }
    if(opts.BODYLIMIT !== undefined){
        diff.BODYLIMIT = {
            old : OPTIONS.BODYLIMIT,
            new : String(opts.BODYLIMIT)
        }
        OPTIONS.BODYLIMIT = diff.BODYLIMIT.new
    }
    if(opts.UNSAFEGET !== undefined){
        diff.UNSAFEGET = {
            old : OPTIONS.UNSAFEGET,
            new : !!opts.UNSAFEGET
        }
        OPTIONS.UNSAFEGET = diff.UNSAFEGET.new;
    }
    if(opts.PEEK !== undefined){
        diff.PEEK = {
            old : OPTIONS.PEEK,
            new : !!opts.PEEK
        }
        OPTIONS.PEEK = diff.PEEK.new;
    }
    if(opts.CAPTUREHEADERS !== undefined){
        diff.CAPTUREHEADERS = {
            old : OPTIONS.CAPTUREHEADERS,
            new : !!opts.CAPTUREHEADERS
        }
        OPTIONS.CAPTUREHEADERS = diff.CAPTUREHEADERS.new;
    }
    if(!first){
        LOG("OPTIONS", diff)
    }
    return diff;
}

var removeAllPromise = function (collection, key){
    var d = q.defer();
    var callback = function(error, result){
        if(error) d.reject(error);
        else d.resolve(result);
    }
    collection.remove(
        { key : key } ,
        true,
        callback
    )
    return d.promise;
}

var removeOnePromise = function (collection, id){
    var d = q.defer();
    var callback = function(error, result){
        if(error) d.reject(error);
        else d.resolve(result);
    }
    collection.remove(
        { _id : new ObjectID(id) } ,
        false,
        callback
    )
    return d.promise;
}

var getPromise = function (collection, key, order, index, remove){
    var d = q.defer();
    var callback = function(error, result){
        if(error) d.reject(error);
        if(result) result.toArray(function(error, result){
            if(error) d.reject(error);
            if(!result.length) d.reject(result);
            result = result[0];
            if(!remove || !result || !result._id) {
                if(!result || !result._id){
                    d.reject(result);
                    return;
                }
                d.resolve(result);
                return;
            }
            removeOnePromise(collection, result._id)
                .then(function(){
                    d.resolve(result);
                }).fail(function(){
                    d.resolve(result);
                })
        })
    }
    collection.find(
        { $query:
            { key : key},
          $orderby:
            { time : order }},
        {headers:false},
        { limit : 1 , skip : index},
        callback
    )
    return d.promise;
}
var getEmptyPromise = function (collection, key, order, index){
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
    collection.find(
        { $query:
            { key : key},
          $orderby:
            { time : order }},
        {value:false, headers:false},
        { limit : 1 , skip : index},
        callback
    )
    return d.promise;
}

var insertPromise = function(collection, obj){
    var d = q.defer();
    var callback = function(error, result){
        if(error) d.reject(error);
        else d.resolve(result);
        insertUpdate(collection.collectionName + "/" + obj.key);
    }
    collection.insert(
        obj,
        callback
    )
    return d.promise;
}

////
//Socket
////
var onChannel = function(channelName, collectionkey, socket){
    var chan = channels[channelName][collectionkey];
    if(!chan) return false;
    if(!chan.length) return false;
    var index = chan.indexOf(socket);
    if(index === -1) return false;
    return chan;
}

//Returns true if succesully added
var addToChannel = function(channelName, collectionkey, socket){
    var chan = onChannel(channelName, collectionkey, socket);
    if(chan){
        return false;
    }
    chan =
    channels[channelName][collectionkey] =
    channels[channelName][collectionkey] || []
    channels[channelName][collectionkey].push(socket);
    return chan;
};

//Returns true if successfully removed
var removeFromChannel = function(channelName, collectionkey, socket){
    var chan = onChannel(channelName, collectionkey, socket);
    if(chan){
        chan.splice(chan.indexOf(socket), 1);
        if(chan.length < 1){
            delete channels[channelName][collectionkey];
        }
        return true;
    }
    return chan;
};

//returns true if on channel
var toggleChannel = function(channelName, collectionkey, socket){
    if(onChannel(channelName, collectionkey, socket)){
        return !removeFromChannel(channelName, collectionkey, socket);
    }else{
        return addToChannel(channelName, collectionkey, socket)
    }
}

var removeFromAllChannels = function(socket){
    for(channelName in channels){
        for(collectionkey in channels[channelName]){//collectionkey = "a/b"
            removeFromChannel(channelName, collectionkey, socket);
        }
    }
}

var insertUpdate = function(collectionkey, id){
    var sockets = channels.subscribe[collectionkey] || [];
    sockets.forEach(function(socket){
        socket.send();
    })
}
var placeOnChannel = function(collection, key, message, type, binary){
    var obj = {
        key : key,
        value : binary? Binary(message) : message,
        time : Number(Date.now()),
        type: type,
    }
    return insertPromise(collection, obj);
}

var socketConnection = function(socket) {
    var path = url.parse(socket.upgradeReq.url, true, true);
    var collectionkey = path.pathname;
    var pathname = collectionkey.split("/");
    pathname.shift();
    var collectionName = pathname.shift();
    var key = pathname.join("/");
    if(!(collectionName && key)){
        socket.send("Please connect using /:collection/:key");
        socket.close();
        return;
    }
    collectionkey = collectionName + "/" + key;
    var query = path.query;
    var queue = isSetTrue(query.queue);//?queue=
    var peek = isSetTrue(query.peek) && OPTIONS.PEEK;//?peek=
    var full = isSetTrue(query.full);//?full=
    var binary = isSetTrue(query.binary);//?binary=
    var type = query.type || "";//?type=
    if(isSetTrue(query.subscribe)){
        addToChannel("subscribe", collectionkey, socket);
    }
    if(query.enqueue !== undefined){
        placeOnChannel(
            db.collection(collectionName),
            key, query.enqueue, type, binary)
            .then(function(result){
                LOG("PUT", result[0]);
            })
    }
    socket.on("close", function(reason){
        LOG("SOCKET CLOSED", socket._closeCode, socket._closeMessage);
        removeFromAllChannels(socket);
    })
    socket.on("message", function(message){
        message = message || "";
        if(queue){
            placeOnChannel(
                db.collection(collectionName),
                key, message, type, binary)
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
                    db.collection(collectionName),
                    key, message, type, binary);
                    p.then(function(result){
                        LOG("PUT", result[0]);
                    })
                break;
            case "binary":
                //Set Enqueue Encoding
                //binary <boolean>
                binary = isSetTrue(message[0], !binary);
                socket.send(binary ? "+binary" : "-binary");
                break;
            case "type":
                //Set Enqueue Type
                //type <type>
                type = message[0];
                socket.send(type);
                break;
            case "queue":
                //Converts sockets such that all further messages will
                //be enqueued and commands will not be separated.
                //messages
                //queue <binary> <type>)
                //all further messages will be enqueued
                queue = true;
                binary = isSetTrue(message[0], binary);
                type = message[1] || type;
                socket.send(
                    "+queue "
                    + (binary ? "+binary" : "-binary")
                    + " " + type);
                break;
            //Receiving
            case "dequeue":
            case "pop":
                //Remove Item From of Queue/Stack
                //dedueue/pop <peek=false> <full=false> <index=0>
                var index = isInt(message[0]) ? Number(message[0]) : 0;
                var p = isSetTrue(message[1], peek);
                var f = isSetTrue(message[2], full);
                var order = command === "dequeue" ? 1 : -1;
                getPromise(db.collection(collectionName),
                    key, order, index, !p).then(function(result){
                        if(result.value && result.value.buffer){
                            result.value = result.value.buffer;
                        }
                        if(f){
                            socket.send(JSON.stringify(result));
                        }else{
                            socket.send(result.value)
                        }
                    })
                break;
            case "peek":
                //Set Dequeue/Pop peek
                //peek peek <boolean = true>
                var p = message[0];
                if(isSetTrue(p)) peek = true;
                else if(isSetFalse(p)) peek = false;
                else peek = !peek;
                peek = peek && OPTIONS.PEEK;
                socket.send(peek ? "+peek" : "-peek");
                break;
            case "full":
                //binary <boolean>
                //full peek <boolean = true>
                var f = message[0];
                if(isSetTrue(f)) full = true;
                else if(isSetFalse(f)) full = false;
                else full = !full;
                socket.send(full ? "+full" : "-full");
                break;
            case "subscribe":
                var sub = message[0]
                    if(isSetTrue(sub)){
                        addToChannel("subscribe", collectionkey, socket);
                        sub = true;
                    }
                    else if(isSetFalse(sub)){
                        removeFromChannel("subscribe", collectionkey, socket);
                        sub = false;
                    }
                    else
                        sub =
                        toggleChannel("subscribe", collectionkey, socket);
                socket.send(sub ? "+subscribe" : "-subscribe");
                break;
        }
    })
}

////
//Helpers
////

var render = function(response, obj, status, collectionName, key){
    if(status === 404 && OPTIONS.STATIC){
        var path = __dirname + "/static/" + collectionName + "/" + key;
        fs.exists(path + "/index.html", function(yes){
            if(yes){
                response.sendFile(path + "/index.html");
                LOG("RENDER", "static");
            }else{
                try{
                    response.sendFile(__dirname + "/static/" + collectionName);
                    LOG("RENDER", "static");
                }catch(e){
                    response.status(status).end();
                    LOG("RENDER", "null");
                }
            }
        })
    }else if (status === 404){
        response.status(status).end();
        LOG("RENDER", "null");
    }else{
        response.status(status || 200);
        if(obj._id) response.setHeader("ETag", obj._id);
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
    request.baseType = contentType[0] || OPTIONS.BASETYPE;
    request.encoding = ((contentType[1] || "").split("charset=")[1] || "").toLowerCase()
        || OPTIONS.CHARSET;
    rawbody(request, {
        length: request.length,
        limit: OPTIONS.BODYLIMIT || undefined,
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
    var collectionName = request.params.collectionName;
    var key = request.params.key;
    var collection = db.collection(collectionName);
    var obj = {
        key : key,
        time : Number(Date.now()),
        type : request.headers["content-type"]
    };
    var index = isInt(request.query.index) ? Number(request.query.index) : 0;
    var order = isSetTrue(request.query.pop) ? -1 : 1;

    var remove =
        (request.method === "DELETE"
        || (OPTIONS.UNSAFEGET && isSetTrue(request.query.dequeue)))
        && (request.method !== "HEAD");
        if(!OPTIONS.PEEK
             && OPTIONS.UNSAFEGET
             && request.method === "GET") remove = true;
    var respond = request.method === "GET"
        || request.method === "HEAD"
        || isSetTrue(request.query.dequeue)
        || (isInt(request.query.index))
        || (isSetTrue(request.query.pop));
    var getObject = function(){
        return (request.method !== "HEAD"  ? getPromise : getEmptyPromise )
        (collection, key, order, index)
            .then(function(result){
                LOG("GET", result);
                return q(result);
            }).fail(function(e){
                LOG("GET FAILURE", e);
                return q();
            })
    }
    var deleteObject = function(result){
        if(result) return removeOnePromise(collection, result._id)
            .then(function(deleted){
                LOG("DELETE", result._id);
                return q(result);
            }).fail(function(e){
                LOG("DELETE FAILURE", e);
                return q(result);
            })
        return q(result);
    }
    var renderObject = function(result){
        if(result){
            if(result.value && result.value.buffer){
                result.value = result.value.buffer;
            }
            obj.value = result.value;
            obj._id = result._id;
            obj.type = result.type;
            obj.time = result.time;
            render(response, obj, 200, collectionName, key);
        }else{
            render(response, obj, 404, collectionName, key)
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
        removeAllPromise(collection, key)
            .then(function(){
                render(response, obj, 410);
            })
    }
}



var putFunc = function(request, response){
    var collectionName = request.params.collectionName;
    var key = request.params.key;
    var collection = db.collection(collectionName);
    var obj = {
        key : key,
        value : request.encoding === "binary" ? Binary(request.raw) : request.raw,
        time : Number(Date.now()),
        type : request.headers["content-type"]
    }
    if(OPTIONS.CAPTUREHEADERS) obj.headers = request.headers;
    var remove = request.method === "POST" ?
        isSetTrue(request.query.enqueue) :
        !isSetFalse(request.query.enqueue);
    var deletePreviousObjects = function(){
        return removeAllPromise(collection, key)
            .then(function(deleted){
                LOG("DELETE", key);
                return q();
            }).fail(function(e){
                LOG("DELETE FAILURE", e);
                return q([]);
            })
    }
    var createObject = function(){
        return insertPromise(collection, obj)
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
        render(response, obj, 200, collectionName, key);
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
    var collectionName = request.params.collectionName;
    var key = request.params.key;
    var obj = {
        time : Number(Date.now()),
        value : request.encoding === "binary" ? Binary(request.raw) : request.raw,
        type : request.headers["content-type"]
    };
    render(response, obj, 200);
}


var patchFunc = function(request, response){
    var obj = {
        value : request.raw,
        time : Number(Date.now()),
        type : "application/json"
    }
    obj.value = setOptions(JSON.parse(obj.value));
    render(response, obj, 200);

}

app.use(rawBody);
router.delete("/:collectionName/:key", getFunc);
router.get("/:collectionName/:key", getFunc);
router.head("/:collectionName/:key", getFunc);
router.put("/:collectionName/:key", putFunc);
router.post("/:collectionName/:key", putFunc);
router.trace("/:collectionName/:key", traceFunc);
router.patch("/", patchFunc);
if(OPTIONS.STATIC === "override")
    app.use(express.static(__dirname + "/static"));
app.use('/', router);
if(OPTIONS.STATIC)
    app.use(express.static(__dirname + "/static"));

//Disconnect Mongo Client
MongoClient.connect(
    OPTIONS.MONGOURL,
    function(error, database){
        if(error){
            throw new Error(error);
        }
        db = database;
        LOG("Database Connected:");
        app.server = app.listen(OPTIONS.PORT);
        LOG("Application Listening:", OPTIONS.PORT);
        wss = new WS({server: app.server});
        wss.on('connection', socketConnection);
        LOG("Web Sockets Listening:", OPTIONS.PORT);
        setOptions(OPTIONS, true);
        LOG("CONFIG:");
        LOG(OPTIONS);
    }
)
