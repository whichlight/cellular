var context;
var $fun;
var synth= {};
var graphic;
var emitter;
var noteVal = 400;
var t = new Date();
var socket = io.connect('http://'+window.location.hostname);
var isDesktop = false;
var webAudioExists = false;
var touchE;


//[x,y,z],color, type
//
socket.on('connect', function(){
  console.log('connected');
});


/*

fallbacks

if web audio doesnt work, use device orientation still for visual

*/

var accelEvent = {x:1, y:0, z:0};
var orientEvent = {};
var accelVal;
var base_color = Math.random();

var q_notes = [146.832, 164.814, 174.614, 195.998, 220.000,
246.942, 261.626, 293.665, 329.628, 349.228, 391.995, 440.000, 493.883, 523.251, 587.330, 659.255, 698.456, 783.991, 880.000, 987.767, 1046.502, 1174.659, 1318.510, 1396.913, 1567.982, 1760.000, 1975.533, 2093.005, 2349.318, 2637.020, 2793.826, 3135.963, 3520.000]

var D_chord = [146.83,220.00,293.66];

/**
 *
 accel events and touch mapped to Synth and Graphic
 Synth plays notes
 Graphic does visuals

accel
map_range(accelVal, 0, 15, 100,1500);

 *
 */

$(document).ready(function(){
    infoAlert();
    setup();
});

window.onload = function(){
    containerNode = document.getElementById( 'canvas' );
    myp5 = new p5(s, containerNode);
}

$("#press").css('top',$(window).height()/2);
$("#logval").css('top',$(window).height()/4);

var checkFeatureSupport = function(){
  try{
    window.AudioContext = window.AudioContext||window.webkitAudioContext;
    context = new AudioContext();
  }
  catch (err){
    alert('web audio not supported');
  }

  try{
    motionContext = window.DeviceMotionEvent;
  }
  catch (err){
    console.log('motion not supported');
  }
  if (! (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) ) {
    // some code..
    isDesktop = true;
    console.log('desktop');
  }
}


var setup = function(){
  checkFeatureSupport();

  if(typeof(context)!=="undefined"){
    webAudioExists = true;
  }

  if(webAudioExists){
    synth = new Synth();
  }

  graphic = new Graphic();
  emitter = new SampleBatchEmitter();

  $fun = $("#fun");

  var c  = HSVtoRGB(base_color,1,1);
  graphic.background_color = "rgb("+c.r+","+c.g+","+c.b+")" ;


  //add events
  hammertime = Hammer($fun[0], {
    prevent_default: true,
             no_mouseevents: true
  })
  .on('touch', function(event){
    touchActivate(event);
  })
  .on('drag', function(event){
    touchActivate(event);
  })
  .on('release', function(event){
    touchDeactivate();
  });

  if (window.DeviceMotionEvent) {
    window.addEventListener('devicemotion', deviceMotionHandler, false);
  }

  if (window.DeviceOrientationEvent) {
    window.addEventListener('deviceorientation', devOrientHandler, false);
  }


  accelEvent = {x:1, y:0, z:0};
}


//touch and gesture mappings to synth and graphic
//
var touchActivate = function(e){
  e.preventDefault();

  if(webAudioExists){
    synth.touchActivate(e);
  }
  graphic.touchActivate(e);
}

var touchDeactivate = function(e){

  if(webAudioExists){
    synth.touchDeactivate();
  }
  graphic.touchDeactivate();
}

function deviceMotionHandler(eventData) {
  if(webAudioExists){
    synth.accelHandler(eventData);
  }

  graphic.accelHandler(eventData);
  var a = eventData.acceleration;
  accelEvent = a;
}

function devOrientHandler(eventData) {
  if(webAudioExists){
    synth.orientHandler(eventData);
  }

  graphic.orientHandler(eventData);
}

function desktopMotionHandler(eventData) {

  if(synth.activated){
    w =  $(window).width();
    h = $(window).height();
  x = 16*(eventData.pageX -w/2)/w;
  y = 16*(-1*eventData.pageY + h/2)/h;

  }

}


