/* --------------------------------------------------
           Thingsboard device emulator
 -------------------------------------------------- */

const mqtt = require("mqtt");

class Device {
  constructor(options) {
    console.log("[INIT] Device >> " + new Date().toString() + " ");
    this.options = this.merge(options, {
      attributes: { client: [], shared: [], updateClientFromServer: false },
      telemetry: [],
      mqtt: {
        host: "127.0.0.1",
        config: {
          // port: 8883,
          // rejectUnauthorized: true,
          debug: true,
          // protocolId: "MQIsdp",
          // protocolVersion: 3,
          // connectTimeout: 10,
        },
        subscription: [
          "v1/devices/me/attributes",
          "v1/devices/me/attributes/response/+",
          "v1/devices/me/rpc/request/+",
          "v1/devices/me/rpc/response/+",
          "v1/gateway/attributes",
          "v1/gateway/rpc/+",
        ],
      },
    });

    // Default options
    this.attributes = {
      client: {
        fw_version: "2.0.0",
        fw_title: "Version 1." + Math.random(),
        fw_tag: "Version 1.0.0 Tags",
        fw_size: 0,
        fw_checksum_algorithm: "SHA256",
        fw_checksum: "",
      },
      shared: {},
    };

    this.getDeviceAttributesRequestID = 0;
    this.postDeviceRPCRequestID = 0;

    this.telemetry = [];

    this.rpc = {};

    // Init Client Attributs
    for (let i = 0, l = this.options.attributes.client.length; i < l; i++) {
      if (this.options.attributes.client[i].hasOwnProperty("key")) {
        this.attributes.client[this.options.attributes.client[i].key] =
          this.options.attributes.client[i].value;
      }
    }

    // Init Shared Attributs
    for (let i = 0, l = this.options.attributes.shared.length; i < l; i++) {
      if (this.options.attributes.shared[i].hasOwnProperty("key")) {
        this.attributes.shared[this.options.attributes.shared[i].key] =
          this.options.attributes.shared[i].value;
      }
    }

    // Init Telemetry
    for (let i = 0, l = this.options.telemetry.length; i < l; i++) {
      if (this.options.telemetry[i].hasOwnProperty("sendInterval")) {
        this.telemetry.push(this.options.telemetry[i]);
      }
    }

    // Init RPC
    if (this.options.hasOwnProperty("rpc")) {
      for (let i = 0, l = this.options.rpc.length; i < l; i++) {
        if (
          this.options.rpc[i].hasOwnProperty("name") &&
          this.options.rpc[i].hasOwnProperty("action")
        ) {
          this.rpc[this.options.rpc[i].name] = this.options.rpc[i].action;
        }
      }
    }

    // Init the mqtt connection
    this.mqttInit = false;
    if (options.mqtt.hasOwnProperty("host")) {
      this.client = mqtt.connect(
        this.options.mqtt.host,
        this.options.mqtt.config
      );

      this.client.on("error", (err) => {
        // console.log("[STATUS]  MQTTError error", err);
        this.onMQTTError(err);
        // this.client.end();
      });

      this.client.on("connect", (akn) => {
        this.onMQTTConnect();
      });

      this.client.on("reconnect", () => {
        console.log("[STATUS]  MQTTError reconnect");
      });

      this.client.on("message", (topic, message) => {
        // console.log("[STATUS]  On Message");
        this.onMQTTMessage(topic, message);
      });
    }
  } // End constructor()

  // MQTT events functions
  onMQTTError = function (error) {
    console.log(" [STATUS]  MQTTError", error);
  };

