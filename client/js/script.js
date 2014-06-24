var networks = null, socket = null;

function stripname(s) {
	if (!s) return '';
	if (s[0] === '#') {
		return s.substring(1);
	}
	return s;
}

function stripnick(s) {
	if (!s) return '';
	var ind = s.indexOf('!');
	if (ind !== -1) {
		return s.slice(0, ind);
	}
	return s;
}

function HHmmss(d) {
	var dateObject = null;
	if (d instanceof Date) {
		dateObject = d;
	} else {
		dateObject = new Date(d);
	}
	var h = dateObject.getHours(), m = dateObject.getMinutes(), s = dateObject.getSeconds();
	if (h < 10) h = '0'+h;
	if (m < 10) m = '0'+m;
	if (s < 10) s = '0'+s;
	return [h, m, s].join(':');
}

function addMessage(bufferId, messageId) {
	if ($(".backlog").data('currentBufferId') == bufferId) {
		var buffer = networks.findBuffer(bufferId);
		var message = buffer.messages.get(parseInt(messageId, 10));
		$(".backlog").append("<li class='irc-message'>"+
			"<span class='timestamp'> "+HHmmss(message.datetime)+"</span>"+
			"<span class='nick'>"+stripnick(message.sender)+"</span>"+
			"<span class='message'>"+message.content+"</span></li>"
		);
	};
}

function showinterface() {
    var headerHeight = 48;
    var textboxAndTopicHeight = 64;
    var currentHeight = $(window).height();
    $('#buffer-pane').css('height', currentHeight - headerHeight);
    $('#center').css('height', currentHeight - headerHeight);
    $('#nick-pane').css('height', currentHeight - headerHeight);
    $('#backlog-container').css('height', currentHeight - headerHeight - textboxAndTopicHeight);
	$('.login-page').removeClass('login-page');

    $(window).resize(function () {
        var currentHeight = $(window).height();
        $('#buffer-pane').css('height', currentHeight - headerHeight);
        $('#center').css('height', currentHeight - headerHeight);
        $('#nick-pane').css('height', currentHeight - headerHeight);
        $('#backlog-container').css('height', currentHeight - headerHeight - textboxAndTopicHeight);
    });

    $(document).on("click", ".expanded", function () {
        var channel = $(this).data("target");
        $("#" + channel).css("max-height", "0px");
        $(this).toggleClass("expanded collapsed");
        console.log("blaa");
    });

    $(document).on("click", ".collapsed", function () {
        var channel = $(this).data("target");
        $("#" + channel).css("max-height", "100%");
        $(this).toggleClass("expanded collapsed");
        console.log("bluu");
    });
	
	$(document).on("click", ".channel, .network .network-name", function () {
        var bufferId = parseInt($(this).data("bufferId"), 10);
		var buffer = networks.findBuffer(bufferId);
		var backlogs = [];
		buffer.messages.forEach(function(val, key) {
			backlogs.unshift("<li class='irc-message'>"+
				"<span class='timestamp'> "+HHmmss(val.datetime)+"</span>"+
				"<span class='nick'>"+stripnick(val.sender)+"</span>"+
				"<span class='message'>"+val.content+"</span></li>");
			
		});
		$(".backlog").html(backlogs.join("\n"));
		$(".backlog").data('currentBufferId', bufferId);
    });
    
    $(document).on("submit", "form#messageform", function (evt) {
        evt.preventDefault();
        if (socket !== null) {
            var bufferId = parseInt($(".backlog").data('currentBufferId'), 10);
            var message = $("#messagebox").val();
            $("#messagebox").val("");
            socket.emit('sendMessage', bufferId, message);
        }
    });

    $("#hide-buffers").click(function () {
        $(this).hide();
        $("#show-buffers").show();
        $("#buffer-pane").css("margin-left", "-168px");
        $("#buffer-pane").children().css("opacity", "0");
        $("#center").css("margin-left", "32px");
        $(".buffer-bottom-bar").css("opacity", "1");
        $("#show-buffers").css("opacity", "1");
    });
	
	function showBuffers() {
		$("#show-buffers").hide();
        $("#hide-buffers").show();
        $("#buffer-pane").css("margin-left", "0px");
        $("#buffer-pane").children().css("opacity", "1");
        $("#center").css("margin-left", "200px");
	}
	
    $("#show-buffers").click(showBuffers);
	
	showBuffers();

    $("#hide-nicks").click(function () {
        $(this).hide();
        $("#show-nicks").show();
        $("#nick-pane").css("margin-right", "-168px");
        $("#nick-pane").children().css("opacity", "0");
        $("#center").css("margin-right", "32px");
        $(".buffer-bottom-bar").css("opacity", "1");
        $("#show-nicks").css("opacity", "1");
    });

    $("#show-nicks").click(function () {
        $(this).hide();
        $("#hide-nicks").show();
        $("#nick-pane").css("margin-right", "0px");
        $("#nick-pane").children().css("opacity", "1");
        $("#center").css("margin-right", "200px");
    });

    $(document).on("click", ".add-channel", function () {
        var NetworkId = $(this).data('network');
        $("#join-network-name").html(NetworkId);
    });

    $('#modal-join-channel').on('hidden.bs.modal', function () {
        $('#modal-join-channel-name').val("");
    });
}

