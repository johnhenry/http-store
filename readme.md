#HTTP Store

HTTP Key-Value Store on top of MongoDB


##Features
- Connect to a MongoDB Instance using HTTP and Web Sockets
- Already Compatible with zillions of applications and devices that already speak these standards


##Deploy

You can easily deploy this application to multiple environments. You can run an instance locally

###Prerequesites
Befor you deploy anywhere, you must have a mongodb server running somewhere.

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

###CLI Application

1. In a terminal type:
```
npm install -g http-store
```

2. Run with command line arguments
```
http-store [arguments]
```

Example:

```
http-store --mongourl=mongodb://username:password@127.0.0.1:27017/http-store
```


##API

###Note on queues and stacks.
While standard HTTP Methods map well to traditional key-value store options of (GET, PUT, DELETE <=> Retrieve, Insert, Remove), this is not immediately true with queues and stacks. However, by adding a few url parameters, we can easily emulate this functionality. In fact, once could implement a full que or stack with just a subset of the methods (such as in the traditional browser where only GET and POST are allowed.)

###Standard HTTP Methods

Once Running, you may access the key-value store via standard HTTP verbs. The key is the string of request parameters The value is the body of the request.

####__PUT__ /:key

Insert values in to the database via the __PUT__ method
Content-Type header will be stored along with object.

- Additional parameters
    - ?enqueue=false|true - set to true to enqueue item rather than replace an item (See POST)


####__GET__ /:key

Retrive values from the database via the __GET__ method
Content-Type header will be set according to requested type or stored type if not requested.

- Additional parameters
    - ?dequeue=false|true - treat item as a queue and remove value from database when retrieving. Requires option UNSAFEGET to be set true. (Works exactly like DELETE ?dequeue=true)
    - ?pop=false|true - treat item as a queue and start from end instead of the beginning. Can be combined with dequeue to work as a stack.
    - ?index=0|<uint> -  treat item as a queue and retrieve specific item by order placed in index. Can be combined with pop to start from end of stack, and dequeue to remove specific items.

Note: if HTTPPOP is set, ?dequeue only reverses order and ?pop forces removal.

####__DELETE__ /:key

Remove values (or oldest values) from the database via the __DELETE__ method


- Additional parameters:
    - ?dequeue=false|true = treat item as queue and return/remove begining item instead of deleting whole item. (see GET ?dequeue=true)
    - ?pop=false|true - treat item as a queue and start from end instead of beginning. Implies dequeue and thus works as a stack.
    - ?index=0|<uint> - treat item as a queue and retrieve specific item by order placed in index. Implies dequeue. Can be combined with pop to start from the end instead of the beginning.

Note: if HTTPPOP is set, ?dequeue only reverses order and ?pop forces removal.


####POST /:key

Enqueue values into the database as via the __POST__ method

- Additional parameters
    - ?enqueue=true|false - set to false to replace item instead of enqueueing (See PUT)


####PATCH /
Send a json object similar to the following to change settings at run time. Unset fields will be ignored.
```
{
    "CHARSET": <string>,
    "BASETYPE": <string>,
    "BODYLIMIT": <string>,
    "UNSAFEGET": <boolean>,
    "PEEK": <boolean>,
    "CAPTUREHEADERS": <boolean>,
}
```

####HEAD /:key

Similar to GET but without the value and removal is impossible. Headers remain intact.

####TRACE /:key

Responds with the user's request.

##Usage

###HTTP

####Clients

