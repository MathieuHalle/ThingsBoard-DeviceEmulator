const Device = require("./src/devices");

const numberOfPin = 40;
const clientAttrs = [];

for (let i = 1; i <= numberOfPin; i++) {
  clientAttrs.push({
    name: `Pin ${i}`,
    key: i,
    value: false,
  });
}

const rpi = new Device({
  mqtt: {
    host: "mqtt://mqtt.thingsboard.cloud", // thingsboard.cloud
    config: {
      username: "", // Xp4VqqZbulh31aT4XJ4K
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
        // Have the device send it's attribute to the server
        device.postClientDeviceAttributes();

        // Prepare the responce payload
        let response = {};
        for (let i = 1; i <= numberOfPin; i++) {
          response[i] = device.attributes.client[i];
        }

        // Have the device send the reponcse payload
        device.postDeviceRPCResponse(requestId, response);
      },
    },
    {
      name: "getGpioStatus",
      action: function (requestId, attr, device) {
        // Post RPC response
        let response = {};
        for (let i = 1; i <= numberOfPin; i++) {
          response[i] = device.attributes.client[i];
        }

        device.postDeviceRPCResponse(requestId, response);
      },
    },
  ],
});
