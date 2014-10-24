#Web Sockets API
The web socket API works in two phases: first __Connecting__ then __Sending Messages__

##Connecting

Depending on your client, you must attach one of the following protocols (or their secure counterparts) to the beginning of the server address. If one doesn't work, try the other.

    ws:// (or wss://)    OR    http:// (or http://)


###Attributes

    There are a number of attribues that can be attached to the address as query parameters to specify the attributes on the channel.

####Enque Attributes
+ __binary__    - all items sent on this socket will be binary encoded
+ __type__      - all future items sent on this socket will have this type. Note that other than enqueue, this is the only non-boolean value

####Retreval Attributes
+ __peek__      - the do not remove item when dequeueing
+ __full__      - the full item will be retrieved when dequeued -- not just the falue
+ __public__    - when ever an item is popped or dequeued, it is also sent to any sockets with the subscription attribute.


####Subscription Attributes
+ __subscribe__  - the socket will receive any objects that are publicly dequeued
+ __listen__     - the socket will receive any empty message whenever an item is enqueued.

####Othe attributes
+ __queue__     - all future will be enqueued. No further commands will be acknowledged as they will be part of the message enqueued.
+ __enqueue__    - upon first connection, this item will be sent. Note that other than type, this is the only non-boolean value


####Connecting Example

Connect to a web socket with wscat

```
wscat -c http://127.0.0.1:8080/items?binary=false\&public=true\&type=text/html
```

Note: There's a "\" preceding the "&" in the address. This is only necessary in environments where "&" must be escaped (ususually command lines)

###Commands

Once connected, commands can be sent to through the socket as a CLI. Beyond the first command, all parameters are optional.

+ __pop__ - remove last inserted items with the following attributes
    + index=< 0 >- index of item to remove
    + peek=< socket setting > - do not remove item from database
    + full=< socket setting > - remove full item from database
    + public=< socket setting > - send removed item to subscribed sockets

+ __dequeue__ - remove first inserted items with the following attributes. Similar to __pop__.
    + index=< 0 >
    + peek=< socket setting >
    + full=< socket setting >
    + public=< socket setting >

+ __enqueue__ - enqueue an item into the database
    + item - item to be enqueued

+ __queue__ - further commands will be ignored as commands and the full messages will be enqueued. Optional parameters may can be set while passing this command.
    + binary - set binary attribute
    + type - set type attribute

Sending any of the following commands will toggle the respective attribute for the socket. Optionally, _true_ or _false_ may be passed as an argument to set the attribute.

+ binary
+ peek
+ full
+ public
+ subscribe
+ listen

When connecting, you may attach the following attributes to a url to specify a socket's attributes:

In addition, you may attach a number of attributes to the url via url parameters.

####Command Examples

Example: Connect to a web socket as a queue and immediately send three numbers

```
wscat -c http://127.0.0.1:8080/primenumbers
>enqueue 2
>enqueue 3
>enqueue 5
```

Example: Connect to a web socket as a queue and remove numbers

```
wscat -c http://127.0.0.1:8080/primenumbers
>pop
    < 5
>dequeue
    < 2
```
