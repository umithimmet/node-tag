
/*
 * node-tag application. Please refer to Readme.md file for install and usage.
 */


 /* Application Conf : */
 var READ_INFO = true; /* read sensor info */
 var ENABLE_THERM_SENSOR = true; /* enable sensor before reading if closed */
 var NOTIFY_PERIOD = 500; /* notify period */


/* Include required npm modules. */
var SensorTag = require('sensortag');
var async = require('async');
var ipc = require('node-ipc');

/**
 * Helper function to send data.
 */
function send_to_ipc_client(id, data) {
  ipc.server.broadcast(id, data);
}

/**
 * Helper function to send temperature.
 */
function send_temperature(objectTemperature, ambientTemperature) {
  console.log('\tobject temperature = %d °C', objectTemperature.toFixed(1));
  console.log('\tambient temperature = %d °C', ambientTemperature.toFixed(1))
  send_to_ipc_client('object_temperature', objectTemperature.toFixed(1));
  send_to_ipc_client('ambient_temperature', ambientTemperature.toFixed(1));
}

/**
 * Setup sensor reader.
 */
function setup_sensor_reader() {

  /*
  Start device discovery.

  If needed device type :
    if (sensorTag.type === 'cc2540') {}
    else if (sensorTag.type === 'cc2650') {}
    else {}
  */

  SensorTag.discover(function(sensorTag) {
    console.log('discovered: ' + sensorTag);
    /* if disconnected from client : */
    sensorTag.on('disconnect', function() {
      console.log('disconnected!');
      setup_sensor_reader();
    });

    /*
      Async.series() will call the given functions in the array, at given order.
      To proceed next function at the array, we have to call
      callback(error,result) with no error. For ex: callback(), or
      callback(null). If call callback with error, calling chain will be broken.
    */
    async.series([
      function(callback) {
        console.log('connectAndSetUp');
        sensorTag.connectAndSetUp(callback);
      },
      function(callback) {
        if (READ_INFO)
          return callback();
        console.log('readDeviceName');
        sensorTag.readDeviceName(function(error, deviceName) {
          console.log('\tdevice name = ' + deviceName);
          callback();
        });
      },
      function(callback) {
        if (READ_INFO)
          return callback();
        console.log('readSystemId');
        sensorTag.readSystemId(function(error, systemId) {
          console.log('\tsystem id = ' + systemId);
          callback();
        });
      },
      function(callback) {
        if (READ_INFO)
          return callback();
        console.log('readSerialNumber');
        sensorTag.readSerialNumber(function(error, serialNumber) {
          console.log('\tserial number = ' + serialNumber);
          callback();
        });
      },
      function(callback) {
        if (READ_INFO)
          return callback();
        console.log('readFirmwareRevision');
        sensorTag.readFirmwareRevision(function(error, firmwareRevision) {
          console.log('\tfirmware revision = ' + firmwareRevision);
          callback();
        });
      },
      function(callback) {
        if (READ_INFO)
          return callback();
        console.log('readHardwareRevision');
        sensorTag.readHardwareRevision(function(error, hardwareRevision) {
          console.log('\thardware revision = ' + hardwareRevision);
          callback();
        });
      },
      function(callback) {
        if (READ_INFO)
          return callback();
        console.log('readSoftwareRevision');
        sensorTag.readHardwareRevision(function(error, softwareRevision) {
          console.log('\tsoftware revision = ' + softwareRevision);
          callback();
        });
      },
      function(callback) {
        if (READ_INFO)
          return callback();
        console.log('readManufacturerName');
        sensorTag.readManufacturerName(function(error, manufacturerName) {
          console.log('\tmanufacturer name = ' + manufacturerName);
          callback();
        });
      },
      function(callback) {
        if (ENABLE_THERM_SENSOR !== true)
          return callback();
        console.log('enableIrTemperature');
        sensorTag.enableIrTemperature(callback);
      },
      function(callback) {
        if (ENABLE_THERM_SENSOR !== true)
          return callback();
        console.log('wait 2 sec to enable ... ');
        setTimeout(callback, 2000);
      },
      function(callback) {
        /* Setup temperature change event: */
        sensorTag.on('irTemperatureChange', send_temperature);
        /* Start temperature notification: */
        console.log('setIrTemperaturePeriod');
        sensorTag.setIrTemperaturePeriod(NOTIFY_PERIOD, function(error) {
          console.log('notifyIrTemperature');
          sensorTag.notifyIrTemperature(callback);
        });
      }
    ]);
  });
}

/**
 * Listens from IPC. If any incoming connection, starts sensor read process and
 * sends sensor value to IPC client.
 * Default serve path :
 *   ipc.config.socketRoot + ipc.config.appspace + ipc.config.id
 *   Example : /tmp/app.node-tag
 */
function listen_from_ipc() {
  /*
  Below configurations are from node-ipc doc:
    https://github.com/RIAEvangelist/node-ipc#types-of-ipc-sockets
  ipc.config = {
      appspace        : 'app.',
      socketRoot      : '/tmp/',
      id              : os.hostname(),
      networkHost     : 'localhost',
      networkPort     : 8000,
      encoding        : 'utf8',
      rawBuffer       : false,
      silent          : false,
      maxConnections  : 100,
      retry           : 500,
      maxRetries      : false,
      stopRetrying    : false
  };
  */
  ipc.config.id = 'node-tag';
  ipc.config.rawBuffer = true;
  ipc.config.encoding = 'ascii';

  ipc.serve("/tmp/antsis.node-tag", function() {
    ipc.server.on('connect', function(socket) {
        ipc.log('socket connected'.debug, socket);
        setup_sensor_reader();
    });
    ipc.server.on('data', function(data,socket) {
        ipc.log('got a message'.debug, data,data.toString());
    });
    ipc.server.on('error', function(error) {
      console.log("ipc.serve error : " + error);
    });
  });

  ipc.server.start();
}

/**
 * Exit helper function.
 */
function at_exit() {
  if (ipc.server) {
    /* https://github.com/RIAEvangelist/node-ipc/issues/2 */
    ipc.server.server.close();
  }
}

/*
 * Init function decleration. Call will be at the end of the file.
 */
function main() {

  process.on('SIGINT', function() {
    console.log("Caught interrupt signal. Relasing resources.");
    at_exit();
    process.exit();
  });
  process.on('SIGTERM', function() {
    console.log("Caught termination signal. Releasing resources.");
    at_exit();
    process.exit();
  });
  process.on('uncaughtException', function() {
    console.log("Caught unhandled exception. Relasing resources.");
    at_exit();
    process.exit();
  });

  listen_from_ipc();
}

/**
 * Start the app
 */
main();
