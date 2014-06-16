var NetworkCollection = require('network').NetworkCollection;
var Network = require('network').Network;
var IRCBufferCollection = require('buffer').IRCBufferCollection;
var IRCBuffer = require('buffer').IRCBuffer;
var IRCUser = require('user');
var HashMap = require('serialized-hashmap');
var Reviver = require('serializer').Reviver;
var networks = null;
var reviver = new Reviver(NetworkCollection, Network, IRCBufferCollection, IRCBuffer, IRCUser, HashMap);

function log(txt) {
	var pre = document.getElementById("g");
	var div = document.createElement("pre"); 
	div.innerHTML = txt;
	pre.appendChild(div);
}

document.forms.qform.addEventListener("submit", function(evt) {
	evt.preventDefault();
	var wshost = document.getElementById("wshost").value;
	var wsport = document.getElementById("wsport").value;
	var host = document.getElementById("host").value;
	var port = document.getElementById("port").value;
	var user = document.getElementById("user").value;
	var password = document.getElementById("password").value;
	
	var socket = io.connect('ws://'+wshost+':'+wsport);
	socket.on("connected", function() {
		log(user);
		socket.emit('register', ['buffer.highlight', 'login', 'backlog', 'change']);
		socket.emit('credentials', {server: host, port: port, user: user, password: password});

		socket.on('buffer.highlight', function(bufferId, messageId){
			log('Buffer #' + bufferId + ' : Highlight message #' + messageId);
		});

		socket.on('login', function(){
			log('Logged in');
		});

		socket.on('networks', function(data){
			networks = data;
			reviver.reviveAll(networks);
		});

		socket.on('change', function(change){
			console.log(change);
			if (!jsonpatch.apply(networks, change)){
				log('Patch failed!');
			} else {
				var hasObject = false;
				for (var i=0; i<change.length; i++) {
					if (typeof change[i].value === "object" && change[i].value !== null) {
						hasObject = true;
						break;
					}
				}
				if (hasObject) {
					reviver.reviveAll(networks);
				}
			}
		});

		socket.on('backlog', function(network){
			var n = networks.all(), k;
			for (k in n) {
				log("Network : " + n[k].networkName);
				var buffers = n[k].getBufferHashMap();
				buffers.forEach(function(val, key){
					log("   "+(val.name||val.id));
					val.messages.forEach(function(val2, key2) {
						log("      " + val2.datetime + " - "  + val2.content);
					});
				});
			}
		});

	});
}, false);