function addnetwork(name) {
	var div_network =
	$('<div class="network" id="network-'+name+'">' + 
		'<span class="expanded" data-target="'+name+'-channels" ></span>' +
		'<span class="network-name">'+name+'</span>' +
		'<a class="add-channel" data-network="'+name+'" data-toggle="modal" data-target="#modal-join-channel" title="Join channel"></a>' +
	'</div>');
	var div_channels = $('<div class="network-channels clearfix" id="'+name+'-channels"></div>');
	$('#buffer-pane .buffer-bottom-bar').before(div_network).before(div_channels);
}

function addbuffer(networkname, bufferId, name) {
	var div_channels =
	$('<div class="channel" data-buffer-id="'+bufferId+'">' + 
		'<span class="channel-icon"></span>' + 
		'<span class="channel-name">'+name+'</span>' + 
	'</div>');
	$('#'+networkname+'-channels').append(div_channels);
}

function setstatusbuffer(networkname, bufferId) {
	$('#network-'+networkname).data("bufferId", bufferId);
}

$(document).ready(function () {
	var NetworkCollection = require('network').NetworkCollection;
	var Network = require('network').Network;
	var IRCBufferCollection = require('buffer').IRCBufferCollection;
	var IRCBuffer = require('buffer').IRCBuffer;
	var IRCUser = require('user');
	var HashMap = require('serialized-hashmap');
	var Reviver = require('serializer').Reviver;
	var reviver = new Reviver(NetworkCollection, Network, IRCBufferCollection, IRCBuffer, IRCUser, HashMap);

	$("form").on("submit", function(evt) {
		evt.preventDefault();
		var wshost = $("#wshost").val();
		var wsport = $("#wsport").val();
		var host = $("#host").val();
		var port = $("#port").val();
		var user = $("#user").val();
		var password = $("#password").val();
		
		console.log('ws://'+wshost+':'+wsport);
		socket = io.connect('ws://'+wshost+':'+wsport);
		
		socket.on("connected", function() {
			$.get($("form").attr("action"), function(data){
				$("#container").html(data);
				showinterface();
			}, "html").fail(function( jqXHR, textStatus, errorThrown ) {
				console.log(textStatus);
				console.log(errorThrown);
			});
			
			console.log(user);

			var er = new EventReceiver(socket, function(event){
				socket.emit('register', event);
			});
			
			er.on('login', function(next){
				console.log('Logged in');
				next();
			});
			
			// Internal
			er.on('_init', function(next, data){
				console.log('_init');
				networks = data;
				reviver.reviveAll(networks);
				next();
			});
			
			// Internal
			er.on('network._init', function(next, networkId, data){
				console.log('network._init');
				reviver.reviveAll(data);
				networks.set(networkId, data);
				next();
			}).after('_init');
			
			er.on('network.init', function(next, networkId) {
				console.log('network.init');
				var network = networks.get(networkId);
				addnetwork(network.networkName);
				next();
			}).after('network._init');
			
			er.on('network.addbuffer', function(next, networkId, bufferId) {
				console.log('network.addbuffer');
				var network = networks.get(networkId);
				var buffer = network.getBufferCollection().getBuffer(bufferId);
				if (buffer.isStatusBuffer()) {
				    setstatusbuffer(network.networkName, bufferId);
				} else {
				    addbuffer(network.networkName, bufferId, buffer.name);
				}
				next();
			}).after('network.init');

			er.on('change', function(next, networkId, change){
				console.log('change');
				console.log(change);
				if (!jsonpatch.apply(networks.get(networkId), change)){
					console.log('Patch failed!');
				} else {
					var hasObject = false;
					for (var i=0; i<change.length; i++) {
						if (typeof change[i].value === "object" && change[i].value !== null) {
							hasObject = true;
							break;
						}
					}
					if (hasObject) {
						reviver.reviveAll(networks.get(networkId));
					}
				}
				next();
			}).after('network.init');
			
			er.on('buffer.backlog', function(next, bufferId){
				console.log('buffer.backlog : ' + bufferId);
				$('[data-buffer-id="'+bufferId+'"] .channel-icon').html(networks.findBuffer(parseInt(bufferId, 10)).messages.count());
				next();
			}).after('network.addbuffer');
			
			er.on('buffer.message', function(next, bufferId, messageId){
				console.log('buffer.message : ' + bufferId + ", " + messageId);
				addMessage(bufferId, messageId);
				next();
			}).after('buffer.backlog');
			
			socket.emit('credentials', {server: host, port: port, user: user, password: password});
		});
	});
});