  onMQTTConnect = function () {
    console.log("[STATUS] onMQTTConnect : " + new Date().toString() + " ");

    // Subscribe to the various channels needed to communicate with Thingsbaord
    for (let i = 0, l = this.options.mqtt.subscription.length; i < l; i++) {
      this.client.subscribe(this.options.mqtt.subscription[i]);
    }

    // if the MQTT connection has not been initiated, start the various telemetry tasks
    if (!this.mqttInit) {
      this.mqttInit = true;

      for (let i = 0, l = this.telemetry.length; i < l; i++) {
        if (
          this.telemetry[i].hasOwnProperty("sendInterval") &&
          !this.telemetry[i].hasOwnProperty("sendRoutine")
        ) {
          // Initiate the communication routines for the device's telemetries
          clearInterval(this.telemetry[i].sendRoutine);
          let intval = setInterval(() => {
            let previousVal = this.telemetry[i].value;
            this.telemetry[i].value = this.telemetry[i].emulator(previousVal);

            this.postDeviceTelemetry(
              this.telemetry[i].key,
              this.telemetry[i].value
            );

            this.telemetry[i].sendRoutine;
          }, this.telemetry[i].sendInterval);

          this.telemetry[i].sendRoutine = intval;
          console.log("[INIT] Communication routine >>", this.telemetry[i].key);
        }
      }
    } // END this.mqttInit

    // Send the client attributes to ThingsBoard and request the attributes from the server
    this.postClientDeviceAttributes();
    this.getDeviceAttributes({});
  };

  onMQTTMessage = function (topic, message) {
    let msg = JSON.parse(message.toString());
    console.log("[STATUS] onMQTTMessage >>", topic, msg);

    // Listen for attribute updates from the server
    if (
      topic === "v1/devices/me/attributes" ||
      topic.indexOf("v1/devices/me/attributes/response/") !== -1
    ) {
      this.updateDeviceAttributes(msg);
    }

    // Listen for RPC requests from the server
    if (topic.indexOf("v1/devices/me/rpc/request/") !== -1) {
      let requestId = topic.slice("v1/devices/me/rpc/request/".length);
      this.executeDeviceRPC(requestId, msg);
    }
  };

  // Execute configured RPC commands received from ThingsBoard
  executeDeviceRPC = function (requestId, attrs) {
    if (this.rpc.hasOwnProperty(attrs.method)) {
      console.log("[RPC] executeDeviceRPC >>", requestId, attrs);
      this.rpc[attrs.method](requestId, attrs, this);
    }
  };

  // Update device attributes and executes the various task related
  updateDeviceAttributes = function (attrs) {
    // Update shared attributes
    if (attrs.hasOwnProperty("shared")) {
      this.attributes.shared = this.merge(attrs.shared, this.attributes.shared);
    }

    // Update client attributes
    if (
      attrs.hasOwnProperty("client") &&
      this.options.attributes.updateClientFromServer
    ) {
      this.attributes.client = this.merge(attrs.client, this.attributes.client);
    }

    // Check if there an action to execute for these attributes
    if (!attrs.hasOwnProperty("shared") && !attrs.hasOwnProperty("client")) {
      this.attributes.shared = this.merge(attrs, this.attributes.shared);

      // Check if there an action to execute for these attributes
      let key = Object.keys(attrs);
      for (let i = 0, l = key.length; i < l; i++) {
        let obj = this.options.attributes.shared.find((o) => o.key === key[i]);

        if (obj !== undefined && obj.hasOwnProperty("onUpdate")) {
          obj.onUpdate(attrs, this);
        }
      }
    }
  };

  postClientDeviceAttributes = function (attrs) {
    this.publishToMQTT("v1/devices/me/attributes", this.attributes.client);
  };

  postDeviceRPC = function (attrs) {
    this.postDeviceRPCRequestID++;
    console.log(
      "[MQTT] postDeviceRPC >> v1/devices/me/rpc/request/" +
        this.postDeviceRPCRequestID
    );
    this.publishToMQTT(
      "v1/devices/me/rpc/request/" + this.postDeviceRPCRequestID,
      attrs
    );
  };

  postDeviceRPCResponse = function (id, attrs) {
    console.log(
      "[MQTT] postDeviceRPCResponse >> v1/devices/me/rpc/response/" + id,
      attrs
    );
    this.publishToMQTT("v1/devices/me/rpc/response/" + id, attrs);
  };

