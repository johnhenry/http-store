#HTTP Store

##Changelog
The change version _does not_ conform to semantic versioning.

###0.5.7
+ Added - Chat Plus Demo

###0.5.6
+ Fix - Secure Sockets in Chat Demo

###0.5.4
+ Moved Documentation To Wiki
+ Added - Chat Demo
+ Added - Preliminary Unit Tests
+ Modified - Removed Ability to alter Routes/Websockets at run time
+ Modified - "_" is now used as default key when not specified
+ Fixed - Repot built in versioning number as opposed to reading from package.json.

###0.5.2
+ Fixed - Repot built in versioning number as opposed to reading from package.json.

###0.5.1
+ Fixed - Fixed issue where defaults override passed arguments

###0.5.0
+ Modified - PATCH now uses JSON PATCH Format
+ Fixed - PATCH broken in previous update

###0.4.3
+ Added - Selectively Enable HTTP and WEBSOCKETS
+ Added - CLI Help
+ Modified - Username, Username/Password no longer required
+ Added - "local" and "wscat" test scripts

###0.4.2
+ Added Dockerfile

###0.4.1
+ Added - can now be used as a package inside of express applications

###0.4.0
+ Modified - Reorganized Documentation
+ Modified - "DB_" replaces "MONGO" in options variable names
+ Modified - Environment Variables have underscores where appropriate
+ Modified - HTTP_DEQUEUEUE replaces HTTPPOP (popping now enabled by default)
+ Modified - Binary files now stored in separate binary category in database

###0.3.3
+ Modified -e, --env command line parameter used to specify environment file
  Updated documentation
  Modified test scripts

###0.3.2
+ Fixed bug setting base type

###0.3.1
+ Added - Exposed Storage time as Last-Modified response header.
+ Added - Added Ability to store date directly with "Date" request header if ALLOWSETDATE is set true.
+ Added - Popping from stack can now be enabled by default (as opposed to Dequeueing)
+ Added - test script / environments to make working with web sockets easier (Through wscat)
+ Fixed - Full property for subscribe objects works

###0.3.0
+ Modified Key - Now includes full url string between host and query. Collection is now set by default for all requests.

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
