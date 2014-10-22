#!/bin/bash
curl -X PUT http://$HOST/$KEY -H "Content-Type: application/ogg;charset=binary" --data-binary @./test/scripts/upload/bird.ogg
