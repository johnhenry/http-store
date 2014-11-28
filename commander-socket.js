var commanderSocket = function(){
    var self = this;
    //List of added commands
    var commands = [];
    var obj = {
        cmd : function(command, handler, priority){
            try{
            if(typeof command !== "string"
                || typeof handler !== "function")
                throw new Error(
                    "Please Provide a command and an associated handler function.");        command = command.split(" ");
                    var name = command.shift();
                    var co = {
                        name : name,
                        handler : handler,
                        command : {
                            args:command.map(function(arg){
                                var name = arg;
                                var required = false;
                                var variadic = false;
                                switch (arg[0]) {
                                    case '<':
                                        if(arg[arg.length - 1] === ">"){
                                            required = true;
                                            name = arg.slice(1, -1);
                                        }
                                        break;
                                    case '[':
                                        if(arg[arg.length - 1] === "]"){
                                            name = arg.slice(1, -1);
                                        }
                                        break;
                                }
                                if (name.indexOf('...') ===
                                    name.length - 3) {
                                        variadic = true;
                                        name = name.slice(0, -3);
                                    }
                                    return {
                                        name : name,
                                        required : required,
                                        variadic : variadic,
                                    }
                                })
                        }
                    }
                    if(priority !== undefined){
                        //TODO:Splice in if a number is passed
                        commands.unshift(co);
                    }else{
                        commands.push(co);
                    }
                    return obj;
                }catch(e){
                    throw e;
                }
                },
                init : function(socket){
                    socket.on("message", function(message){
                        try{
                            var vals = message.split(" ");
                            var finished = false;
                            commands.forEach(function(command){
                                if(finished) return finished;
                                if(command.name === vals[0]){
                                    vals.shift();
                                    var args = [];
                                    for(var i = 0;
                                        i < command.command.args.length; i++){
                                        if((command.command.args[i].required) &&
                                            vals.length < (i + 1)){
                                            throw new Error("missing argument: "
                                                + command.command.args[i].name);
                                            }
                                        if(command.
                                            command.args[i].variadic){
                                            args[i] = vals.slice(i);
                                            break;
                                        }else{
                                                args[i] = vals[i];
                                            }
                                        }

                                        command.
                                        handler.
                                        apply(self,
                                            args.concat(message, socket));
                                        return finished = true;
                                        }

                                    }
                                )
                        }catch(e){
                            obj._fail(e)
                        }

                    })
                    return socket;
                },
                fail:function(failure){
                    if(typeof failure ==="function") obj._fail = failure;
                    return obj;
                },
                _fail : function(){

                }
            }
    return obj;
}
module.exports = commanderSocket;