//sample + batch acceleration values. only submit if nonzero
function SampleBatchEmitter(){
  this.sample_rate= 30;
  this.emit_rate = 200;
  this.data = [];
  this.read = true;
  this.emitd();
  this.startTime;
}

SampleBatchEmitter.prototype.pushd = function(d){
  if(this.read===true  && graphic.activated){
    d.deltaTime = (new Date().getTime() - this.startTime);
    this.data.push(d);
    this.read = false;
    var that = this;
    setTimeout(function(){that.read = true;}, that.sample_rate);
  };
}

SampleBatchEmitter.prototype.emitd = function(){
  var that = this;
  setInterval(function(){
    that.startTime = new Date().getTime();
    if(that.data.length>0){
      socket.emit('motion', {
          color: graphic.background_color,
          type: "mobile",
          actions: that.data});
      that.data = [];
    }
  },that.emit_rate);
}


function map_range(value, low1, high1, low2, high2) {
    return low2 + (high2 - low2) * (value - low1) / (high1 - low1);
}

function Pluck(f){
  this.filter;
  this.gain;
  this.osc;
  this.played = false;
  this.volume = map_range(f,100,1500,0.6, 0.4);//based on F range
  this.pitch = f;
  this.buildSynth();
  this.duration = 1;
}

Pluck.prototype.buildSynth = function(){
  this.osc = context.createOscillator(); // Create sound source
  this.osc.type = 3; // Square wave
  this.osc.frequency.value = this.pitch;

  this.filter = context.createBiquadFilter();
  this.filter.type = 0;
  this.filter.frequency.value = 440;

  this.gain = context.createGain();
  this.gain.gain.value = this.volume;
  //decay
  this.osc.connect(this.filter); // Connect sound to output
  this.filter.connect(this.gain);
  this.gain.connect(context.destination);
}

Pluck.prototype.setPitch = function(p){
  this.osc.frequency.value = p;
}

Pluck.prototype.setFilter = function(f){
  this.filter.frequency.value = f;
}

Pluck.prototype.setVolume= function(v){
  this.gain.gain.value = v;
  this.volume = v;
}

Pluck.prototype.play = function(dur){
  var dur = this.duration || dur;
  this.osc.start(0); // Play instantly
  this.gain.gain.setTargetAtTime(0, 0, 0.3);
  var that = this;
  setTimeout(function(){
  //this looks funny because start and stop don't work on mobile yet
  //and noteOff doesnt allow new notes
    that.setVolume(0);
    that.osc.disconnect();
  },dur*1000);
}

Pluck.prototype.stop = function(){
  return false;
}



function Drone(f){
  this.filter;
  this.gain;
  this.osc;
  this.played = false;
  this.volume = 0.5;
  this.pitch = f;
  this.buildSynth();
  this.play();
}

