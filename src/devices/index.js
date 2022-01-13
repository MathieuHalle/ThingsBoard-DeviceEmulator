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
