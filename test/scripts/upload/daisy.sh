#!/bin/bash
curl -X PUT http://$HOST/$KEY -H "Content-Type: image/jpeg;charset=binary" --data-binary @./test/scripts/upload/daisy.jpg | md5
