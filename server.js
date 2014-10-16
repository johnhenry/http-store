var argv = require('yargs')
    .boolean("verbose")
    .alias("v","verbose")
    .alias("p","port").argv;
var LOG = argv.v ? console.log : function(){};
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

//Set options based on environmental variables
var OPTIONS = {
    PORT : (process.env.PORT || argv.port || 8080),
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
        if(!diff.DEQUEUEINTERVAL.old && OPTIONS.DEQUEUEINTERVAL){
            dequeueUpdate();
        }
    }

    if(opts.POPINTERVAL !== undefined){
        diff.POPINTERVAL = {
            old : OPTIONS.POPINTERVAL,
            new : Number(opts.POPINTERVAL)
        }
        OPTIONS.POPINTERVAL = diff.POPINTERVAL.new;
        if(!diff.POPINTERVAL.old && OPTIONS.POPINTERVAL){
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

var getPromise = function (collection, key, order, index){
    var d = q.defer();
    var callback = function(error, result){
        if(error) d.reject(error);
        else d.resolve(result);
    }
    collection.find(
        { $query:
            { key : key},
          $orderby:
            { time : order }},
        {},
        { limit : 1 , skip : index},
        callback
    )
    return d.promise;
}
var getEmptyPromise = function (collection, key, order, index){
    var d = q.defer();
    var callback = function(error, result){
        if(error) d.reject(error);
        else d.resolve(result);
    }
    collection.find(
        { $query:
            { key : key},
          $orderby:
            { time : order }},
        {value:false},
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
    }
    collection.insert(
        obj,
        callback
    )
    return d.promise;
}

var enqueOne = co(function*(collection, obj){
    return yield insertPromise(collection, obj);
})

var getOne = co(function*(collection, key, order, index, remove){
        var result = yield getPromise(collection, key, order, index);
        result = yield function(callback){
            result.toArray(callback);
        }
        result = result[0];
        if(remove && result){
            yield removeOnePromise(collection, result._id);
        }
        return result;
})

////
//Socket Helpers
////
var onChannel = function(channelName, collectiokey, socket){
    var chan = channels[channelName][collectionkey];
    if(!chan) return false;
    if(!chan.length) return false;
    var index = chan.indexOf(socket);
    if(index === -1) return false;
    return chan;
}

var addToChannel = function(channel, collectionkey, socket){
    var chan = onChannel.apply(this, arguments);
    if(chan){
        return false;
    }
    chan = channels[channel][collectionkey] = channels[channel][name] || [];
    chan.push(socket)
    return true;
};

var removeFromChannel = function(channelName, collectionkey, socket){
    var chan = onChannel.apply(this, arguments);
    if(chan){
        chan.splice(index, 1);
        return true;
    }
    return false;
};

var toggleChannel = function(channelName, collectionkey, socket){
    if(onChannel(channelName, collectionkey, socket)){
        return removeFromChannel.apply(this, arguments);
    }else{
        return addToChannel.apply(this, arguments)
    }

}

var removeFromAllChannels = function(socket){
    for(channelName in channels){
        for(collectionkey in channels[channelName]){//collectionkey = "a/b"
            removeFromChannel(channelName, collectionkey, socket);
        }
    }
}

var updateChannels = function(order){
    for(channelName in channels){
        for(collectionkey in channels[channelName]){//collectionkey = "a/b"
            channels[channelName][collectionkey]
            .forEach(function*(socket){
                var collectionkey = collectionkey.split("/")
                socket.send(
                    yield getPromise(
                        collectionkey[0],
                        collectionkey[1],
                        order || 1,
                        0,
                        true
                        )
                )
            })
        }
    }
}

var dequeueUpdate = function* (){
    if(!OPTIONS.DEQUEUEINTERVAL) return;
        updateChannels();
    setTimeout(popUpdate, OPTIONS.DEQUEUEINTERVAL);
}

var popUpdate = function* (){
    if(!OPTIONS.POPINTERVAL) return;
        updateChannels(-1);
    setTimeout(popUpdate, OPTIONS.POPINTERVAL);
}
var flagUpdate = function(collectionkey){
    var sockets = channels.flag[collectionkey] || [];
    sockets.each(function(socket){
        socket.send(1);
    })
}

////
//Database
////
var socketConnection = function (socket) {
    var path = url.parse(socket.upgradeReq.url, true, true);
    var collectionkey = path.pathname;
    var pathname = collectionkey.split("/");
    var collection = pathname[0];
    var key = pathname[1];

    if(!(collection && key)){
        socket.send("Please connection using /:collection/:key");
        socket.close();
        return;
    }

    var query = path.query;
    var queue = false;

    if(isSetTrue(query.queue)){
        queue = true;
    }
    if(isSetTrue(query.autodequeue)){
        toggleChannel("dequeue", collectionkey, socket);
    }
    if(isSetTrue(query.autopop)){
        toggleChannel("pop", collectionkey, socket);
    }
    if(isSetTrue(query.autoflag)){
        toggleChannel("flag", collectionkey, socket);
    }

    socket.on("message", function*(message){
        message = message || "";
        if(queue){
            placeOnChannel(collection, key, message);
            return;
        }
        message = message.split(" ");
        var command = message.unshift();;
        message = message.join(" ");

        switch(command){
            case "queue":
                queue = true;

                break;
            case "enqueue": case "push":
                placeOnChannel(collection, key, message);

                break;
            case "dequeue":
                socket.send(
                    yield getPromise(
                        db.collection(collection),
                        key, 1, 0 || Number(message), true));
                break;

            case "pop":
                socket.send(
                    yield getPromise(
                        db.collection(collection),
                        key, -1, 0 || Number(message), true));
                break;

            case "autodequeue":
                toggleChannel("dequeue", collectionkey, socket);
                break;

            case "autopop":
                toggleChannel("pop", collectionkey, socket);
                break;

            case "autoflag":
                toggleChannel("flag", collectionkey, socket);
                break;
        }
        var dbcollection = db.collection(collection);
        var obj = {
            key : key,
            time : Number(Date.now()),
            type : this.request.headers["content-type"]
        };
    })
}

////
//Helpers
////

var isInt = function(value) {
  return !isNaN(value) &&
         parseInt(Number(value)) == value &&
         !isNaN(parseInt(value, 10));
}
var isSetTrue = function(value){
    return String(value).toLowerCase() === "true";
}

var render = function(self, obj, status){
    try{
        if(obj._id) self.set("ETag", obj._id);
        if(obj.type) self.set("Content-Type", obj.type);
        if(obj.value) self.response.body = obj.value;
        self.response.status = status || 200;//Resource Created
    }catch(e){
        self.response.body = e;
        self.set("Content-Type", "text/plain");
        self.response.status = 404;//Resource Created
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

var isSetFalse = function(value){
    return String(value).toLowerCase() === "false";
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
        encoding: this.encoding
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
        var remove = isSetTrue(this.query.remove)
            || isSetTrue(this.query.dequeue)
            && OPTIONS.UNSAFEGET;
        var result = yield getPromise(collection, key, order, index);
        result = yield function(callback){
            result.toArray(callback);
        }
        if(result && result[0]){
            result = result[0];
            LOG("GET", result);
            if(remove){
                yield removeOnePromise(collection, result._id);
                LOG("DELETE", result._id);
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
        result = yield function(callback){
            result.toArray(callback);
        }
        if(result && result[0]){
            result = result[0];
            LOG("GET", result);
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
var traceRoute = router.trace("/:collectionName/:key",
    function* (collectionName, key){
        var obj = {
            time : Number(Date.now()),
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
            result = yield function(callback){
                result.toArray(callback);
            }

            if(result && result[0]){
                result = result[0];
                LOG("GET", result);
                yield removeOnePromise(collection, result._id);
                LOG("DELETE", result._id);
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
            value : this.raw,
            time : Number(Date.now()),
            type : this.request.headers["content-type"]
        }
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
            value : this.raw,
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
        LOG("Web Sockets Listening:", OPTIONS.PORT);
        setOptions(process.env, true);
        LOG("CONFIG:");
        LOG(OPTIONS);
    }
)
