
var socket = io.connect('http://'+window.location.hostname);

var cells = {};
stepRate = 30;

var delta = 1, clock = new THREE.Clock();
var group = new THREE.Object3D();

var speed = 50;
var particleCloud, sparksEmitter, emitterPos;
var delta = 1, clock = new THREE.Clock();

var widthRange = 800;
var heightRange= 500;

var particles;
var Pool;

var context;

cells['screensaver']= {activated: true, step: function(){}};

//x,y,z,color,id

socket.on('connect', function(){
  socket.emit('identify', {data:'mural'});
  console.log('connected');
});

socket.on('removeCell', function(data){
   var id = data.data;
   if(typeof(cells[id])!== "undefined"){
     delete cells[id];
     console.log("removed id " + id);
   }
});


//create a mobile object for each id, if it doesnt exist else update it

$(document).ready(function(){
  initParticleSystem();
  initSynth();

  socket.on('mural', function(data){
    //unpack muralevents, it is id and array
    var motionEvents = data.data;
    motionEvents.forEach(function(data){
      var d = data;
      if(!(d.id in cells)){
        cells[d.id] = new Cell(d.id, d.color);
        console.log("added cell " + d.id);
      }
      cells[d.id].read(d.actions);
    });
  });
});

var clearMural = function(){
  cells = {};
  cells['screensaver']= {activated: true, step: function(){}};
}

socket.on('clear', function(data){
  clearMural();
  console.log('cleared');
});