  getDeviceAttributes = function (attrs) {
    this.getDeviceAttributesRequestID++;
    this.publishToMQTT(
      "v1/devices/me/attributes/request/" + this.getDeviceAttributesRequestID,
      attrs
    );
  };

  updateDeviceAttributesAction = function (key) {};

  // Post a single device telemetry
  postDeviceTelemetry = function (key, value) {
    let now = +new Date();
    let payload = {
      ts: now,
      values: {},
    };
    payload.values[key] = value;
    // console.log("postDeviceTelemetry >>", payload);
    this.publishToMQTT("v1/devices/me/telemetry", payload);
  };

  // Post all telemeries of the device
  postDeviceTelemetries = function () {
    let now = +new Date();
    let payload = {
      ts: now,
      values: {},
    };

    if (this.telemetry.length > 0) {
      for (let i = 0, l = this.telemetry.length; i < l; i++) {
        payload.values[this.telemetry[i].key] = this.telemetry[i].value;
      }
      // console.log("postDeviceTelemetry >>", payload);
      this.publishToMQTT("v1/devices/me/telemetry", payload);
    }
  };

  publishToMQTT = function (topic, payload) {
    this.client.publish(topic, JSON.stringify(payload), 1);
  };

  findTelemetryByKey = function (key) {
    let obj = arr.find((o) => o.key === key);
    return obj;
  };

  merge = function (source, target) {
    for (const [key, val] of Object.entries(source)) {
      if (val !== null && typeof val === `object`) {
        if (target[key] === undefined) {
          target[key] = new val.__proto__.constructor();
        }
        this.merge(val, target[key]);
      } else {
        target[key] = val;
      }
    }
    return target; // we're replacing in-situ, so this is more for chaining than anything else
  };
}

module.exports = Device;

// const mqtt = require("mqtt");
// // const mqtt = require("mqtt");

// class Kaliflah {
//   constructor(options) {
//     if (options.hasOwnProperty("host")) {
//       this.host = options.host;
//     }

//     if (options.hasOwnProperty("username")) {
//       this.username = options.username;
//     }

//     if (options.hasOwnProperty("versionSW")) {
//       this.versionSW = options.versionSW;
//     } else {
//       this.versionSW = "1.0";
//     }

//     if (options.hasOwnProperty("versionHW")) {
//       this.versionHW = options.versionHW;
//     } else {
//       this.versionHW = "1.0";
//     }

//     if (options.hasOwnProperty("versionBL")) {
//       this.versionBL = options.versionBL;
//     } else {
//       this.versionBL = "2.0";
//     }

//     if (options.hasOwnProperty("logLevel")) {
//       this.logLevel = options.logLevel;
//     } else {
//       this.logLevel = 1;
//     }

//     this.comRoutineTimeout = false;
//     this.comRoutineTimeoutDelay = 15000;

//     this.isMqttConnected = false;

//     this.now = new Date();

//     this.attr = {
//       upTime: this.now.toISOString(),
//       isIn1Connected: true,
//       isIn2Connected: true,
//       isIn3Connected: true,
//       isIn4Connected: true,
//       versionSW: this.versionSW,
//       versionHW: this.versionHW,
//       versionBL: this.versionBL,
//       versionSWLatest: null,
//     };

//     this.usageLog = [];

//     this.slaves = [];

//     this.outputStatus = {
//       out1: false,
//       out2: false,
//       out3: false,
//       out4: false,
//     };

//     this.attributesRequestId = 1;

//     this.generateRandomTelemetry();

//     this.init();
//   }

//   init() {
//     if (this.host) {
//       this.log(
//         "*************************** Init started ***************************",
//         100
//       );

//       this.log("User: " + this.username, 100);

//       this.client = mqtt.connect(this.host, {
//         username: this.username,
//         // rejectUnauthorized: false,
//         // port: 8883,
//         // // debug: true,
//         // // protocolId: "MQIsdp",
//         // // protocolVersion: 3,
//         // connectTimeout: 10,
//       });

