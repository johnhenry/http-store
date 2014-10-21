#HTTP Store

##Changelog

###0.2.7
+ Fixed - Non-public messages no longer go out to subscribers

###0.2.6
+ Added more documentation to sample application.
+ Fixed - No longer crashes when setting as queue.
+ Fixed - No longer crashes when setting binary.

###0.2.5
+ Added request URL to sample application's response

###0.2.4
+ Fixed - No response type returned on DELETE (dequeue is not true)

###0.2.3
+ Added ability to load files into sample application.

###0.2.2
+ Added sample application in static directory
+ Fixed - portion of url following collection, including slashes, is now all
+ Fixed - PATCH sent with empty no longer sends server error
 part of the key
+ Fixed -- PUT enqueue parameter now works properly

###0.2.1
+ Fix Bug - malformed code

###0.2.0
+ Modified _socket subscribe_. Channel will now receive updated object when ever publicly dequeued/popped by another subscriber.
+ Added _socket listen_ to replace previous subscribe functionality

###0.1.2
+ Added ability to host static files

###0.1.1
 + Fixed - Peeking functionality now works as documented
+ Fixed - Default command line arguments working much better

###0.1.0

 + Modified socket dequeue API to allow peeking
 + Modified socket pop API to allow peeking
 + Modified socket queue API -
 + Added socket peek command to set peek attribute
 + Added socket full command to set full attribute
 + Modified socket binary command to work as toggle
    (In addition to direct setting)
 + Modified socket subscribe command to allow direct setting of status
    (In addition to toggle)
 + Modified socket queue command - order of arguments is now reversed
 + Modified socket attribute behavior - will always return a non-empty string to indicate status
 + Modified command line arguments: --unsafe-get, --no-peek, and --capture-headers are now boolean
 + Updated Documentation


###0.0.1

 - Initial Release
