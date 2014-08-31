'use strict';

var _ = require('lodash');
var add = require('./add');
var skynet = require('skynet');



console.log(add(2));

var subdeviceDefs = [
{"name":"greeting","type":"skynet-greeting","options":{"greetingPrefix":"holla"},"_id":"kPkXtCelG0rgGLtR"},
{"name":"greeting2","type":"skynet-greeting","options":{"greetingPrefix":"holla2"},"_id":"kPkXtCelG0rgGLt2"},
//{"name":"bean","type":"skynet-bean","options":{"uuid":"D0:39:72:C9:D5:F4"},"_id":"kPkXtCelG0rgGLt3"},
{"name":"ble","type":"skynet-ble","options":{},"_id":"kPkXtCelG0rgGL34"}
];

var instances = window.subdeviceInstances = {};

var skynetConfig = {
  uuid: localStorage.uuid,
  token: localStorage.token
// ,server: 'localhost'
// ,port: 3000
};

var conn = window.conn = skynet.createConnection(skynetConfig);

function Messenger(conn){
  this.skynet = conn;
  return this;
}

Messenger.prototype.send = function(data, cb){
  console.log('messenger send', data, cb);
  if(data.devices === skynetConfig.uuid && data.subdevice && data.payload){

    if(instances[data.subdevice] && instances[data.subdevice].onMessage){
      data.fromUuid = skynetConfig.uuid;
      instances[data.subdevice].onMessage(data, cb);
    }

  }else{
    this.skynet.emit('message',data, cb);
  }
};

Messenger.prototype.data = function(data, cb){
  console.log('messenger send', data, cb);
  if(data){
    data.uuid = skynetConfig.uuid;
    this.skynet.data(data, cb);
  }
};

console.log('skynetConfig', skynetConfig);

conn.on('notReady', function(err){
    console.log('UUID FAILED AUTHENTICATION!', err);
    // Register device
    conn.register({
      uuid: skynetConfig.uuid,
      token: skynetConfig.token,
      type: 'hubPage'
    }, function (data) {
      console.log('registered', data);
    });
});

function launchHub(){

//include with browserify, but load after page launch
var skynetGreeting = require('skynet-greeting');
var skynetRest = require('skynet-rest');
var skynetBle = require('skynet-ble');


conn.on('ready', function(data){
  skynetConfig = data;
  console.log('skynet connected', data);
  localStorage.uuid = data.uuid;
  localStorage.token = data.token;
  document.getElementById('uuid').innerHTML = skynetConfig.uuid;
  document.getElementById('token').innerHTML = skynetConfig.token;


  var messenger = new Messenger(conn);

  _.forEach(subdeviceDefs, function(subdef){
    try{
      console.log('creating subdevice', subdef);
      var Plugin = require(subdef.type).Plugin;
      instances[subdef.name] = new Plugin(messenger, subdef.options);
    }catch(err){
      console.log('error loading subdevice',err);
    }
  });

  console.log('instances', instances);

  conn.on('message', function(data, fn){

    console.log('\nmessage received from:', data.fromUuid);
    if(data.devices === skynetConfig.uuid){

      try{

        if(data.subdevice){
          var instance = instances[data.subdevice];

          if(instance && instance.onMessage){
            console.log('matching subdevice found:', data.subdevice);
            instance.onMessage(data, fn);
          }else{
            console.log('no matching subdevice:',data.subdevice);
          }
        }else{
          if(fn){
            console.log('responding');
            data.ack = true;
            fn(data);
          }
        }

      }catch(exp){
        console.log('err dispatching message', exp);
      }

    }

  });

});

}

window.launchHub = launchHub;
