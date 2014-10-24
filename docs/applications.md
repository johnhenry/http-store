#Compatible Applications

<table border="1">
    <tr>
        <th width="25%">
            Application
        </th>
        <th>
            Type
        </th>
        <th>
            HTTP Interface
        </th>
        <th>
            Web Sockets
        </th>
        <th>
            Uploading Binary Files
        </th>
        <th>
            Other Notes
        </th>
    </tr>
    <tr>
        <td>
            HTTP Store Sample Application
        </td>
        <td>
            Hosted Web Application
        </td>
        <td>
            SUPPORTED
        </td>
        <td>
            NOT SUPPORTED
        </td>
        <td>
            NOT SUPPORTED
        </td>
        <td>
            This application is located in the static folder of the project. To use it, run http-store with the STATIC variable set to true and visit the host in a browser.
        </td>
    </tr>
    <tr>
        <td>
            <a
            href="http://curl.haxx.se/docs"
            target="_blank">
            curl
            </a>
        </td>
        <td>
            Command Line Application
        </td>
        <td>
            SUPPORTED
        </td>
        <td>
            NOT SUPPORTED
        </td>
        <td>
            SUPPORTED<br />
        </td>
        <td>
            To upload binary files
            Set the binary flag and<br />
            And set Content-Type header with charset=binary<br />
            As in this example:<br />
            curl -X PUT <server address>/flowers/rose.jpg -H "Content-Type: image/jpeg; charset=binary" --data-binary @path/to/file.jpg
        </td>
    </tr>
    <tr>
        <td>
            <a
            href="http://www.gnu.org/software/wget/manual/wget.html" target="_blank">
            wget
            </a>
        </td>
        <td>
            Command Line Application
        </td>
        <td>
            SUPPORTED
        </td>
        <td>
            NOT SUPPORTED
        </td>
        <td>
            NOT TESTED
        </td>
        <td>

        </td>
    </tr>
    <tr>
        <td>
            <a
            href="https://www.npmjs.org/package/ws" target="_blank">
            ws (wscat)
            </a>
        </td>
        <td>
            Command Line Application
        </td>
        <td>
            NOT SUPPORTED
        </td>
        <td>
            SUPPORTED
        </td>
        <td>
            NOT TESTED
        </td>
        <td>

        </td>
    </tr>
    <tr>
        <td>
            <a
            href="http://restforchrome.blogspot.com/" target="_blank">
            Advanced REST Client
            </a>
        </td>
        <td>
            Chrome Extension
        </td>
        <td>
            SUPPORTED
        </td>
        <td>
            SUPPORTED
        </td>
        <td>
            NOT SUPPORTED
        </td>
        <td>

        </td>
    </tr>
    <tr>
        <td>
            <a
            href="http://www.getpostman.com/"
            target="_blank">
            Postman
            </a>
        </td>
        <td>
            Chrome Application & Chrome Extension
        </td>
        <td>
            PARTIALLY SUPPORTED<br />
            Does not support TRACE method
        </td>
        <td>
            NOT SUPPORTED
        </td>
        <td>
            NOT SUPPORTED
        </td>
        <td>

        </td>
    </tr>
    <tr>
        <td>
            <a href="http://nodered.org/" target="_blank">Node-Red</a>
        </td>
        <td>
            Hosted Web Application
        </td>
        <td>
            PARTIALLY SUPPORTED<br />
            Does not support HEAD, PATCH, TRACE
        </td>
        <td>
            FURTHER TESTING NEEDED
        </td>
        <td>
            FURTHER TESTING NEEDED
        </td>
        <td>
            More functionality may be availablie beyond core componenets.
        </td>
    </tr>
    <tr>
        <td>
            <a href="https://github.com/hakobera/Simple-WebSocket-Client" target="_blank">Simple WebSocket Client</a>
        </td>
        <td>
            Chrome Extension
        </td>
        <td>
            NOT SUPPORTED
        </td>
        <td>
            PARTIALLY SUPPORTED<br />
            Does not properly respond to empty messages.
        </td>
        <td>
            NOT SUPPORTED
        </td>
        <td>

        </td>
    </tr>
    <tr>
        <td>
            <a href="https://chrome.google.com/webstore/detail/dark-websocket-terminal/dmogdjmcpfaibncngoolgljgocdabhke" target="_blank">Dark Web Socket Terminal</a>
        </td>
        <td>
            Chrome Application
        </td>
        <td>
            NOT SUPPORTED
        </td>
        <td>
            SUPPORTED
        </td>
        <td>
            NOT SUPPORTED
        </td>
        <td>

        </td>
    </tr>
    <tr>
        <td>
            <a href="https://www.sprintapi.com/dhcs.html" target="_blank">DHC - REST/HTTP API Client</a>
        </td>
        <td>
            Web Application & Chrome Application
        </td>
        <td>
            PARTIALLY SUPPORTED<br />
            Does not support TRACE
        </td>
        <td>
            SUPPORTED
        </td>
        <td>
            NOT SUPPORTED
        </td>
        <td>

        </td>
    </tr>
    <tr>
        <td>
            <a href="http://www.hurl.it" target="_blank">Hurl It</a>
        </td>
        <td>
            Web Application
        </td>
        <td>
            PARTIALLY SUPPORTED<br />
            Does not support TRACE
        </td>
        <td>
            SUPPORTED
        </td>
        <td>
            NOT SUPPORTED
        </td>
        <td>

        </td>
    </tr>
    <tr>
        <td>
            <a href="http://www.websocket.org/echo.html" target="_blank">Websocket.org - Echo Test</a>
        </td>
        <td>
            Web Application
        </td>
        <td>
            NOT SUPPORTED
        </td>
        <td>
            SUPPORTED
        </td>
        <td>
            NOT SUPPORTED
        </td>
        <td>

        </td>
    </tr>
</table>
