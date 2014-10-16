#HTTP Store

HTTP Key-Value Store on top of MongoDB

##Deploy

You can easily deploy this application to multiple environments.

###Deploy on Heroku
1. Click Here:

 [![Deploy](https://www.herokucdn.com/deploy/button.png)](https://heroku.com/deploy?template=https://github.com/johnhenry/http-store)

2. Use Mongo DB credentials to fill out form and follow instructions.

The procfile includes the --verbose tag, so if deploying staight to heroku from this git repository and you have the [heroku toolbelt](https://toolbelt.heroku.com/), you may access the application's output via

```
heroku logs --tail
```

If you wish to disable this, you may modify the program (see below) and push directly to heroku.

###Deploy Locally

####Pre Requesites
1. Visit [nodejs.org](http://nodejs.org) to install node

####Install via git and npm
1. In a terminal type:
```
git clone git clone https://github.com/johnhenry/http-store.git
cd http-store
npm install
```

####Run the application

#####Running via npm

1. In a terminal type:
```
npm start
```

By default, the server will run at 127.0.0.1:8080

Options will be set via _environmental variables_ and [optionally] a _.env_ file.

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

Options will be set via _command line arguments_, _environmental variables_, and [optionally] a _.env_ file.

#####Running via foreman

If you have the [heroku toolbelt](https://toolbelt.heroku.com/) installed, you can take advantage of foreman to run your app locally.

1. In a terminal type:
```
foreman start
```

By default, the server will run at 127.0.0.1:5000

Options will be set via an optional _.env_ file.


##API

###NOTE note on queues and stacks.
While standard HTTP Methods map well to traditional key-value store options of (GET, PUT, DELETE <=> Retrieve, Insert, Remove), this is not immediately true with queues and stacks. However, by adding a few url parameters, we can easily emulate this functionality. In fact, once could implement a full que or stack with just a subset of the methods (such as in the traditional browser where only GET and POST are allowed.)

###Standard HTTP Methods

Once Running, you may access the key-value store via standard HTTP verbs. The key is a combination collection and name. The value is the body of the request.

####__PUT__ /:collection/:key

Insert values in to the database via the __PUT__ method
Content-Type header will be stored along with object.

- Additional parameters
    - ?enqueue=false|true - set to true to enqueue item rather than replace an item (See POST)


####__GET__ /:collection/:key

Retrive values from the database via the __GET__ method
Content-Type header will be set according to requested type or stored type if not requested.

- Additional parameters
    - ?dequeue=false|true - treat item as a queue and remove value from database when retrieving. Requires option UNSAFEGET to be set true. (Works exactly like DELETE ?dequeue=true)
    - ?pop=false|true - treat item as a queue and start from end instead of the beginning. Can be combined with dequeue to work as a stack.
    - ?index=0|<uint> -  treat item as a queue and retrieve specific item by order placed in index. Can be combined with pop to start from end of stack, and dequeue to remove specific items.

####__DELETE__ /:collection/:key

Remove values (or oldest values) from the database via the __DELETE__ method


- Additional parameters:
    - ?dequeue=false|true = treat item as queue and return/remove begining item instead of deleting whole item. (see GET ?dequeue=true)
    - ?pop=false|true - treat item as a queue and start from end instead of beginning. Implies dequeue and thus works as a stack.
    - ?index=0|<uint> - treat item as a queue and retrieve specific item by order placed in index. Implies dequeue. Can be combined with pop to start from the end instead of the beginning.

####POST /:collection/:key

Enqueue values into the database as via the __POST__ method

- Additional parameters
    - ?enqueue=true|false - set to false to replace item instead of enqueueing (See PUT)


####PATCH /
Send a json object similar to the following to change settings at run time. Unset fields will be ignored.
```
{
    "CHARSET": <string>,
    "BASETYPE":<string>,
    "BODYLIMIT":<string>,
    "UNSAFEGET":<boolean>,
    "DEQUEUEINTERVAL": <unsigned integer>,
    "POPINTERVAL" <unsigned integer>,
}
```

####HEAD /:collection/:key

Similar to GET but without the value and removal is impossible. Headers remain intact.

####TRACE /:collection/:key

Responds with the user's request.

##Setting Options

```
Options:
    -v, --verbose       Print verbose output to the command line.
    -p, --port          Listening port for HTTP requests.
    --charset           Default encoding for stored objects.
    --bodylimit         Limit of body to read.
    --dequeueinterval   Dequeue interval for connected sockets.
    --popinterval       Pop interval for connected sockets.
    --basetype          Default type assigned to stored objects.
    --unsafeget         Enables removal of items through GET get method by appending "?dequeue=true" to url if set.
    --mongoprotocol     Protocol for connecting to mongo host.
    --mongohost         MongoDB database host.
    --mongouser         MongoDB database user name.
    --mongopass         MongoDB database password.
    --mongoport         MongoDB connection port.
    --mongobase         MongoDB database name.
    --mongourl          MongoDB database full URL. Overwrites all other MongoDB related fields if set.
```

If not set on the command line, the following options may set as environmental variables.

- PORT
- CHARSET
- BODYLIMIT
- DEQUEUEINTERVAL
- POPINTERVAL
- BASETYPE
- UNSAFEGET
- MONGOPROTOCOL
- MONGOUSER
- MONGOPASS
- MONGOHOST
- MONGOPORT
- MONGOBASE
- MONGOURL

Any unset environmental variable may be set from a .env file that you create in the root directory.

Some Settings may be set during run time by sending a PATCH request to the server. (See API)