var initParticleSystem = function(){
   var particlesLength = 70000;
   particles = new THREE.Geometry();
   Pool = {
     __pools: [],
     // Get a new Vector
     get: function() {
       if ( this.__pools.length > 0 ) {
         return this.__pools.pop();
       }
       console.log( "pool ran out!" )
         return null;
     },

     // Release a vector back into the pool
     add: function( v ) {
       this.__pools.push( v );
     }
   };

   for ( i = 0; i < particlesLength; i ++ ) {
     particles.vertices.push( newpos( Math.random() * 200 - 100, Math.random() * 100 + 150, Math.random() * 50 ) );
     Pool.add( i );
   }

   attributes = {
     size:  { type: 'f', value: [] },
     pcolor: { type: 'c', value: [] }
   };

   var sprite = generateSprite();
   texture = new THREE.Texture( sprite );
   texture.needsUpdate = true;
   uniforms = {
     texture:   { type: "t", value: texture }
   };

   var shaderMaterial = new THREE.ShaderMaterial( {
     uniforms: uniforms,
       attributes: attributes,
       vertexShader: document.getElementById( 'vertexshader' ).textContent,
       fragmentShader: document.getElementById( 'fragmentshader' ).textContent,
       blending: THREE.AdditiveBlending,
       depthWrite: false,
       transparent: true
   });

   particleCloud = new THREE.ParticleSystem( particles, shaderMaterial );

   particleCloud.dynamic = true;
   // particleCloud.sortParticles = true;
   var vertices = particleCloud.geometry.vertices;
   var values_size = attributes.size.value;
   var values_color = attributes.pcolor.value;

   for( var v = 0; v < vertices.length; v ++ ) {

     values_size[ v ] = 50;
     values_color[ v ] = new THREE.Color( 0x000000 );

     particles.vertices[ v ].set( Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY );

   }

   group.add( particleCloud );
   particleCloud.y = 800;


   var setTargetParticle = function() {

     var target = Pool.get();
     values_size[ target ] = Math.random() * 100 + 50;

     return target;

   };


   var onParticleCreated = function( p ) {
     //loop through cells

     var id = Object.keys(cells)[randArray(Object.keys(cells))];
     if(typeof(cells[id]) !== 'undefined' && cells[id].activated){
       if(id=="screensaver"){
         var W = window.innerWidth*2;
         var w = W*0.8;
         var x = Math.random()*w -(w)/2;
         var z = -1*Math.random()*500;
         var position = new THREE.Vector3(x,-100, z);
         p.position = position.clone();
         var target = p.target;
         if ( target ) {
           emitterpos.x = position.x;
           emitterpos.y = position.y;
           emitterpos.z = position.z;
           p.velocity.x = 0;
           p.velocity.y = 0;
           var velocity = p.velocity;
           p.target.velocity= velocity;
           particles.vertices[ target ] = p.position;
           values_color[ target ].setHSL( 0.5+Math.random()*0.25, Math.random()*0.5, Math.random()*1 );
         }
       } else{
         var position = cells[id].emitterPos.clone();
         p.position = position.clone();
         p.velocity.x = cells[id].velocity.x;
         p.velocity.y = cells[id].velocity.y;
         var velocity = p.velocity;
         p.target.velocity= velocity;
         var target = p.target;

         if ( target ) {
           emitterpos.x = cells[id].emitterPos.x;
           emitterpos.y = 0;
           particles.vertices[ target ] = p.position;
           values_color[ target ].setHSL( cells[id].color.getHSL().h, 1, 0.5 );
         }
       }
     };
   };

   var onParticleDead = function( particle ) {
     var target = particle.target;
     if ( target ) {
       // Hide the particle
       values_color[ target ].setRGB( 0, 0, 0 );
       particles.vertices[ target ].set( Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY );

       // Mark particle system as available by returning to pool
       Pool.add( particle.target );
     }
   };

   var engineLoopUpdate = function() {
   };

   sparksEmitter = new SPARKS.Emitter( new SPARKS.SteadyCounter( 500 ) );

   emitterpos = new THREE.Vector3( 0, 0, 0 );

   sparksEmitter.addInitializer( new SPARKS.Position( new SPARKS.PointZone( emitterpos ) ) );
   sparksEmitter.addInitializer( new SPARKS.Lifetime( 1, 6 ));
   sparksEmitter.addInitializer( new SPARKS.Target( null, setTargetParticle ) );


   sparksEmitter.addInitializer( new SPARKS.Velocity( new
         SPARKS.PointZone( new THREE.Vector3( 0, 0, 0 ) ) ) );

   sparksEmitter.addAction( new SPARKS.Age() );
   sparksEmitter.addAction( new SPARKS.Accelerate( 0, 0, -10 ) );
   sparksEmitter.addAction( new SPARKS.Move() );
   sparksEmitter.addAction( new SPARKS.RandomDrift( 200, 200, 400) );


   sparksEmitter.addCallback( "created", onParticleCreated );
   sparksEmitter.addCallback( "dead", onParticleDead );
   sparksEmitter.addCallback("updated", function(p){
     var target = p.target;
     if(target){
      if(values_size[target]>20){
       values_size[target]-=0.4;
      }
     }
   });
   //sparksEmitter.addCallback("loopUpdated", engineLoopUpdate);


   //weird hack
   sparksEmitter._actions[0]._easing = TWEEN.Easing.Linear.None;
   sparksEmitter.start();

   var effectFocus = new THREE.ShaderPass( THREE.FocusShader );

   var effectCopy = new THREE.ShaderPass( THREE.CopyShader );
   effectFilm = new THREE.FilmPass( 0.5, 0.25, 2048, false );

   var shaderBlur = THREE.TriangleBlurShader;
   effectBlurX = new THREE.ShaderPass( shaderBlur, 'texture' );
   effectBlurY = new THREE.ShaderPass( shaderBlur, 'texture' );

   var radius = 15;
   var blurAmountX = radius / window.innerWidth;
   var blurAmountY = radius / window.innerHeight;

   hblur = new THREE.ShaderPass( THREE.HorizontalBlurShader );
   vblur = new THREE.ShaderPass( THREE.VerticalBlurShader);

   hblur.uniforms[ 'h' ].value =  1 / window.innerWidth;
   vblur.uniforms[ 'v' ].value =  1 / window.innerHeight;

   effectBlurX.uniforms[ 'delta' ].value = new THREE.Vector2( blurAmountX, 0 );
   effectBlurY.uniforms[ 'delta' ].value = new THREE.Vector2( 0, blurAmountY );

   effectFocus.uniforms[ 'sampleDistance' ].value = 0.99; //0.94
   effectFocus.uniforms[ 'waveFactor' ].value = 0.003;  //0.00125

   var renderScene = new THREE.RenderPass( scene, camera );


   vblur.renderToScreen = true;
   effectBlurY.renderToScreen = true;
   effectFocus.renderToScreen = true;
   effectCopy.renderToScreen = true;
   effectFilm.renderToScreen = true;



   function onWindowResize() {

     windowHalfX = window.innerWidth / 2;
     windowHalfY = window.innerHeight / 2;

     camera.aspect = window.innerWidth / window.innerHeight;
     camera.updateProjectionMatrix();

     renderer.setSize( window.innerWidth, window.innerHeight );

     hblur.uniforms[ 'h' ].value =  1 / window.innerWidth;
     vblur.uniforms[ 'v' ].value =  1 / window.innerHeight;

     var radius = 15;
     var blurAmountX = radius / window.innerWidth;
     var blurAmountY = radius / window.innerHeight;

     effectBlurX.uniforms[ 'delta' ].value = new THREE.Vector2( blurAmountX, 0 );
     effectBlurY.uniforms[ 'delta' ].value = new THREE.Vector2( 0, blurAmountY );

   }


   window.addEventListener( 'resize', onWindowResize, false );
  render();

}

