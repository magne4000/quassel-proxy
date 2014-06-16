/*
 * quassel-proxy
 * https://github.com/magne4000/quassel-proxy
 *
 * Copyright (c) 2014 Joël Charles
 * Licensed under the MIT license.
 */

var opts = require('nomnom').option('port', {
      abbr: 'p',
      default: 64004,
      callback: function(port) {
        if (port != parseInt(port, 10)) {
          return "port must be an integer";
        }
      },
      help: 'Websocket port'
    }).parse();
var io = require('socket.io')(opts.port),
    jsonpatch = require('fast-json-patch'),
    Quassel = require('libquassel');

io.sockets.on('connection', function (socket) {
    
    var registerEvents = [], observed;
    
    socket.on('register', function(events) {
        registerEvents = events;
    });
    
    socket.on('credentials', function (data) {
        var quassel = new Quassel(data.server, data.port, function(next) {
            next(data.user, data.password);
        });
        
        quassel.on('init', function() {
            var networks = quassel.getNetworks();
            if (typeof Object.observe !== 'undefined') {
                observed = jsonpatch.observe(networks);
            }
            socket.emit('networks', networks);
        });
        
        quassel.on('**', function() {
            console.log(this.event);
            if (this.event !== 'register' && registerEvents.indexOf(this.event) !== -1 ) {
                var args = Array.prototype.slice.call(arguments);
                args.unshift(this.event);
                socket.emit.apply(socket, args);
            }
        });
        
        if (typeof Object.observe !== 'undefined') {
            setInterval(function() {
                var patches = jsonpatch.generate(observed);
                if (patches.length > 0) {
                    socket.emit.call(socket, 'change', patches);
                }
            }, 500);
        }
        
        quassel.connect();
    });
    
    socket.emit('connected');
});