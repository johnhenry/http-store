var argv = require('yargs')
    .boolean("verbose")
    .alias("v","verbose")
    .alias("p","port").argv;
var LOG = argv.verbose ? console.log : function(){};
////
//Imports
////
var url = require('url');
var WS = require('ws').Server;
var mongodb = require('mongodb');
var q = require('q');
////
//Imports (Experimental, requires 0.11 --harmony flag)
////
var koa = require('koa');
var co = require('co');
var router = require('koa-route');
var getRawBody = require('raw-body');
////
//Options
////

//Set vars from .env file (if present)
try{
    require('node-env-file')(__dirname + '/.env');
    LOG("Additional Environemtal Variables Loaded from .env");
}catch(e){
    LOG("No Additional Enviornemnt file (./.env) found.");
};

var isInt = function(value) {
  return !isNaN(value) &&
         parseInt(Number(value)) == value &&
         !isNaN(parseInt(value, 10));
}
var isSetTrue = function(value){
    return String(value).toLowerCase() === "true";
}
var isSetFalse = function(value){
    return String(value).toLowerCase() === "false";
}
//Set options based on environmental variables
var OPTIONS = {
    PORT : argv.port || process.env.PORT || 8080,
    BASETYPE : argv.basetype || process.env.CHARSET | "text/plain",
    CHARSET : argv.charset || process.env.CHARSET || "utf-8",
    BODYLIMIT : argv.bodylimit || process.env.BODYLIMIT || "16mb",
    UNSAFEGET : argv.unsafeget || !!process.env.UNSAFEGET || false,
    CAPTUREHEADERS : argv.captureheaders
        || process.env.CAPTUREHEADERS || false,
    DEQUEUEINTERVAL : 5000,
    POPINTERVAL : 5000,
    MONGOURL: argv.mongourl
        || (argv.mongourl || process.env.MONGOURL)
        || (argv.mongoprotocol || process.env.MONGOPROTOCOL || "mongodb") + "://"
        + (argv.mongouser || process.env.MONGOUSER || "") + ":"
        + (argv.mongopass || process.env.MONGOPASS || "") + "@"
        + (argv.mongohost || process.env.MONGOHOST || "127.0.0.1") +":"
        + (argv.mongoport || process.env.MONGOPORT || 27017) + "/"
        + (argv.mongobase || process.env.MONGOBASE || "")
}

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
    if(opts.DEQUEUEINTERVAL !== undefined){
        diff.DEQUEUEINTERVAL = {
            old : OPTIONS.DEQUEUEINTERVAL,
            new : Number(opts.DEQUEUEINTERVAL)
        }
        OPTIONS.DEQUEUEINTERVAL = diff.DEQUEUEINTERVAL.new;
        if(OPTIONS.DEQUEUEINTERVAL){
            dequeueUpdate();
        }
    }
    if(opts.POPINTERVAL !== undefined){
        diff.POPINTERVAL = {
            old : OPTIONS.POPINTERVAL,
            new : Number(opts.POPINTERVAL)
        }
        OPTIONS.POPINTERVAL = diff.POPINTERVAL.new;
        if(OPTIONS.POPINTERVAL){
            popUpdate();
        }
    }
    if(!first){
        LOG("OPTIONS")
        LOG(diff);
    }
    return diff;
}