function mapToCoord(val, size){
  var w = val*size;
  var pos = (-1*size/2)+(w);
  return pos;
}


function Cell(id, color){
  this.id = id;
  this.color = new THREE.Color(color);
  this.x;
  this.y;
  this.z;
  this.timeline = [];
  this.velocity = new THREE.Vector3(0,0,0);
  this.acceleration = new THREE.Vector3(0,0,0);
  this.activated = false;
  this.intensity = 0;
  this.angle;
  this.emitterPos = new THREE.Vector3(0,0,-100);
  this.justOn = true;
  this.emitterNewPos = new THREE.Vector3(0,0,-100);
}

Cell.prototype.update = function(x,y,z, gamma, beta, color, touchX, touchY){
  this.intensity = Math.max(x,y,z);
  this.activated = this.intensity > 0;

  if(this.activated){

    this.color.set(color);
    var theta =-1*gamma*0.0174532925 + Math.PI/2;
    var x = mapToCoord(touchX,window.innerWidth);
    var y = mapToCoord(1-touchY+0.2,window.innerHeight);
    var lx = Math.cos(theta);
    var ly = Math.sin(theta);
    this.velocity.x = 10*this.intensity * lx;
    this.velocity.y = 10*this.intensity * ly;
    this.emitterNewPos.x = x;
    this.emitterNewPos.y=y;
    if(this.justOn){
     this.emitterPos = this.emitterNewPos.clone();
     this.justOn=false;
    }
  }else{
   this.justOn=true;
  }

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
      this.update(a.x, a.y, a.z, a.gamma, a.beta, a.color, a.touchX, a.touchY);
    }
  }
  var c = new THREE.Vector3();
  c.subVectors(this.emitterNewPos, this.emitterPos);
  c.multiplyScalar(0.05);
  this.emitterPos.add(c);
}



function newpos( x, y, z ){ return new THREE.Vector3( x, y, z ); }

var scene = new THREE.Scene();
var camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 1, 2000 );
camera.position.set( 0, 100, 400 );
var renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

// set its position
pointLight = new THREE.PointLight( 0xffffff, 2, 300 );
pointLight.position.set( 0, 0, 0 );

// add to the scene
scene.add(pointLight);
scene.add( group);




function update(){
  //interface w particles

  for(var id in cells){
      cells[id].step();
  }


  delta = speed * clock.getDelta();
  particleCloud.geometry.verticesNeedUpdate = true;
  attributes.size.needsUpdate = true;
  attributes.pcolor.needsUpdate = true;
}

function render() {
  requestAnimationFrame(render);
  update();
  renderer.render(scene, camera);
}



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

var generateSprite = function() {

  var canvas = document.createElement( 'canvas' );
  canvas.width = 128;
  canvas.height = 128;

  var context = canvas.getContext( '2d' );
  context.beginPath();
  context.arc( 64, 64, 60, 0, Math.PI * 2, false) ;

  context.lineWidth = 0.5;
  context.stroke();
  context.restore();

  var gradient = context.createRadialGradient( canvas.width / 2, canvas.height / 2, 0, canvas.width / 2, canvas.height / 2, canvas.width / 2 );
  gradient.addColorStop( 0, 'rgba(255,255,255,1)' );
  gradient.addColorStop( 0.1, 'rgba(255,255,255,1)' );
  gradient.addColorStop( 0.5, 'rgba(200,200,200,1)' );
  gradient.addColorStop( 0.9, 'rgba(0,0,0,1)' );
  context.fillStyle = gradient;
  context.fill();
  return canvas;
}