//       this.client.stream.on("error", (err) => {
//         this.log("!!!!! error !!!!!", 100);
//         this.log(err, 100);
//         this.client.end();
//         console.log("######6666####", err);
//       });

//       this.client.on("connect", () => {
//         console.log("#########55#");
//         this.log(
//           "*************************** Master connected ***************************",
//           1
//         );
//         this.log(this.host, 1);

//         this.log(
//           "************************************************************************",
//           1
//         );
//         this.onConnect();
//         this.isMqttConnected = true;
//       });

//       this.client.on("message", (topic, message) => {
//         this.log("", 1);
//         this.log("", 1);
//         this.log("[*] onMessage --------------------", 1);
//         this.log("[*] Topic: " + topic, 1);
//         this.log("[*] message: " + message.toString(), 1);
//         this.log("**********", 1);

//         if (topic === "v1/gateway/rpc") {
//           this.onSlaveMessage(topic, message);
//         } else {
//           this.onMessage(topic, message);
//         }
//       });
//     }
//   }

//   onConnect() {
//     // subscribe to the various topics we'll use

//     // get updatess on attributes update
//     this.client.subscribe("v1/devices/me/attributes");
//     this.client.subscribe("v1/devices/me/attributes/response/+");

//     // getting the commands requests
//     this.client.subscribe("v1/devices/me/rpc/request/+");

//     // get slave attr
//     this.client.subscribe("v1/gateway/attributes");

//     // get slave commands
//     this.client.subscribe("v1/gateway/rpc/+");

//     console.log(
//       "*******************************************************************************"
//     );
//     console.log(
//       "*******************************************************************************"
//     );
//     console.log(
//       "*******************************************************************************"
//     );
//     console.log(
//       "*******************************************************************************"
//     );
//     console.log(
//       "*******************************************************************************"
//     );
//     console.log(
//       "*******************************************************************************"
//     );
//     console.log(
//       "*******************************************************************************"
//     );

//     // Send data on init
//     this.postTelemetry();
//     this.postAttributes();
//     this.requestMasterAttr(
//       "versionSWLatest,versionSWLatestURL,versionSWLatestChecksum,versionSWUpdateAfter,active"
//     );
//     this.startComRoutine();
//     console.log("onConnect");
//   }

//   requestMasterAttr(key) {
//     this.attributesRequestId++;
//     this.client.publish(
//       "v1/devices/me/attributes/request/" + this.attributesRequestId,
//       '{"sharedKeys":"' + key + '"}'
//     );
//   }

//   checkForUpdates() {
//     // console.log(
//     //   "Checking for updates ...",
//     //   this.attr.versionSW,
//     //   this.attr.versionSWLatest
//     // );
//     // console.log(this.attr);
//     if (this.attr.versionSW !== this.attr.versionSWLatest) {
//       // console.log("Updated needed");
//       this.attr.versionSW = this.attr.versionSWLatest;
//       this.postAttributes();
//     } else {
//       // console.log("Up to date");
//     }
//   }

//   onMessage(topic, message) {
//     let msgData = JSON.parse(message.toString());

//     if (topic === "v1/devices/me/attributes") {
//       this.attr = { ...this.attr, ...msgData };
//       this.checkForUpdates();

//       console.log(
//         "^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^\n",
//         topic,
//         msgData,
//         "\n^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^\n"
//       );

//       return true;
//     }

//     if (topic.indexOf("v1/devices/me/attributes/response/") !== -1) {
//       var requestId = topic.slice("v1/devices/me/attributes/response/".length);
//       // console.log("msgData", msgData);
//       this.attr = { ...this.attr, ...msgData.shared };
//       this.checkForUpdates();

//       console.log(
//         "^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^\n",
//         topic,
//         msgData,
//         "\n^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^\n"
//       );

//       return true;
//     }

//     var requestId = topic.slice("v1/devices/me/rpc/request/".length);

//     switch (msgData.method) {
//       case "postTelemetry":
//         msgData.params = { status: true };
//         this.postTelemetry();
//         break;

