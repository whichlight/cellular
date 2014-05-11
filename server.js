var app = require('http').createServer(handler).listen(8080)
, fs = require('fs')
, io = require('socket.io').listen(app);

io.set('log level', 1);
var muralSockets = [];
var motionEvents = [];
var emitRate = 200;

function handler (req, res) {
  if(req.url === "/"){
    fs.readFile(__dirname + '/index.html',
        function (err, data) {
          if (err) {
            res.writeHead(500);
            return res.end('Error loading index.html');
          }
          res.writeHead(200)
      res.end(data);
        });
  }
  else{
    fs.readFile(__dirname + req.url, function (err, data) {
      if (err) {
        res.writeHead(500);
        return res.end('Error loading ' +req.url);
      }
      res.writeHead(200);
      res.end(data);
    });
  }
}

//add list of events
//push events every x seconds
//add to list on events

setInterval(function(){
  if(muralSockets.length>0 && motionEvents.length>0){
    muralSockets.forEach(function(m){
      m.emit('mural',{data:motionEvents});
    });
    motionEvents = [];
  }
},emitRate);

io.sockets.on('connection', function(socket){
  socket.on('identify', function(data){
    muralSockets.push(socket);
  });

  socket.on('motion',function(data){
    data.id = socket.id;
    motionEvents.push(data);
  });

  socket.on('disconnect', function() {
    console.log('Got disconnect!');
    if(socket in muralSockets){
      var index = muralSockets.indexOf(socket);
      if (index > -1) {
        muralSockets.splice(index, 1);
      }
    } else {
      if(muralSockets.length>0){
        muralSockets.forEach(function(m){
          m.emit('removeCell',{data: socket.id});
        });
        motionEvents = [];
      }
    }
  });
});