There are a number of clients that support HTTP. I use curl in the examples because it comes pre-installed on most *nix machines, but there are other [graphical] clients available such as [Advanced REST Client](http://restforchrome.blogspot.com/) and [Postman](http://www.getpostman.com/).

Also, please note that I haven't had any success uploading binary files through Advanced REST Client or Postman, but I have had success with curl.


#### Inserting

You may insert a request's body into the database with the following commands:

```
    PUT <server address>/<key>

    POST <server address>/<key>?enquque=false
```

Example: Insert an image

```
curl -X PUT <server address>/flowers/rose.jpg -H "Content-Type: image/jpeg; charset=binary" --data-binary @./test/media/rose.jpg
```
Note: The "@" is literal.

#### Retrieving

You may insert a request's body into the database with the following commands:

```
    GET <server address>/<key>
```

Example: Retrive an image

```
curl -X GET http://127.0.0.1:8080/flowers/rose.jpg > newrose.jpg
```

You can also attach the "?index" parameter to indicate which index to remove and "?pop=true" to start counting from the end of the list. Finally, you may add "?dequeue=true" to remove a single item as you retrieve it


#### Enqueueing


You may enqueue a into the database item with the following commands:

```
    POST <server address>/<key>

    PUT <server address>/<key>?enquque=true
```

Example: Enqueue successive images

```
curl -X POST http://127.0.0.1:8080/listofflowers -H "Content-Type: image/jpeg; charset=binary" --data-binary @./test/media/daisy.jpg

curl -X POST http://127.0.0.1:8080/listofflowers -H "Content-Type: image/jpeg; charset=binary" --data-binary @./test/media/rose.jpg
```

#### Dequeueing

You may insert a request's body into the database with the following commands:

```
    GET <server address>/<key>?dequeue=true
    DELETE <server address>/<key>?dequeue=true
```
(Note: This will only work for the GET method if you have the UNSAFEGET option set.)


Example : Dequeue successive images

```
curl -X DELETE http://127.0.0.1:8080/listofflowers?dequeue=true > rose.jpg

curl -X DELETE http://127.0.0.1:8080/listofflowers?dequeue=true > daisy.jpg

```

You can also attach the "?index" parameter to indicate which index to remove and "?pop=true" to start counting from the end of the list.

#### Removing

You may remove all items at a key with the following commands:

```
    DELETE <server address>/<key>
```

Example: Remove all images

```
curl -X DELETE http://127.0.0.1:8080/listofflowers

```
Appending "?dequeue=true" will remove and return a single item from the list.
Appending the "?index" parameter to indicate a specific index to dequeue, "?pop=true" to start counting from the end of the list.


###Web Sockets

####Client

There are a number of clients that support Web Sockets HTTP. I use wscat, in the examples because it's easy to install. But there other [graphical] clients available such as [Advanced REST Client](http://restforchrome.blogspot.com/).

#####Installing wscat
If you have node and npm installed, you may install wscat with the followiing commmand:

```
npm install --g ws
```

####Connecting
You may connect using the same url as your server

```
<server address>/<key>
```

Depending on your client, you must attach one of the following protocols (or their secure counterparts) to the beginning of the server address. If one doesn't work, try the other.

```
ws:// (or wss://)    OR    http:// (or http://)
```



Example: Connect to a web socket

```
wscat -c http://127.0.0.1:8080/integers/primes

```

When connecting, you may attach the following attributes to a url to specify a socket's attributes:

In addition, you may attach a number of attributes to the url via url parameters.

Example: Connect to a web socket with the listen attribute set

```
wscat -c http://127.0.0.1:8080/integers/primes?listen=true
>
```
Example: Connect to a web socket as a queue and immediately send three numbers

```
wscat -c http://127.0.0.1:8080/integers/primes?queue=true
>2
>3
>5
```

Example: Connect to a web socket as a queue and immediately send three numbers

```
wscat -c http://127.0.0.1:8080/integers/primes?queue=true
>2
>3
>5
```

Example: Connect to a web socket as a queue and immediately send three numbers

```
wscat -c http://127.0.0.1:8080/integers/primes?listen=true\&peek=true\&
>
    <
>pop
```

Note: There's a "\" preceding the "&" in the address. This is only necessary in environments where "&" must be escaped (ususually command lines)


The available parameters are similar in naming and function to the commands below:

####Commands

You can send the following commands once connected (if not connected as a queue).

#####Enqueue Commands
__enqueue__ item < object > - Send an item on the socket. Note: When used as a url parameter, the item will be enqueued upon connection and connection will continue normally.

__queue__ [binary-on <boolean> type <string>] - Transforms socket into a queue. Each further message sent on socket will be enqueued in its entirety. Note, if used as a url parameter (?queue=true), the socket will be unable to accept further commands.

__binary__ [binary < boolean >] - Toggles whether or not to encode the data sent on this socket. Use before __enqueue__ or __queue__

__type__ type < string > - Set the default type for data sent on this socket. Use before __euqueue__ or __queue__.


#####Dequeue Commands
__listen__ [listen <boolean>] Toggles whether or not an update is sent whenever an item is enqueue on this server

__subscribe__ [subscribe <boolean>] Toggles whether or not an object is recieved whever is it dequeued/popped by another subscriber

__dequeue__ [index peek full public]

    Dequeues an item.

    - _index_  - Index of item to remove (default 0)
    - _peek_   - View item, but do not remove (default false)
    - _full_   - Get full object instead of just value (default false)
    - _public_ _ Push object to subscribed sockets (default false)

    Note : Cannot be used as a command line argument.

__pop__ [index peek full public]

    Pops an item. See __dequeue__ (above) for parameter descriptions.

    Note : Cannot be used as a command line argument

__full__ [full < boolean >] - Toggles whether or not to receive the full stored object or just the stored value property. Use before __dequeue__ or __pop__.

__peek__ [peek < boolean >] - Toggles whether or not to remove the object from the database when received. Use before __dequeue__ or __pop__.

__public__ [peek < boolean >] - Toggles whether or not to push object to subscribed sockets. Use before __dequeue__ or __pop__.

Following this command, all further messages will be saved as objects

Example: Enqueue and HTML title (set the type first)

```
wscat -c http://127.0.0.1:8080/html
>type text/html
>enqueue <h1>THIS IS A TITLE</h1>
>
```

Example: Listen to channel and pop last added item

```
wscat -c http://127.0.0.1:8080/html
>listen
   < true
>pop
   < <h2>Chapter 2<h2/>
```

##Setting Options

###Commandline Options
Set these options from the commandline


```
Options:
    -v, --verbose       Print verbose output to the command line.
    -p, --port          Listening port for HTTP requests.
    --charset           Default encoding for stored objects.
    --body-limit        Limit of body to read.
    --base-type         Default type assigned to stored objects.
    --static            Serve files in static folder at "<server address>/"
                            false - do not host static files
                            true  - server static files if no http-store resource exists
                            override - serve static files
                                    static files will appear before http-store resources

    --(no-)peek             If set as false, all Get request to data base remove item.
    --(no-)unsafe-get       Enables removal of items through GET get method by appending "?dequeue=true" to url if set.
    --(no-)capture-headers  Capture and store all headers along with body.
    --(no-)http-pop         Enables popping by default via GET/DELETE
    --(no-)allow-set-date   Allow date to be set via request headers
    --mongoprotocol         Protocol for connecting to mongo host.
    --mongohost             MongoDB database host.
    --mongouser             MongoDB database user name.
    --mongopass             MongoDB database password.
    --mongoport             MongoDB connection port.
    --mongobase             MongoDB database name.
    --mongourl              MongoDB database full URL. Overwrites all other MongoDB related fields if set.
```

###Environment

Set these options in your environment

If not set on the command line, the following options may set as environmental variables.

- PORT
- BASETYPE
- CHARSET
- BODYLIMIT
- STATIC
- PEEK
- UNSAFEGET
- CAPTUREHEADERS
- HTTPPOP
- ALLOWSETDATE
- MONGOPROTOCOL
- MONGOUSER
- MONGOPASS
- MONGOHOST
- MONGOPORT
- MONGOBASE
- MONGOURL

Any unset environmental variable may be set from a .env file that you create in the root directory.

###Runtime

Some Settings may be set during run time by sending a PATCH request to the server. (See API above)