//       case "postAttributes":
//         msgData.params = { status: true };
//         this.postAttributes();
//         break;

//       case "postUsageLog":
//         msgData.params = { status: true };
//         this.postUsageLog();
//         break;

//       case "setOutputStatus":
//         this.setOutputStatus(msgData.params);
//         msgData.params = { status: true };
//         break;

//       case "setFlashPatternStatus":
//         this.setFlashPatternStatus(msgData.params);
//         msgData.params = { status: true };
//         break;

//       case "getOutputStatus":
//         msgData.params = this.outputStatus;
//         break;

//       default:
//         msgData.params = { status: true };
//         break;
//     }

//     this.log("", 1);
//     this.log("**********", 1);
//     this.log("[M] onMessage response --------------------", 1);
//     this.log("[M] message: " + JSON.stringify(msgData.params), 1);
//     this.log(
//       "----------------------------------------------------------------",
//       1
//     );
//     this.log("", 1);

//     this.client.publish(
//       "v1/devices/me/rpc/response/" + requestId,
//       JSON.stringify(msgData.params)
//     );
//   }

//   onSlaveMessage(topic, message) {
//     let msgData = JSON.parse(message.toString());
//     let device = this.slaves[msgData.device];
//     let data = { status: true };

//     switch (msgData.data.method) {
//       case "postTelemetry":
//         this.postSlaveTelemetry(device);
//         break;

//       case "postAttributes":
//         this.postSlaveAttributes(device);
//         break;

//       case "postUsageLog":
//         this.postSlaveUsageLog(device);
//         break;

//       case "setOutputStatus":
//         this.log(device);
//         device.setOutputStatus(msgData.data.params);
//         break;

//       case "getOutputStatus":
//         this.log("[S] Posting output status");
//         data = device.outputStatus;
//         break;

//       default:
//         msgData.params = { status: true };
//         break;
//     }

//     let msg = {
//       device: msgData.device,
//       id: msgData.data.id,
//       data: data,
//     };
//     this.log("", 1);
//     this.log("**********", 1);
//     this.log("[S] onSlaveMessage response --------------------", 1);
//     this.log("[S] message: " + JSON.stringify(msg), 1);
//     this.log(
//       "----------------------------------------------------------------",
//       1
//     );
//     this.log("", 1);
//     this.client.publish("v1/gateway/rpc", JSON.stringify(msg));
//   }

//   startComRoutine() {
//     let that = this;
//     console.log("COM ROUTINE !!!!!!");
//     this.comRoutine(this);

//     this.comRoutineTimeout = setTimeout(() => {
//       this.startComRoutine();
//     }, this.comRoutineTimeoutDelay);
//   }

//   comRoutine(device) {
//     if (device.host) {
//       device.postTelemetry();
//       device.postAttributes();
//     } else {
//       device.postSlaveAttributes(device);
//       device.postSlaveTelemetry(device);
//     }
//     device.fakeUsage(device);
//   }

//   /* ----
//       Slave devices notifications
// */

//   fakeUsage(device) {
//     if (device.host) {
//       // this.postTelemetry();
//       this.postAttributes();
//       this.generateFakeUsageLog(this);
//       this.postUsageLog();
//     } else {
//       // this.postSlaveAttributes(device);
//       // this.postSlaveTelemetry(device);
//       this.generateFakeUsageLog(device);
//       this.postSlaveUsageLog(device);
//     }
//   }

//   generateFakeUsageLog(device) {
//     const optionList = ["out1", "out2", "out3", "out4"];

//     let usageCount = Math.floor(Math.random() * 5);

//     for (let i = 0; i < usageCount; i++) {
//       setTimeout(() => {
//         device.addToUsageLog(
//           optionList[Math.floor(Math.random() * optionList.length)]
//         );
//       }, usageCount * i);
//     }
//   }

