
var socket = io.connect('http://'+window.location.hostname);

var cells = {};
stepRate = 30;

//x,y,z,color,id

socket.on('connect', function(){
  socket.emit('identify', {data:'mural'});
  console.log('connected');
});

//create a mobile object for each id, if it doesnt exist else update it

$(document).ready(function(){
  console.log('socket');

  socket.on('mural', function(data){
    var d = data.data;

    if(!(d.id in cells)){
      cells[d.id] = new Cell(d.id, d.color);
    }

    cells[d.id].read(d.actions);
  });
});



function Cell(id, color){
  this.id = id;
  this.color = color;
  this.x;
  this.y;
  this.z;
  this.timeline = [];
  this.velocity = new THREE.Vector3(0,0,0);
  this.acceleration = new THREE.Vector3(0,0,0);





  //create geometry
  this.geometry = new THREE.CubeGeometry(1,1,1);
  this.material = new THREE.MeshLambertMaterial( { color: this.color } );
  this.cube = new THREE.Mesh( this.geometry, this.material );
  this.cube.scale.x =5;
  this.cube.scale.y =10;
  this.cube.scale.z =5;
  scene.add(this.cube);

  //particles
  this.counter    = new SPARKS.SteadyCounter( 500 );
  this.emitter   = new SPARKS.Emitter( counter );
  this.emitter.start();

  this.emitter.addInitializer( new SPARKS.Position( new SPARKS.PointZone(new THREE.Vector3(0,0,0))));
  this.emitter.addInitializer(new SPARKS.Lifetime(1,15));
  this.emitter.addInitializer(new SPARKS.Velocity(new Sparks.PointZone(new THREE.Vector3(0,-5,1))));
  this.emitter.addAction( new SPARKS.Age() );
  this.emitter.addAction( new SPARKS.Accelerate( 0, 0, -50 ) );
  this.emitter.addAction( new SPARKS.Move() );
  this.emitter.addAction( new SPARKS.RandomDrift( 90, 100, 2000 ) );
}

Cell.prototype.update = function(x,y,z, gamma, beta, color){


  var accelVal = Math.max(x,y,z);

  this.cube.rotation.z =-1*gamma*0.0174532925;
  this.cube.rotation.x =beta*0.0174532925;
  this.color = color;
  this.cube.material.color.set(color);

  var theta = this.cube.rotation.z +Math.PI/2;
  var phi = this.cube.rotation.x;

  var lx = Math.cos(theta);
  var ly = Math.sin(theta);
//  var lz = Math.sin(phi);
  var lz = 0;


  this.acceleration = new THREE.Vector3(0,0,0);
  this.acceleration.add(v(lx,ly,2*lz).multiplyScalar(accelVal/20));

//  this.acceleration = this.acceleration.add(center.multiplyScalar(0.2));
   this.velocity.add(this.acceleration.multiplyScalar(0.8));

   this.cube.position.add(this.velocity.clone().multiplyScalar(0.5));

   this.cube.position = boundingEnv(this.cube.position)
}


var bounding = function(val){
  var neg = -50;
  var pos = 50;
  if(val<neg){return pos;}
  if(val>=pos){return neg;}
  return val;
}

var boundingEnv = function(vec){
  vec.x = bounding(vec.x);
  vec.y = bounding(vec.y);
  vec.z = bounding(vec.z);
  return vec;
}

Cell.prototype.toCenter = function(){

  this.cube.rotation.z+=0.01;
  this.cube.rotation.x+=0.01;
  this.cube.position.divideScalar(1.01);
}

Cell.prototype.slow= function(){

  this.cube.rotation.y+=0.01;
 // this.cube.rotation.x+=0.01;

//  center.sub(this.cube.position);
   this.velocity.divideScalar(1.05);
   this.cube.position.add(this.velocity.clone().multiplyScalar(0.5));
}


Cell.prototype.read = function(actions){
  //x,y,z,dt
  var that = this;
  actions.forEach(function(c,i){
    c.time = c.deltaTime + new Date().getTime();
    that.timeline.push(c);
  });
}

Cell.prototype.step = function(){
  if (this.timeline.length >0){
    if(this.timeline[0].time < new Date().getTime()){
      var a = this.timeline.shift();
      this.update(a.x, a.y, a.z, a.gamma, a.beta, a.color);
    }
  } else if(this.velocity.length()>0.1){
    this.slow();
} else {
//      this.toCenter();

    this.slow();
  }
}



function v( x, y, z ){ return new THREE.Vector3( x, y, z ); }

var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.1, 1000 );
camera.position.z = 150;
var renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );





var pointLight =
  new THREE.PointLight(0xFFFFFF);

// set its position
pointLight.position.x = 10;
pointLight.position.y = 50;
pointLight.position.z = 130;

// add to the scene
scene.add(pointLight);




function update(){
  for(var id in cells){
    cells[id].step();
  }
}

function render() {
  requestAnimationFrame(render);
  update();
  renderer.render(scene, camera);
}
render();



/* accepts parameters
 * h  Object = {h:x, s:y, v:z}
 * OR
 * h, s, v
*/
function HSVtoRGB(h, s, v) {
    var r, g, b, i, f, p, q, t;
    if (h && s === undefined && v === undefined) {
        s = h.s, v = h.v, h = h.h;
    }
    i = Math.floor(h * 6);
    f = h * 6 - i;
    p = v * (1 - s);
    q = v * (1 - f * s);
    t = v * (1 - (1 - f) * s);
    switch (i % 6) {
        case 0: r = v, g = t, b = p; break;
        case 1: r = q, g = v, b = p; break;
        case 2: r = p, g = v, b = t; break;
        case 3: r = p, g = q, b = v; break;
        case 4: r = t, g = p, b = v; break;
        case 5: r = v, g = p, b = q; break;
    }
    return {
        r: Math.floor(r * 255),
        g: Math.floor(g * 255),
        b: Math.floor(b * 255)
    };
}


