#HTTP Store

##Changelog

###0.2.1
    Fix Bug - malformed code

###0.2.0
    Modified _socket subscribe_. Channel will now receive updated object when ever publicly dequeued/popped by another subscriber.
    Added _socket listen_ to replace previous subscribe functionality

###0.1.2
    Added ability to host static files

###0.1.1
    Fixed - Peeking functionality now works as documented
    Fixed - Default command line arguments working much better

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
