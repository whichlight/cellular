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

/*
setInterval(function(){
  if(motionEvents.length>0){
    io.sockets.in('muralRoom').emit('mural',{data:motionEvents});
  }
  motionEvents = [];
},emitRate);
*/


io.sockets.on('connection', function(socket){

  console.log('connected on ' + socket.id);

  socket.on('identify', function(data){
    muralSockets.push(socket.id);
    socket.join('muralRoom');
    console.log("mural connected on " + socket.id);
  });


  socket.on('motion',function(data){
    data.id = socket.id;
    socket.broadcast.to('muralRoom').emit('mural', {data:[data]});
  });

  socket.on('disconnect', function() {
    console.log('Got disconnect!');
    var index = muralSockets.indexOf(socket.id);
    if (index > -1) {
      muralSockets.splice(index, 1);
      socket.leave('muralRoom');
      console.log("mural disconnected on " + socket.id);
    }
    else {
      if(muralSockets.length>0){
        console.log("phone disconnected on " + socket.id);
        io.sockets.in('muralRoom').emit('removeCell',{data:socket.id});
      }
    }
  });
});

