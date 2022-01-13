// First, some configuration.
// Let's generate 40 pins like on the Raspberry Pi for this demo.
// We will store them as a device attribute. We will then post those
// attributes to our ThingsBoard server.

const Device = require("./src/devices");

// Number of pins to generate
const numberOfPin = 40;
const clientAttrs = [];
// Generate and store in an array the attributes for each pin
for (let i = 1; i <= numberOfPin; i++) {
  clientAttrs.push({
    name: `Pin ${i}`,
    key: i,
    value: false,
  });
}

// Generate a new device
const rpi = new Device({
  mqtt: {
    host: "mqtt://mqtt.thingsboard.cloud", // <-- Change the MQTT Host
    config: {
      username: "replace_me", // <-- Add a valide devide token
    },
  },
  attributes: {
    client: clientAttrs,
  },
  rpc: [
    {
      name: "setGpioStatus",
      action: function (requestId, attr, device) {
        // Update the device pin status
        device.attributes.client[attr.params.pin] = attr.params.enabled;
        // Have the device send its attributes to the server
        device.postClientDeviceAttributes();

        // Prepare the response payload to send back to ThingsBoard
        let response = {};
        for (let i = 1; i <= numberOfPin; i++) {
          response[i] = device.attributes.client[i];
        }

        // Have the device send the response payload
        device.postDeviceRPCResponse(requestId, response);
      },
    },
    {
      name: "getGpioStatus",
      action: function (requestId, attr, device) {
        // Prepare the response payload to send back to ThingsBoard
        let response = {};
        for (let i = 1; i <= numberOfPin; i++) {
          response[i] = device.attributes.client[i];
        }
        // Have the device send the response payload
        device.postDeviceRPCResponse(requestId, response);
      },
    },
  ],
});