//   connectSlaveDevice(device) {
//     if (this.isMqttConnected) {
//       this.slaves = { ...this.slaves, [device.username]: device };
//       let msg = { device: device.username };
//       this.log("", 1);
//       this.log("[M] Connecting slave device: " + JSON.stringify(msg), 1);
//       this.client.publish("v1/gateway/connect", JSON.stringify(msg));
//       this.keepAliveSlaveDevice(device);

//       this.postSlaveAttributes(device);
//       this.postSlaveTelemetry(device);
//     }
//   }

//   keepAliveSlaveDevice(device) {
//     let intervall = setInterval(() => {
//       let msg = { device: device.username };
//       this.client.publish("v1/gateway/connect", JSON.stringify(msg));
//     }, 20000);
//   }

//   setOutputStatus(args) {
//     Object.keys(args).forEach((key) => {
//       this.log(key + ": " + args[key], 1);
//       this.log(
//         "[*] Changing the status for output: " + key,
//         args[key].status,
//         1
//       );
//       this.outputStatus[key] = args[key].status ? args[key].status : false;
//       this.addToUsageLog(key);
//     });

//     this.postAttributes();
//   }

//   setFlashPatternStatus(args) {
//     Object.keys(args).forEach((key) => {
//       this.log(key + ": " + args[key], 1);
//       this.log("[*] Changing the status for output: " + key, args[key], 1);
//       this.outputStatus[key] = args[key] ? args.type : false;
//       this.addToUsageLog(key);
//     });

//     this.postAttributes();
//   }

//   addToUsageLog(output) {
//     let logs = [];

//     logs.push({
//       ts: new Date().getTime() + Math.floor(Math.random() * 12),
//       values: {
//         input: ["remote"],
//         output: [output],
//       },
//     });

//     this.usageLog = [...this.usageLog, ...logs];
//   }

//   /* ----
//       Functions to generate random attributes
// */

//   getRandomInt(min, max) {
//     min = Math.ceil(min);
//     max = Math.floor(max);
//     return Math.random() * (max - min + 1) + min;
//   }

//   generateRandomTelemetry() {
//     let d = new Date();
//     let n = d.getHours();

//     let randomTelemetry = {
//       vBat: this.getRandomInt(9, 13).toFixed(2),
//       iBat: this.getRandomInt(2, 4).toFixed(2),
//       vChr: this.getRandomInt(12, 15).toFixed(2),
//       iChr: this.getRandomInt(4, 5).toFixed(2),
//       iOut: this.getRandomInt(0, 2).toFixed(2),
//       temp: this.getRandomInt(n, n * 0.3).toFixed(2),
//       light: this.getRandomInt(n, n * 1.2).toFixed(),
//       rssi: this.getRandomInt(n, n).toFixed(),
//     };

//     this.telemetry = { ...this.telemetry, ...randomTelemetry };
//   }

//   generateRandomAttributes() {
//     const locationList = [
//       { lat: 50.225037, lng: -66.361017 },
//       { lat: 50.206361, lng: -66.367471 },
//       { lat: 50.212566, lng: -66.37723 },
//       { lat: 50.202348, lng: -66.369547 },
//       { lat: 50.200108, lng: -66.375493 },
//       { lat: 50.204247, lng: -66.378576 },
//       { lat: 50.218646, lng: -66.369004 },
//       { lat: 50.226875, lng: -66.358913 },
//       { lat: 50.221956, lng: -66.355596 },
//       { lat: 50.223043, lng: -66.35039 },
//       { lat: 50.220855, lng: -66.356554 },
//       { lat: 50.23089, lng: -66.39293 },
//       { lat: 50.235487, lng: -66.383534 },
//       { lat: 50.229126, lng: -66.387986 },
//       { lat: 50.224032, lng: -66.403169 },
//       { lat: 50.217799, lng: -66.402547 },
//       { lat: 50.215911, lng: -66.402644 },
//       { lat: 50.213026, lng: -66.397955 },
//       { lat: 50.212333, lng: -66.397325 },
//       { lat: 50.209868, lng: -66.38974 },
//       { lat: 50.206256, lng: -66.388485 },
//       { lat: 50.202314, lng: -66.383936 },
//       { lat: 50.216644, lng: -66.382039 },
//     ];

