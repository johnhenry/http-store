#HTTP Store

HTTP Key-Value Store on top of MongoDB


##Features
- Connect to a MongoDB Instance using HTTP and Web Sockets
- Already Compatible with zillions of applications and devices that already speak these standards
- Send data between http and websocket clients

##Other Docs:
+ [HTTP API](https://github.com/johnhenry/http-store/blob/master/docs/apihttp.md)
+ [Websocket API](https://github.com/johnhenry/http-store/blob/master/docs/apiws.md)
+ [Server Settings](https://github.com/johnhenry/http-store/blob/master/docs/settings.md)
+ [Tested Applications](https://github.com/johnhenry/http-store/blob/master/docs/applications.md)
+ [Glossary](https://github.com/johnhenry/http-store/blob/master/docs/glossary.md)
+ [Architecture](https://github.com/johnhenry/http-store/blob/master/docs/architecture.md)

##Prerequesites
Befor you deploy anywhere, you must have a mongodb server instance running somewhere.
[Mongo Lab](https://mongolab.com) provides this as a service for free.

##Installation

###Remote

####Deploy on Heroku
1. Click Here:

 [![Deploy](https://www.herokucdn.com/deploy/button.png)](https://heroku.com/deploy?template=https://github.com/johnhenry/http-store)

2. Use Mongo DB credentials to fill out form and follow instructions.

The Procfile includes the verbose (-v) command line argument, so if deploying straight to heroku frome this repository and you have the [heroku toolbelt](https://toolbelt.heroku.com/), you may access the application's output via

```
heroku logs --tail
```

If you wish to disable this, you may modify the program (see below) and push directly to heroku.

###Locally

####Pre Requesites
[Node](http://nodejs.org) and npm are required to run this locally. Installing node will automatically install npm. [Git](http://git-scm.com/) is also necessary.

####Command Line Application
x
+ Download and install the CLI app via npm:

```
npm install -g http-store
```

+ Run with command line arguments

```
http-store --db-url=mongodb://username:password@127.0.0.1:27017/database
```

+ Or run with enviromnem variables

```
export DB_URL=mongodb://username:password@127.0.0.1:27017/database && http-store
```

####Install via git and npm
1. In a terminal type:
```
git clone git clone https://github.com/johnhenry/http-store.git
cd http-store
npm install
```

#####Running via npm

1. In a terminal type:
```
npm start
```

By default, the server will run at 127.0.0.1:8080

Options will be set via _environmental variables_.

#####Running via node
1. In a terminal type:
```
node server
```
OR
```
node server.js
```

By default, the server will run at 127.0.0.1:8080

Options can be set via _command line arguments_ and/or _environmental variables_.

#####Running via foreman

If you have the [heroku toolbelt](https://toolbelt.heroku.com/) installed, you can take advantage of foreman to run your app locally.

1. In a terminal type:
```
foreman start
```

By default, the server will run at 127.0.0.1:5000

Options will be set via an optional _.env_ file located in the root directory.
Command line parameters may be set by modifying the _Procfile_ file.

###Node package

Http store can also be mounted as a router in other node (express) applications.


####Import store object

Supply options to create http-store object object.
Note: database options must be supplied when creating object. Other options are, well... optional.

```js
var options = {
    //...db options required
}
var store = require('http-store')(options);
```
####Mount to express application server

Mount at express point just like any other router

```js
< express app >.use(mountPoint, store);
```

####Mount store object to server
Mount the sockets to the server by calling the < store instance >.mountSocket method. Note: can be attached to any http server, not just an express instance.

```js
var server = < http or express app server >;
store.mountSocket(server, [mount point = "/"]);
```

####Full example

```js
var httpPort = 8080;
var app = require('express')();
var store = require('http-store')(
    {
        DB_URL : "mongodb://username:password@127.0.0.1:27017/database"
    }
);
app.use("/mount/point", store);//Mount database
store.mountSocket(
    app.listen(httpPort),
    "mount/point");//MountSocket
```

#####Connect

```
curl -x PUT <server location>/mount/point/:KEY Hello
```

```
curl -x GET <server location>/mount/point/:KEY
```
```
wscat -c <server location>/mount/point/:KEY
```
