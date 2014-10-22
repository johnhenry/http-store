#!/bin/bash
curl -X PUT http://$HOST/$KEY -H "Content-Type: video/ogg;charset=binary" --data-binary @./test/scripts/upload/fish.webm | md5