//     // let randomAttributes =
//     //   locationList[Math.floor(Math.random() * locationList.length)];

//     let randomAttributes = {};

//     this.generateRandomInput();

//     this.attr = { ...this.attr, ...randomAttributes };
//   }

//   generateRandomInput() {
//     const optionList = [true, false];

//     let randmonInputStatus = {
//       isIn1Connected: optionList[Math.floor(Math.random() * optionList.length)],
//       isIn2Connected: optionList[Math.floor(Math.random() * optionList.length)],
//       isIn3Connected: optionList[Math.floor(Math.random() * optionList.length)],
//       isIn4Connected: optionList[Math.floor(Math.random() * optionList.length)],
//       isOut1Active: this.outputStatus.out1,
//       isOut2Active: this.outputStatus.out2,
//       isOut3Active: this.outputStatus.out3,
//       isOut4Active: this.outputStatus.out4,
//     };

//     this.attr = { ...this.attr, ...randmonInputStatus };
//   }

//   /* ----
//       Posting data to the server
// */

//   postAttributes() {
//     this.generateRandomAttributes();
//     this.log("", 1);
//     this.log("[M] Posting Attributes: ", JSON.stringify(this.attr), 1);
//     this.client.publish(
//       "v1/devices/me/attributes",
//       JSON.stringify(this.attr),
//       1
//     );
//   }

//   postTelemetry() {
//     this.generateRandomTelemetry();
//     this.log("", 1);
//     console.log(this.telemetry);
//     console.log("[M] Posting telemetry: ", JSON.stringify(this.telemetry), 1);
//     this.client.publish(
//       "v1/devices/me/telemetry",
//       JSON.stringify(this.telemetry)
//     );
//   }

//   postUsageLog() {
//     this.log("", 1);
//     this.log("[M] Posting Usage Log: " + JSON.stringify(this.usageLog), 1);

//     this.client.publish(
//       "v1/devices/me/telemetry",
//       JSON.stringify(this.usageLog)
//     );
//     this.usageLog = [];
//   }

//   postSlaveTelemetry(device) {
//     device.generateRandomTelemetry();
//     let msg = {
//       [device.username]: [
//         {
//           ts: new Date().getTime(),
//           values: {
//             ...device.telemetry,
//           },
//         },
//       ],
//     };

//     this.log("", 1);
//     this.log("[S] Posting Telemetry: ", JSON.stringify(msg), 1);

//     this.client.publish("v1/gateway/telemetry", JSON.stringify(msg));
//   }

//   postSlaveAttributes(device) {
//     device.generateRandomAttributes();

//     let msg = {
//       [device.username]: device.attr,
//     };

//     this.log("", 1);
//     this.log("[S] Posting Attributes: ", JSON.stringify(msg), 1);

//     // this.client.publish("v1/gateway/attributes", JSON.stringify(msg));
//   }

//   postSlaveUsageLog(device) {
//     device.addToUsageLog("out1");

//     let msg = {
//       [device.username]: [...device.usageLog],
//     };

//     this.log("", 1);
//     this.log("[S] Posting Usage Log: ", JSON.stringify(msg), 1);

//     this.client.publish("v1/gateway/telemetry", JSON.stringify(msg));

//     device.usageLog = [];
//   }

//   log(msg, lvl) {
//     if (lvl >= this.logLevel) {
//       console.log(msg);
//     }
//   }

//   formatAMPM(date) {
//     var hours = date.getHours();
//     var minutes = date.getMinutes();
//     var ampm = hours >= 12 ? "pm" : "am";
//     hours = hours % 12;
//     hours = hours ? hours : 12; // the hour '0' should be '12'
//     minutes = minutes < 10 ? "0" + minutes : minutes;
//     var strTime = hours + ":" + minutes + " " + ampm;
//     return strTime;
//   }
// }

// module.exports = Kaliflah;