var randArray = function(a){
  return Math.floor(Math.random()*a.length);
}


function SimpleDrone(f, vol){
  this.filter;
  this.gain;
  this.osc;
  this.played = false;
  this.volume = vol;
  this.pitch = f;
  this.buildSynth();
  this.play();
}

SimpleDrone.prototype.buildSynth = function(){
  this.osc = context.createOscillator(); // Create sound source
  this.osc.type = 2;
  this.osc.frequency.value = this.pitch;

  this.filter = context.createBiquadFilter();
  this.filter.type = 0;
  this.filter.frequency.value = 200;

  this.gain = context.createGain();
  this.gain.gain.value = this.volume;
  //decay
  this.osc.connect(this.filter); // Connect sound to output
  this.filter.connect(this.gain);
  this.gain.connect(context.destination);
}

SimpleDrone.prototype.play = function(){
  this.osc.start(0); // Play instantly
}


function Drone(f, vol, lfo_rate){
  this.filter;
  this.gain;
  this.osc;
  this.played = false;
  this.volume = vol;
  this.pitch = f;
  this.lfo_rate = lfo_rate;
  this.buildSynth();
  this.play();
}


Drone.prototype.buildSynth = function(){
  this.osc = context.createOscillator(); // Create sound source
  this.osc.type = 2;
  this.osc.frequency.value = this.pitch;


  //lfo to osc
  this.lfo = context.createOscillator(); // Create sound source
  this.lfo.type = 1;
  this.lfo.frequency.value = 100;
  this.lfoGain = context.createGain(); // Create sound source
  this.lfoGain.gain.value = 40;
  this.lfo.connect(this.lfoGain);
  this.lfoGain.connect(this.osc.frequency);
  this.lfo.start(0);

  this.filter = context.createBiquadFilter();
  this.filter.type = 0;
  this.filter.frequency.value = 100;

  //lfo to filter
  this.filtlfo = context.createOscillator();
  this.filtlfo.type =0;
  this.filtlfo.frequency.value = this.lfo_rate;
  this.filtlfoGain = context.createGain();
  this.filtlfoGain.gain.value = 100;
  this.filtlfo.connect(this.filtlfoGain);
  this.filtlfoGain.connect(this.filter.frequency);
  this.filtlfo.start(0);




  this.gain = context.createGain();
  this.gain.gain.value = this.volume;


  //lfo to gain
  //
  this.gainlfo = context.createOscillator();
  this.gainlfo.type =0;
  this.gainlfo.frequency.value = 0.05;
  this.gainlfoGain = context.createGain();
  this.gainlfoGain.gain.value = 0.05;
  this.gainlfo.connect(this.gainlfoGain);
  this.gainlfoGain.connect(this.gain.gain);
  this.gainlfo.start(0);


  //decay
  this.osc.connect(this.filter); // Connect sound to output
  this.filter.connect(this.gain);
  this.gain.connect(context.destination);
}

Drone.prototype.setPitch = function(p){
  this.osc.frequency.value = p;
}

Drone.prototype.setFilter = function(f){
  this.filter.frequency.value = f;
}

Drone.prototype.setVolume= function(v){
  this.gain.gain.value = v;
  this.volume = v;
}

Drone.prototype.play = function(){
  this.osc.start(0); // Play instantly
}

Drone.prototype.stop = function(){
    this.setVolume(0);
    this.osc.disconnect();
    return false;
}


function initSynth(){
  try{
    window.AudioContext = window.AudioContext||window.webkitAudioContext;
    context = new AudioContext();
  }
  catch (err){
    alert('web audio not supported');
  }

  if(typeof(context)!="undefined"){
    var droneRoot = randArray([146.83, 196, 220.00]);
    var note = 146.83;
    setTimeout(function(){var d = new Drone(note/2, 0.4, 0.08);},1000);
    setTimeout(function(){var d = new Drone(note, 0.5, 0.05);},2000);
    setTimeout(function(){var d = new Drone(220, 0.4, 0.08);},3000);
    setTimeout(function(){var d = new Drone(146.83*2, 0.5, 0.05);},7000);
    setTimeout(function(){var e = new Drone(220*2, 0.5, 0.03);},8000);
   var e =  new SimpleDrone(146.83/2, 0.1);
    console.log('synth');
  }
}

// check drone. test w phone
