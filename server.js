var app = require('http').createServer(handler).listen(8080)
, fs = require('fs')
, io = require('socket.io').listen(app);

io.set('log level', 1);
var muralSocket;

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

io.sockets.on('connection', function(socket){
  socket.on('identify', function(data){
    muralSocket = socket;
  });
  socket.on('motion',function(data){
    if(typeof muralSocket != "undefined"){
      data.id = socket.id;
      //batch this
      muralSocket.emit('mural',{data:data});
    }
  });
});

