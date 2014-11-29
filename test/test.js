var http = require("http");
var unirest = require("unirest");
var WebSocket = require("ws");
var assert = require("assert");
var exec = require('child_process').exec;
var HOST = "127.0.0.1";
var SERVER = "http://" + HOST;
var PORT = "8080";
var SOCKET_RESPONSE_TIME = 50;
var SERVER_PORT = SERVER + ":" + PORT;

var KEY = String(Math.random());
var SERVER_PORT_KEY = SERVER_PORT + "/" + KEY;
console.log("TESTING", SERVER_PORT + "/" + KEY);
describe("Setup", function(){
    /*
    describe("Local Servers",function(){
        it("start mongo server",function(done){
            var timeout = 1000;
            this.timeout(timeout);
            exec("npm run localmongo");
            setTimeout(done, timeout * 0.75);
        })
        it("start http server", function(done){
            var timeout = 2000;
            this.timeout(timeout);
            exec("npm run local");
            setTimeout(done, timeout * 0.75);
        })
    })
    */
    describe("Data", function(){
        it('clear data via http',function(done){
            unirest
            .delete(SERVER_PORT_KEY)
            .end(function(res){
                assert.equal(res.statusType, 4);
                done();
            })
        })
    })
})
var ws0;
var ws0a = [];
var ws1;
var ws1a = [];
describe('Websockets', function(){
    describe('Connection', function(){
        it('Should connect a socket (ws0)', function(done){
            ws0 = new WebSocket(SERVER_PORT + "/" + KEY);
            ws0.on("message", function(message){
                ws0a.push(message);
            })
            ws0.on("open", function(){
                done();
            })
        })
        it('Should connect a second socket (ws1)', function(done){
            ws1 = new WebSocket(SERVER_PORT + "/" + KEY);
            ws1.on("message", function(message){
                ws1a.push(message);
            })
            ws1.on("open", function(){
                done();
            })
        })
    })
    describe('Listen Attribute', function(){
        it('set ws1 listen', function(done){
            var timeout = SOCKET_RESPONSE_TIME;
            this.timeout(timeout);
            ws1.send("listen");
            setTimeout(
                function(){
                    assert.equal(ws1a.shift(),"+listen");
                    done();
                },
                timeout * 0.75)
        })
        it('unset ws1 listen', function(done){
            var timeout = SOCKET_RESPONSE_TIME;
            this.timeout(timeout);
            ws1.send("listen");
            setTimeout(
                function(){
                    assert.equal(ws1a.shift(),"-listen");
                    done();
                },
                timeout * 0.75)
        })
        it('reset ws1 listen', function(done){
            var timeout = SOCKET_RESPONSE_TIME;
            this.timeout(timeout);
            ws1.send("listen");
            setTimeout(
                function(){
                    assert.equal(ws1a.shift(),"+listen");
                    done();
                },
                timeout * 0.75)
        })
    })
    describe('Type Attribute', function(){
        it('set ws0 type', function(done){
            var timeout = SOCKET_RESPONSE_TIME;
            this.timeout(timeout);
            ws0.send("type number/even");
            setTimeout(
                function(){
                    assert.equal(ws0a.shift(),"+type number/even");
                    done();
                },
                timeout * 0.75)
        })
        it('set ws1 type', function(done){
            var timeout = SOCKET_RESPONSE_TIME;
            this.timeout(timeout);
            ws1.send("type number/odd");
            setTimeout(
                function(){
                    assert.equal(ws1a.shift(),"+type number/odd");
                    done();
                },
                timeout * 0.75)
        })
    })

    describe('Full Attribute', function(){
        it('set ws0 full', function(done){
            var timeout = SOCKET_RESPONSE_TIME;
            this.timeout(timeout);
            ws0.send("full");
            setTimeout(
                function(){
                    assert.equal(ws0a.shift(),"+full");
                    done();
                },
                timeout * 0.75)
        })
    })
    describe('Enqueue', function(){
        it('ws0 should enqueue "0" and ws1 should be aware', function(done){
            var timeout = SOCKET_RESPONSE_TIME;
            ws0.send("enqueue 0");
            setTimeout(function(){
                assert.equal(ws1a.length,1)
                assert.equal(ws1a.shift(),"");
                done();
            }, timeout * 0.75);
        })
        it('ws0 should enqueue "2"', function(done){
            var timeout = SOCKET_RESPONSE_TIME;
            ws0.send("enqueue 2");
            setTimeout(done, timeout * 0.75);
        })
        it('ws0 should enqueue "4". ws1 should be aware of the last 2', function(done){
            var timeout = SOCKET_RESPONSE_TIME;
            ws0.send("enqueue 4");
            setTimeout(function(){
                assert.equal(ws1a.length,2)
                assert.equal(ws1a.shift(),"");
                assert.equal(ws1a.shift(),"");
                done();
            }, timeout * 0.75);
        })
        it('ws1 should enqueue "1"', function(done){
            var timeout = SOCKET_RESPONSE_TIME;
            ws1.send("enqueue 1");
            setTimeout(done, timeout * 0.75);
        })
        it('ws1 should enqueue "3"', function(done){
            var timeout = SOCKET_RESPONSE_TIME;
            ws1.send("enqueue 3");
            setTimeout(done, timeout * 0.75);
        })
        it('ws1 should enqueue "5" and be aware of the last 3', function(done){
            var timeout = SOCKET_RESPONSE_TIME;
            ws1.send("enqueue 5");
            setTimeout(function(){
                assert.equal(ws1a.length,3)
                assert.equal(ws1a.shift(),"");
                assert.equal(ws1a.shift(),"");
                assert.equal(ws1a.shift(),"");
                done();
            }, timeout * 0.75);
        })
        it('ws0 should be aware of nothing', function(){
            assert.equal(ws0a.length,0)
        })
    })
    describe("Send & Receive", function(){
        describe('Receive Attribute', function(){
            it('ws0 should receive what ws1 sends', function(done){
                var timeout = SOCKET_RESPONSE_TIME*2;
                this.timeout(timeout);
                ws0.send("receive");
                setTimeout(
                    function(){
                        assert.equal(ws0a.shift(),"+receive");
                        ws1.send("send sent");
                        setTimeout(
                            function(){
                                assert.equal(ws0a.shift(),"sent");
                                done();
                            },
                            timeout * 0.75/2)
                    },
                    timeout * 0.75/2)
                })
            })
    })
})

