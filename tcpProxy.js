var util = require('util');
var net = require("net");

var proxyPort;
var serviceHost;
var servicePort;
var adminPort;

var arguments = process.argv.splice(2);
if (arguments.length != 1) {
  console.log("Usage: tcpProxy [adminPort] e.g node tcpProxy 9999");
  process.exit(1);
}

adminPort = arguments[0];

var forwarding = true;
var listening = false;

net.createServer(function (socket) {
  socket.on("data", function (data) {
    var command = data.toString();
    if (command.indexOf("enable") > -1) {
       console.log("Enabling proxy forwarding");
       forwarding = true;
    } else if (command.indexOf("disable") > -1) {
       console.log("Disabling proxy forwarding");
       forwarding = false;
    } else if (command.indexOf("stoplisten") > -1) {
       if (!listening) {
         console.log("Not listening so ignoring stop listen command")
         return;
       }
       listening = false;
       console.log("Closing proxy port and ending connections " + currentConnections.length);
       server.close();
       for (i = 0; i < currentConnections.length; i++) {
         console.log("Closing socket: " + currentConnections[i].remoteAddress + " " + currentConnections[i].remotePort);
         if (typeof currentConnections[i].remoteAddress != 'undefined') {
           currentConnections[i].end();
         } else {
	   console.log("Not closing " + currentConnections[i].remoteAddress + " " + currentConnections[i].remotePort + " as looks closed")
	 }
       }
       currentConnections = new Array();
    } else if (command.indexOf("startlisten") > -1) {
       if (listening) {
         console.log("Already listening so ignoring start listen command")
       }
       var args = command.split(" ");
       if (args.length != 4) {
         console.log("Usage: startListen [proxyPort] [servicehost] [serviceport]");
             return;
       }	
       proxyPort = args[1];
       serviceHost = args[2];
       servicePort = args[3];
 
       
       listening = true;
       console.log("Starting  proxy on port " + proxyPort + " forwarding to " + serviceHost + ":" + servicePort);
       server.listen(proxyPort);
    } else {
       console.log("Unknwon command " + command);
    }
  });

}).listen(adminPort);

var server = net.createServer(function (socket) {
  var connectedToService = false;
  var buffers = new Array();
  var serviceSocket = new net.Socket();
  serviceSocket.connect(parseInt(servicePort), serviceHost, function() {
    connectedToService = true;
    if (buffers.length > 0) {
      for (i = 0; i < buffers.length; i++) {
        console.log(buffers[i]);
        serviceSocket.write(buffers[i]);
      }
    }
  });

 
  socket.on("data", function (data) {
    if (connectedToService) {
      console.log("connected:: " + listening + " forwarding:: " + forwarding);
      if (forwarding) {
        serviceSocket.write(data);
      } else {
        console.log("Proxy forwarding is disabled - not sending")
      }
    } else {
      buffers[buffers.length] = data;
    }
  });
  serviceSocket.on("data", function(data) {
    socket.write(data);
  });
  socket.on("close", function(had_error) {
    serviceSocket.end();
  });
  serviceSocket.on("close", function(had_error) {
    socket.end();
  });  
  socket.on("error", function (e) {
    serviceSocket.end();
  });
  serviceSocket.on("error", function (e) {
    console.log("Could not connect to service at host " + serviceHost + ', port ' + servicePort);
    socket.end();
  });

});

var currentConnections = new Array();
server.on("connection", function(socket) {
  console.log(currentConnections.length + " Incoming connection " + socket.remoteAddress + " " + socket.remotePort);
  currentConnections[currentConnections.length] = socket;
});

process.on('uncaughtException', function(err) {
  console.log('Caught exception: ' + err);
});
