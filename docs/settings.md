#Settings


##Setting Options

###Variables
Set these options from the commandline
<table border=1>
    <tr>
        <th>Command Line Argument</th>
        <th>Environmental Variable</th>
        <th>Description</th>
        <th>Default Value</th>
        <th>Set Via PATCH?</th>
    </tr>
    <tr>
        <td>-v, --verbose</td>
        <td>(N/A)</td>
        <td>Print verbose output to the command line.</td>
        <td>false</td>
        <td>no</td>
    </tr>
    <tr>
        <td>-p, --port</td>
        <td>PORT</td>
        <td>Listening port for HTTP requests.</td>
        <td>8080</td>
        <td>no</td>
    </tr>
    <tr>
        <td>--charset</td>
        <td>CHARSET</td>
        <td>Default encoding for stored objects.</td>
        <td>utf-8</td>
        <td>yes</td>
    </tr>
    <tr>
        <td>--body-limit</td>
        <td>BODY_LIMIT</td>
        <td>Limit of body to read.</td>
        <td>16mb</td>
        <td>yes</td>
    </tr>
    <tr>
        <td>--base-type</td>
        <td>BASE_TYPE</td>
        <td>Default type assigned to stored objects.</td>
        <td>text/plain</td>
        <td>yes</td>
    </tr>
    <tr>
        <td>--static </td>
        <td>STATIC</td>
        <td>Serve files in static folder at "<server address>/"<br />
            false - do not host static files<br />
            true  - server static files if no http-store item exists<br />
            override - serve static files<br />
                    static files will appear before http-store<br />
        </td>
        <td>false</td>
        <td>yes</td>
    </tr>
    <tr>
        <td>--(no-)peek </td>
        <td>PEEK</td>
        <td>If set as false, all retrieval  request to data base also remove item.</td>
        <td>false</td>
        <td>no</td>
    </tr>
    <tr>
        <td>--(no-)unsafe-get </td>
        <td>UNSAFE_GET</td>
        <td>Enables removal of items through GET get method by appending "?dequeue=true" to url if set.</td>
        <td>false</td>
        <td>yes</td>
    </tr>
    <tr>
        <td>--(no-)capture-headers</td>
        <td>CAPTURE_HEADERS</td>
        <td>Capture and store all headers along with body.</td>
        <td>false</td>
        <td>true</td>
    </tr>
    <tr>
        <td>--(no-)http-queue </td>
        <td>HTTP_QUEUE</td>
        <td>Enables dequeueing by default via GET/DELETE</td>
        <td>false</td>
        <td>yes</td>
    </tr>
    <tr>
        <td>--(no-)allow-set-date</td>
        <td>ALLOW_SET_DATE</td>
        <td>Allow date to be set via request headers</td>
        <td>false</td>
        <td>no</td>
    </tr>
    <tr>
        <td>--db-protocol</td>
        <td>DB_PROTOCOL</td>
        <td>Protocol for connecting to database host.</td>
        <td>mongodb</td>
        <td>no</td>
    </tr>
    <tr>
        <td>--db-host </td>
        <td>DB_HOST</td>
        <td>MongoDB database host</td>
        <td></td>
        <td>no</td>
    </tr>
    <tr>
        <td>--db-user</td>
        <td>DB_USER</td>
        <td>MongoDB database user name.</td>
        <td></td>
        <td>no</td>
    </tr>
    <tr>
        <td>--db-pass</td>
        <td>DB_PASS</td>
        <td>MongoDB database password.</td>
        <td></td>
        <td>no</td>
    </tr>
    <tr>
        <td>--db-port </td>
        <td>DB_PORT</td>
        <td>MongoDB connection port.</td>
        <td></td>
        <td>no</td>
    </tr>
    <tr>
        <td>--db-name</td>
        <td>DB_NAME</td>
        <td>MongoDB database name.</td>
        <td></td>
        <td>no</td>
    </tr>
    <tr>
        <td>--db-url</td>
        <td>DB_URL</td>
        <td>MongoDB database full. Overwrites all other DB attributes</td>
        <td></td>
        <td>no</td>
    </tr>
</table>