Drone.prototype.buildSynth = function(){
  this.osc = context.createOscillator(); // Create sound source
  this.osc.type = 2;
  this.osc.frequency.value = this.pitch;

  this.filter = context.createBiquadFilter();
  this.filter.type = 0;
  this.filter.frequency.value = 440;

  this.gain = context.createGain();
  this.gain.gain.value = this.volume;
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


function Synth(){
   this.activated =  false;
   this.notes = [220, 440, 880, 880*2];
   this.drones = [];
   this.droneRoot = randArray([146.83, 196, 220.00]);
}

Synth.prototype.touchActivate= function(e){

  if(!this.activated){
  var n = new Pluck(146.83*2);
  n.play();
  this.drones.forEach(function(d){
    d.stop();
  });
  this.drones = [];
  this.drones[0]= new Drone(this.droneRoot/2);
  this.drones[1]= new Drone(this.droneRoot);
  this.activated =  true;
  }
}

Synth.prototype.touchDeactivate= function(e){
   this.activated =  false;

  this.drones.forEach(function(d){
    d.stop();
  });
}


Synth.prototype.accelHandler = function(accel){
  var x = Math.abs(accel.acceleration.x) ;
  var y = Math.abs(accel.acceleration.y) ;
  var z = Math.abs(accel.acceleration.z) ;

  accelVal = Math.max(x,y,z);

  var change =map_range(accelVal, 0, 15, 100,1500);
  var qchange = quantize(change, q_notes)
  var interval = (new Date() - t)/1000;

  if(this.activated && ( interval >1/(accelVal+5))){
      var n = new Pluck(qchange);
      var tiltFB = orientEvent.beta;
      var filterval = map_range(tiltFB, -90, 90, 0, 10000);
      n.setFilter(filterval);
      n.play();
      t = new Date();
  }


  var droneFilter = map_range(accelVal, 0, 20, 100, 10000);
  this.drones.forEach(function(d){

      d.setFilter(droneFilter);
  });

}

var randArray = function(a){
  return a[Math.round(Math.random()*(a.length-1))];
}

var quantize = function(f, notes){
  var qnote = 0;
  notes.some(function(n){
      qnote = n;
      return f < n;
  });
  return qnote;
}

Synth.prototype.orientHandler = function(orient){
  orientEvent = orient;
}


function Graphic(){
  this.activated = false;;
  this.background_color="purple";
  this.x=0;
  this.y=0;
}

Graphic.prototype.touchActivate = function(e){
  this.activated = true;
  var c = e.gesture.center;
  this.cx = c.pageX;
  this.cy = c.pageY;
  var xRatio = this.cx/$(window).width();
  var yRatio = this.cy/$(window).height();
  this.x = xRatio;
  this.y = yRatio;
  this.decColor=base_color;

  emitter.pushd({x:Math.max(accelEvent.x,0.1), y:accelEvent.y, z:accelEvent.z, gamma: orientEvent.gamma , beta: orientEvent.beta , color: this.background_color, touchX: this.x, touchY: this.y});

  //$fun.css("background-color", this.background_color);
  $("#directions").hide();
}

Graphic.prototype.touchDeactivate = function(){
  this.activated = false;
  emitter.data.push({x:0, y:0, z:0, gamma: 0, beta: 0, color: graphic.background_color, deltaTime:0, touchX:this.x, touchY:this.y});
  $("#directions").show();
}

Graphic.prototype.accelHandler = function(accel){
 var h = accelVal;
 var h= map_range(accelVal, 0, 20, 0, 0.2);
 var c  = HSVtoRGB(h+base_color,1,1);
 this.decColor = h+base_color;
 if(this.decColor>1){this.decColor--;}
 this.background_color = "rgb("+c.r+","+c.g+","+c.b+")" ;
}

Graphic.prototype.orientHandler = function(orient){
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

function drawCircle(sketch, radius, offset){
       sketch.strokeWeight(20);
       sketch.noFill();
       sketch.stroke(0,0,1);
       sketch.ellipse(graphic.cx+offset,graphic.cy,radius,radius);

}

function circleGroup(sketch, offset){

      for(var i=0; i<5; i++){
      drawCircle(sketch,500-i*60, i*offset);
      }
}


var s = function( sketch ) {
  var gray = 0;
  sketch.setup = function() {
    sketch.createCanvas(window.innerWidth, window.innerHeight);
    sketch.colorMode("hsb");
    sketch.background(0.75,1,0.32);
  };
  sketch.draw = function() {
    if(!graphic.activated){
      sketch.background(0.75,1,0.32);
    }
    if(graphic.activated){
      var offset;
      if(typeof(orientEvent)!== "undefined" && orientEvent.gamma !== null){
        offset  = sketch.map(orientEvent.gamma, -90, 90, -1, 1);
      } else {
        offset = 0;
      }
      offset*=150;
      sketch.background(graphic.decColor,1,1);
      circleGroup(sketch, offset);
    }
  }
};

var infoAlert = function(){
  alert("CELLULAR by Kawandeep Virdee of New American Public Art. Turn the sound up on your phone.  Hold your thumb on the screen and slowly move your entire phone. Then tilt it and shake it.  The collaborative visuals are on cell-flight.com/mural.html. You will make sounds, and participate in the visuals.  Note: you will need to lock your phone orientation.");

}

$("#info").click(function(){
    infoAlert();
});
