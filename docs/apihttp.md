#HTTP API

##CRUD

###Inserting and Enqueueing
Inserting and Enqueueing are accomplished with the PUT and POST methods.

####Inserting

By default, PUT will insert the body of an http request into the database. It will overwrite all other items with the same key..

    PUT /__:key__ -> [Insert item]

Attaching the attribute 'enqueue=false' to the url using a POST request will accomplish the same.

    POST /__:key__?enqueue=false -> [Insert item]

####Enqueueing

By default, POST will enqueue the body of an http request into the database. Other values are still accessable.

    POST /:key -> [Enqueue item]

Attaching the attribute 'enqueue=true' to the url using a PUT request will accomplish the same.

    PUT /:key?enqueue=true -> [Enqueue item]

###Retrieving, Deleting, and Popping (or Dequeueing)
Retrieving, deleting, and popping are accomplished with the GET and DELETE methods

####Retrieving

By default, GET will retrieve an item.

    GET /:key -> [Retrieve item]

If more than one item is stored at that key, GET will retrieve the most recently inserted item.

    GET /:key -> [Retrieve newest item]

Specifying an index will allow you to retrieve an item by the order it was enqueued. Indexes are zero-based. Note: the performance is questionable.

    GET /:key?index=N -> [Retrieve (N+1)th newest item]

Using the HEAD method in place of the GET method will result a response similar to GET, but without a body.

    HEAD /:key -> [Retrieve bodyless item]

####Deleting

By default, DELETE will remove all items with a given key.

    DELETE /:key -> [Delete item]

Specifying an index for a queue will allow you to delete a specific item.

    DELETE /:key?index=N -> [Delete item delete (N+1)th newest item from index]

####Popping

    Attaching the attribute 'pop=true' to the url in a DELETE request, will only DELETE the last item. It will also return the item similar to a GET request.

    DELETE /:key?pop=true -> [Retrieve and delete newest item]

Specifying an index for a queue will allow you to delete and retrieve a specific item. The pop attribute is implied.

    DELETE /:key?index=N -> [Retrieve and delete (N+1)th newest item]

Attaching the attribute 'dequeue=true' to the url in a DELETE request, return the least recently inserted item. The pop attribute is implied.

    DELETE /:key?dequeue=true -> [Retrieve and delete oldest item]

Combining the dequeue and index attributes allows you to remove items by index starting with the least recently inserted item.

    DELETE /:key?index=N -> [Retrieve and delete (N+1)th oldest item]

If the setting __UNSAFE_GET__ is set to true, attaching the 'pop=true' attribute will cause the GET method to behave like the DELETE method

GET /:key?pop=true&index=N -> [Retrieve and delete (N+1)th oldest item]

#####Dequeueing
The server will behave as a queue if the setting __HTTP_QUEUE__ is set to true. Attributes 'dequeue=true' and 'pop=true' switch roles and items are retrieved from the beginning of the store as opposed to the end by default. Enqueueing with POST and PUT is not affected.

Here are specific differences:

If more than one item is stored at that key, GET will retrieve the _least_ recently inserted item.

    GET /:key -> [Retrieve oldest item]

##Settings

Some settings can be changed via the PATCH method. When using the PATCH method, your request will be treated as JSON according to the [JSON-patch specification](http://tools.ietf.org/html/rfc6902). Only the replace operation is supported. The response will be of type application/json and consist of a list of editable settings.

    PATCH / [
    { "op": "replace", "path": "/SETTING_1", "value": "new value 1" },
    { "op": "replace", "path": "/SETTING_1", "value": "new value 2" },
    ...] -> [settings changes]

See [Settings Section](https://github.com/johnhenry/http-store/blob/master/docs/settings.md) for more details.

##Echoing

The TRACE method is similar to the GET method, but simply _echos_ back the request rather than processing it.

    TRACE /:key -> [Request]

##Metadata

The HEAD method is similar to the GET method, but simply returns the headers rather than the full body of the response.

    TRACE /:key -> [Request]

##Advanced

Curl, and possibly some other applications, can be used to insert and enqueue binary files. Be sure to set the charset=binary and use the data-binary flag as in the example below.

```
curl -X PUT <server address>/flowers/rose.jpg -H "Content-Type: image/jpeg; charset=binary" --data-binary @./test/media/rose.jpg
```