////
//Application
////
var MongoClient = mongodb.MongoClient;
var ObjectID = mongodb.ObjectID;
var Binary = mongodb.Binary;
var wss;
var db;
var app = koa();
var channels = {
    pop : {},
    dequeue : {},
    flag : {}
};

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
            if(!result.length) d.reject("");
            result = result[0];
            if(!remove || !result || !result._id) {
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
            if(error) d.reject(error);
            if(!result.length) d.reject("");
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
//Socket Helpers
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
    channels[channelName][collectionkey] = channels[channelName][collectionkey] || []
    channels[channelName][collectionkey].push(socket);
    return true;
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
    return false;
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

var updateChannels = function(order, remove){
    for(channelName in channels){
        if(channelName === "flag") break;
        for(collectionkey in channels[channelName]){
            var colAndKey = collectionkey.split("/");
            var collection = db.collection(colAndKey[0]);
            var orderedFuncs = [];
            channels[channelName][collectionkey]
            .forEach(function(socket){
                var used = [];
                return getPromise(
                    collection,
                    colAndKey[1],
                    order || 1,
                    0,
                    remove
                ).then(function(result){
                    if(used.indexOf(socket) === -1){
                        socket.send(result.value);
                        used.pusn(socket)
                    }else{

                    }
                }).fail(function(error){
                    //socket.send("FAIL")
                })
            })
        }
    }
}

var dequeueUpdate = function(){
    if(!OPTIONS.DEQUEUEINTERVAL) return;
    updateChannels(1, true);
    setTimeout(dequeueUpdate, OPTIONS.DEQUEUEINTERVAL);
}

var popUpdate = function(){
    if(!OPTIONS.POPINTERVAL) return;
    updateChannels(-1, true);
    setTimeout(popUpdate, OPTIONS.POPINTERVAL);
}
var insertUpdate = function(collectionkey, id){
    var sockets = channels.flag[collectionkey] || [];
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



////
//Database
////
var socketConnection = function(socket) {
    var path = url.parse(socket.upgradeReq.url, true, true);
    var collectionkey = path.pathname;
    var pathname = collectionkey.split("/");
    pathname.shift();
    var collectionName = pathname.shift();
    var key = pathname.join("/");
    if(!(collectionName && key)){
        socket.send("Please connection using /:collection/:key");
        socket.close();
        return;
    }
    collectionkey = collectionName + "/" + key;
    var query = path.query;
    var queue = isSetTrue(query.queue);
    var type = query.type;
    var binary = isSetTrue(query.binary);
    if(isSetTrue(query.autodequeue)){
        toggleChannel("dequeue", collectionkey, socket);
    }
    if(isSetTrue(query.autopop)){
        toggleChannel("pop", collectionkey, socket);
    }
    if(isSetTrue(query.autoflag)){
        toggleChannel("flag", collectionkey, socket);
    }
    socket.on("close", function(reason){
        LOG("SOCKET CLOSED", socket._closeCode, socket._closeMessage);a
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
            case "binary":
                //binary <boolean> <type>
                binary = isSetTrue(message[0]);
                socket.send(binary ? "binary" : "");
                break;
            case "type":
                //type <type>
                type = message[0];
                socket.send(type);
                break;
            case "queue":
                //Start queue - further messages will be enqueued
                //queue <type> <binary>
                queue = true;
                type = message[0];
                binary = isSetTrue(message[1]);
                socket.send([type, binary ? "binary" : ""].toString());
                break;
            case "enqueue":
                //enqueue <object>
                message = message.join(" ");
                var p = placeOnChannel(
                    db.collection(collectionName),
                    key, message, type, binary);
                    p.then(function(result){
                        LOG("PUT", result[0]);
                    })
                break;
            case "dequeue":
                //Remove Item From Beginning queue
                //dequeue <index=0> <full=false>
                var index = Number(message[0]) || 0;
                getPromise(db.collection(collectionName),
                    key, 1, index, true).then(function(result){
                        if(result.value && result.value.buffer){
                            result.value = result.value.buffer;
                        }
                        if(isSetTrue(message[1])){
                            socket.send(result);
                        }else{
                            socket.send(result.value);
                        }
                    }).fail(function(error){

                    })
                break;
            case "pop":
                //Remove Item From Top of Stack
                //pop <index=0> <full=false>
                var index = Number(message[0]) || 0;
                getPromise(db.collection(collectionName),
                    key, -1, index, true).then(function(result){
                        if(result.value && result.value.buffer){
                            result.value = result.value.buffer;
                        }
                        if(isSetTrue(message[1])){
                            socket.send(result);
                        }else{
                            socket.send(result.value)
                        }
                    })
                break;
            case "autodequeue":
                socket.send(
                    String(toggleChannel("dequeue", collectionkey, socket)));
                break;
            case "autopop":
                socket.send(
                    String(toggleChannel("pop", collectionkey, socket)));
                break;
            case "autoflag":
                socket.send(
                    String(toggleChannel("flag", collectionkey, socket)));
                break;
        }
    })
}

////
//Helpers
////




var render = function(self, obj, status){
    try{
        if(obj._id) self.set("ETag", obj._id);
        if(obj.type) self.set("Content-Type", obj.type);
        if(obj.value) self.response.body = obj.value;
        self.response.status = status || 200;
        LOG("RENDER", obj);
    }catch(e){
        self.response.body = e;
        self.set("Content-Type", "text/plain");
        self.response.status = 404;
        LOG("RENDER", obj);
    }
}
var render2 = function(response, obj, status){
    try{
        response.status(status || 200)
        if(obj._id) response.headers["ETag"] =  obj._id;
        if(obj.type) response.headers["Content-Type"] = obj.type;
        if(obj.value) response.body = obj.value;
        if(obj.body) response.send(obj.body);
        else response.end();
    }catch(e){
        response.headers["Content-Type"] = "text/plain";
        response.status(404).send(e);
    }
}


////
//Application Middleware
////
var rawBody = function* (next){
    var contentType =  (this.request.headers["content-type"] || "")
    .split(" ").join("").split(";");
    this.baseType = contentType[0] || OPTIONS.BASETYPE;
    this.encoding = this.charset
        || ((contentType[1] || "").split("charset=")[1] || "").toLowerCase()
        || OPTIONS.CHARSET;
    this.raw = yield getRawBody(this.req, {
        length: this.length,
        limit: OPTIONS.BODYLIMIT || undefined,
        encoding: this.encoding !== "binary" ? this.encoding : null
    })
    yield next;
}
var rawBody2 = function* (request, response, next){
    request.raw = "";
    if(options.includeBody){
        request.on("data", function(chunk) {
            request.raw += chunk;
        });
    }
    request.on("end", function(){
        next();
    })
}

var queryMethod = function* (next){
    this.request.method = this.query._method || this.request.method;
    yield next;
}

var queryMethod2 = function(request, response, next){
    //TODO:Get Query Method Fromurl.
    request.method = request.query._method || this.request.method;
    next();
}
var getRoute = router.get("/:collectionName/:key",
    function* (collectionName, key){
        var collection = db.collection(collectionName);
        var obj = {
            key : key,
            time : Number(Date.now()),
            type : this.request.headers["content-type"]
        };
        var index = isInt(this.query.index) ? Number(this.query.index) : 0;
        var order = isSetTrue(this.query.pop)? -1 : 1;
        var remove = add isSetTrue(this.query.dequeue)
            && OPTIONS.UNSAFEGET;
        var result = yield getPromise(collection, key, order, index);
        if(result){
            LOG("GET", result);
            if(remove){
                yield removeOnePromise(collection, result._id);
                LOG("DELETE", result._id);
            }
            if(result.value && result.value.buffer){
                result.value = result.value.buffer;
            }
            obj.value = result.value;
            obj._id = result._id;
            obj.type = result.type;
            obj.time = result.time;
            render(this, obj, 200);
        }else{
            render(this, obj, 404)
        }
    }
)
var headRoute = router.head("/:collectionName/:key",
    function* (collectionName, key){
        var collection = db.collection(collectionName);
        var obj = {
            key : key,
            time : Number(Date.now()),
            type : this.request.headers["content-type"]
        };
        var index = isInt(this.query.index) ? Number(this.query.index) : 0;
        var order = isSetTrue(this.query.pop)? -1 : 1;
        var result = yield getEmptyPromise(collection, key, order, index);
        if(result){
            LOG("GET", result);
            obj._id = result._id;
            obj.type = result.type;
            obj.time = result.time;
            render(this, obj, 200);
        }else{
            render(this, obj, 404)
        }

    }
)
var traceRoute = router.trace("/:collectionName/:key",
    function* (collectionName, key){
        var obj = {
            time : Number(Date.now()),
            value : this.encoding === "binary" ? Binary(this.raw) : this.raw,
            type : this.request.headers["content-type"]
        };
        render(this, obj, 200);
    }
)


var deleteRoute = router.delete("/:collectionName/:key",
    function* (collectionName, key){
        var collection = db.collection(collectionName);
        var obj = {
            key : key,
            time : Number(Date.now()),
            type : this.request.headers["content-type"]
        };
        var index = isInt(this.query.index) ? Number(this.query.index) : false;
        var order = isSetTrue(this.query.pop)? -1 : 1;
        var respond = (order === - 1)
            && index !== false
            || isSetTrue(this.query.dequeue);

        if(respond){
            var result = yield getPromise(collection, key, order, index || 0)
            if(result){
                LOG("GET", result);
                yield removeOnePromise(collection, result._id);
                LOG("DELETE", result._id);
                if(result.value && result.value.buffer){
                    result.value = result.value.buffer;
                }
                obj.value = result.value;
                obj._id = result._id;
                obj.type = result.type || obj.type;
                obj.time = result.time;
                render(this, obj, 410);
            }else{
                render(this, obj, 404);
            }
        }else{
            yield removeAllPromise(collection, key);
            render(this, obj, 410);
        }
    }
)

var putRoute = router.put("/:collectionName/:key",
    function* (collectionName, key){
        var collection = db.collection(collectionName);
        var obj = {
            key : key,
            value : this.encoding === "binary" ? Binary(this.raw) : this.raw,
            time : Number(Date.now()),
            type : this.request.headers["content-type"]
        }
        if(OPTIONS.CAPTUREHEADERS) obj.headers = this.request.headers;
        var remove = true
            && !isSetTrue(this.query.enqueue);
        if(remove){
            yield removeAllPromise(collection, key);
            LOG("DELETE", key);
        }
        var result = yield insertPromise(collection, obj);
        try{
            result = result[0];
            obj._id = result._id;
            LOG("PUT", obj);
            render(this, obj, 201);
        }catch(e){
            obj.value = e;
            render(this, obj, 500)
        }

    }
)

var postRoute = router.post("/:collectionName/:key",
    function* (collectionName, key){
        var collection = db.collection(collectionName);
        var obj = {
            key : key,
            value : this.encoding === "binary" ? Binary(this.raw) : this.raw,
            time : Number(Date.now()),
            type : this.request.headers["content-type"]
        }
        var remove = false
            || isSetFalse(this.query.enqueue);

        if(remove){
            yield removeAllPromise(collection, key);
            LOG("DELETE", key);
        }
        var result = yield insertPromise(collection, obj);
        try{
            result = result[0];
            obj._id = result._id;
            LOG("PUT", obj);
            render(this, obj, 201);
        }catch(e){
            obj.value = e;
            render(this, obj, 500)
        }
    }
)

var patchRoute = router.patch("/",
    function* (){
        var obj = {
            value : this.raw,
            time : Number(Date.now()),
            type : "application/json"
        }
        if(OPTIONS.CAPTUREHEADERS) obj.headers = this.request.headers;
        try{
            obj.value = setOptions(JSON.parse(obj.value));
            render(this, obj, 200);
        }catch(e){
            obj.value = e;
            render(this, obj, 500);
        }
    }
)

app.use(rawBody);
app.use(queryMethod);

app.use(getRoute);
app.use(headRoute);
app.use(traceRoute);

app.use(deleteRoute);
app.use(putRoute);
app.use(postRoute);
app.use(patchRoute);


//Disconnect Mongo Client
//Stop dequeue/popupdates
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
        //wss.on('connection', function*(socket){socket.send("connected");});
        LOG("Web Sockets Listening:", OPTIONS.PORT);
        setOptions(OPTIONS, true);
        LOG("CONFIG:");
        LOG(OPTIONS);
    }
)
