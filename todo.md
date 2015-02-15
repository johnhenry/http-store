###0.7.0
- Modified - listen channels are now all separate channels
    - listen - receive empty string
    - listen-id - receive id of empty string
    - listen-head
    - listen-value
    - listen-full

- Modified - Somewhat-Arbitrary __select__ replaces toggled __full__ attribut
- Modified - Removed _verbose_ attribute
- Modified - Use "get
                    --peek=[true/false] --order=[dequeue,pop]
                    --select=[full,head,id,value] [index/id]"
           - Or "get
                    --no-peek --dequeue
                    --full [index/id]"
- Modified - Removed dequeue,pop
- Modified - Use "push/post/enqueue --[put] <value>"
- Modified - Push multiple items upon connection "<host>&push=1&push=2&post=3"
- Modified - Put a single item upon connection "<host>&put=1"
- Added - select(id/head/value/empty), order(pop/dequeue) attributes
- Notably Unchanged - peek is still a toggled attribute
- Modified - Provide key of channel to delete "delete <key>". Returns ""
- Modified - "Toggleable attributes must be explicitly set."
- Modified - id/index combined due to lack of ambiguity
    (when does a mongo id not have alphabetic chars?)
- Modified - Improved Comments

###Eventually

- Added - Integrate waterline adapter
- Added - Windows executable

###Investigate
- Added - email capabilities?
- Added - MQTT