describe('HTTP', function(){
    it('GET should return 204 after deleting everything', function(done){
        unirest
        .delete(SERVER_PORT_KEY)
        .end(function(res){
            assert.equal(res.status, 204);
            done();
        })
    })
    it('GET should return 404 when there is nothing to delete', function(done){
        unirest
        .delete(SERVER_PORT_KEY)
        .end(function(res){
            assert.equal(res.status, 404);
            done();
        })
    })
    it('PUT should return 200 when successful', function(done){
        unirest
        .put(SERVER_PORT_KEY)
        .send("Hello World")
        .type("text/plain")
        .end(function(res){
            assert.equal(res.status, 200);
            done();
        })
    })
    it('GET should return 200 when there is something to get', function(done){
        unirest
        .get(SERVER_PORT_KEY)
        .send("Hello World")
        .end(function(res){
            assert.equal(res.status, 200);
            assert.equal(res.body, "Hello World");
            assert.equal(
                res.headers["content-type"],
                "text/plain; charset=utf-8");
            done();
        })
    })

    it('POST should return 200 when successful', function(done){
        unirest
        .post(SERVER_PORT_KEY)
        .send("Goodbye!")
        .type("text/plain")
        .end(function(res){
            assert.equal(res.status, 200);
            done();
        })
    })
    it('GET should return properly retrieve the newly posted item.', function(done){
        unirest
        .get(SERVER_PORT_KEY)
        .send("Hello World")
        .end(function(res){
            assert.equal(res.status, 200);
            assert.equal(res.body, "Goodbye!");
            assert.equal(
                res.headers["content-type"],
                "text/plain; charset=utf-8");
            done();
        })
    })
    it('GET should return properly retrieve the previous item.', function(done){
        unirest
        .get(SERVER_PORT_KEY + "?index=1")
        .send("Hello World")
        .end(function(res){
            assert.equal(res.status, 200);
            assert.equal(res.body, "Hello World");
            done();
        })
    })
    it('should return 200 when another put is successful', function(done){
        unirest
        .put(SERVER_PORT_KEY)
        .type("")
        .send("Hello Again")
        .end(function(res){
            assert.equal(res.status, 200);
            done();
        })
    })
    it('...replacing the latest item...', function(done){
        unirest
        .get(SERVER_PORT_KEY)
        .end(function(res){
            assert.equal(res.body, "Hello Again");
            assert.equal(res.status, 200);
            done();
        })
    })

    it('...along with the oldest.', function(done){
        unirest
        .get(SERVER_PORT_KEY + "?dequeue=true")
        .end(function(res){
            assert.equal(res.body, "Hello Again");
            assert.equal(res.status, 200);
            done();
        })
    })

    it('...and there should be no others', function(done){
        unirest
        .get(SERVER_PORT_KEY + "?index=1")
        .end(function(res){
            assert.equal(res.status, 404);
            done();
        })
    })
    it('Deleting should return 200 if successfully retrieving.', function(done){
        unirest
        .delete(SERVER_PORT_KEY + "?pop=true")
        .end(function(res){
            assert.equal(res.body, "Hello Again");
            assert.equal(res.status, 200);
            done();
        })
    })
    it('... and 404 if nothing is there', function(done){
        unirest
        .delete(SERVER_PORT_KEY + "?pop=true")
        .end(function(res){
            assert.equal(res.status, 404);
            done();
        })
    })
    it('AND 404 if simply deleting all keys', function(done){
        unirest
        .delete(SERVER_PORT_KEY)
        .end(function(res){
            assert.equal(res.status, 404);
            done();
        })
    })
})

describe('HTTP + Sockets', function(){
    it('ws1 should be aware of 3 additions', function(){
        assert.equal(ws1a.length,3)
        assert.equal(ws1a.shift(),"");
        assert.equal(ws1a.shift(),"");
        assert.equal(ws1a.shift(),"");
    })
    it('ws1 should dequeue w/peek "0"', function(done){
        var timeout = SOCKET_RESPONSE_TIME;
        ws1.send("enqueue 1");
        setTimeout(function(){
            assert.equal(ws1a.length,1)
            assert.equal(ws1a.shift(),"");
            done();
        }, timeout * 0.75);
    })
    it('204 if \'was\' something there', function(done){
        unirest
        .delete(SERVER_PORT_KEY)
        .end(function(res){
            assert.equal(res.status, 204);
            done();
        })
    })
    it('404 if not', function(done){
        unirest
        .delete(SERVER_PORT_KEY)
        .end(function(res){
            assert.equal(res.status, 404);
            done();
        })
    })
})
