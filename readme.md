# Thingsboard Device Emulator

Thingsboard Device Emulator is a script to emulate a device that would connect to a Thingsboard's MQTT server and help the development of Dashboards, alarms, functions, and more.

This device could be a [Raspberry Pi](https://www.raspberrypi.org) or anything.

To start, edit `index.js` and update your host, and add a valid token. Then run `npm install` and then `npm run dev` in a terminal window, and you should be ready to go.

## Exemple

Emulates a Raspberry Pi that uses the [GPIO Widget](https://thingsboard.io/docs/user-guide/ui/widget-library/#gpio-widgets) from ThingsBoard.

```
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
        username: "your_device_token", // <-- Add a valide devide token
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

```
