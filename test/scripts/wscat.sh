#!/bin/bash
export URL=http://$HOST/$KEY?queue=$QUEUE\&binary=$BINARY\&type=$TYPE\&public=$PUBLIC\&full=$FULL\&peek=$PEEK\&subscribe=$SUBSCRIBE\&listen=$LISTEN
echo $URL
wscat -c $URL
