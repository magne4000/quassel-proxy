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
    patch = require('./patch'),
    O = require('observed'),
    Quassel = require('libquassel');

io.sockets.on('connection', function (socket) {
    
    var registerEvents = [];
    
    socket.on('register', function(event) {
        if (registerEvents.indexOf(event) === -1) {
            registerEvents.push(event);
        }
    });
    
    socket.on('credentials', function (data) {
        var quassel = new Quassel(data.server, data.port, {backloglimit: 20}, function(next) {
            next(data.user, data.password);
        });
        
        quassel.on('init', function() {
            // Internal lib use, send NetworkCollection (empty) object
            var networks = quassel.getNetworks();
            socket.emit('_init', networks);
        });
        
        quassel.on('network.init', function(networkId) {
            var networks = quassel.getNetworks();
            var network = networks.get(networkId);
            // Internal lib use, send Network object
            socket.emit('network._init', networkId, network);
            if (typeof Object.observe !== 'undefined') {
                var ee = O(network);
                ee.on('change', function(op){
                    socket.emit.call(socket, 'change', networkId, patch(op));
                });
            }
            socket.emit('network.init', networkId);
        });
        
        quassel.on('**', function() {
            console.log(this.event);
            var args = Array.prototype.slice.call(arguments);
                args.unshift(this.event);
            if (this.event !== 'register' && this.event !== 'network.init' && registerEvents.indexOf(this.event) !== -1 ) {
                setTimeout(function() {
                    socket.emit.apply(socket, args);
                }, 500);
            }
        });
        
        quassel.connect();
    });
    
    socket.emit('connected');
});