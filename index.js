// /*
//     Inlude our library
// */

// const mqtt = require("mqtt");

// const client = mqtt.connect("mqtt://mqtt.thingsboard.cloud", {
//   // port: 8883,
//   // rejectUnauthorized: true,
//   debug: true,
//   clean: true,
//   username: "HomHUDEykBxg36I85S40", // Xp4VqqZbulh31aT4XJ4K
//   // protocolId: "MQIsdp",
//   // protocolVersion: 3,
//   // connectTimeout: 10,
// });

// // console.log(this.options.mqtt.host, this.options.mqtt.config);

// client.on("error", (err) => {
//   console.log(" [STATUS]  MQTTError error", err);
//   // this.onMQTTError(err);
//   // this.client.end();
// });

// client.on("connect", (akn) => {
//   console.log(akn);
//   // this.onMQTTConnect();
// });

// client.on("reconnect", () => {
//   console.log(" [STATUS]  MQTTError reconnect");
// });

// client.on("message", (topic, message) => {
//   this.onMQTTMessage(topic, message);
// });
// }

const Device = require("./src/devices");
//

// # for ThingsBoard Cloud

// # Publish data as an object without timestamp (server-side timestamp will be used)
// mosquitto_pub -d -q 1 -h "mqtt.thingsboard.cloud"-t "v1/devices/me/telemetry" -u "HomHUDEykBxg36I85S40" -m "{"temperature":42}"
// # Publish data as an object without timestamp (server-side timestamp will be used) using data from file
// mosquitto_pub -d -q 1 -h "mqtt.thingsboard.cloud"-t "v1/devices/me/telemetry" -u "$ACCESS_TOKEN" -f "telemetry-data-as-object.json"
// # Publish data as an array of objects without timestamp (server-side timestamp will be used)  using data from file
// mosquitto_pub -d -q 1 -h "mqtt.thingsboard.cloud"-t "v1/devices/me/telemetry" -u "$ACCESS_TOKEN" -f "telemetry-data-as-array.json"
// # Publish data as an object with timestamp (telemetry timestamp will be used)  using data from file
// mosquitto_pub -d -q 1 -h "mqtt.thingsboard.cloud"-t "v1/devices/me/telemetry" -u "$ACCESS_TOKEN" -f "telemetry-data-with-ts.json"

// # for local ThingsBoard

// # Publish data as an object without timestamp (server-side timestamp will be used)
// mosquitto_pub -d -q 1 -h "127.0.0.1" -t "v1/devices/me/telemetry" -u "$ACCESS_TOKEN" -m "{"temperature":42}"
// # Publish data as an object without timestamp (server-side timestamp will be used) using data from file
// mosquitto_pub -d -q 1 -h "127.0.0.1" -t "v1/devices/me/telemetry" -u "$ACCESS_TOKEN" -f "telemetry-data-as-object.json"
// # Publish data as an array of objects without timestamp (server-side timestamp will be used) using data from file
// mosquitto_pub -d -q 1 -h "127.0.0.1" -t "v1/devices/me/telemetry" -u "$ACCESS_TOKEN" -f "telemetry-data-as-array.json"
// # Publish data as an object with timestamp (telemetry timestamp will be used) using data from file
// mosquitto_pub -d -q 1 -h "127.0.0.1" -t "v1/devices/me/telemetry" -u "$ACCESS_TOKEN" -f "telemetry-data-with-ts.json"

//no1kPj0qH0iWGNyykQNu

const numberOfPin = 40;
const clientAttrs = [];

for (let i = 1; i <= numberOfPin; i++) {
  clientAttrs.push({
    name: `Pin ${i}`,
    key: i,
    value: false,
  });
}

// console.log(clientAttrs);

const rpi = new Device({
  mqtt: {
    host: "mqtt://mqtt.thingsboard.cloud", // thingsboard.cloud
    config: {
      username: "DKA85BcZPI6O1ZJ8hb60", // Xp4VqqZbulh31aT4XJ4K
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

// const aaa = new Device({
//   mqtt: {
//     host: "mqtt://mqtt.thingsboard.cloud", // thingsboard.cloud
//     config: {
//       username: "DKA85BcZPI6O1ZJ8hb60", // Xp4VqqZbulh31aT4XJ4K
//     },
//   },
//   rpc: [
//     {
//       name: "rpcCommand_2",
//       action: function (requestId, attr, device) {
//         console.log(
//           "RPC rpcCommand_2 ACTION *************************************************",
//           attr
//           // device.telemetry
//         );

//         // Take action on telemetries
//         let obj = device.telemetry.map((o, i, arr) => {
//           if (o.key === "batAmp") {
//             arr[i].value = 111;
//           }
//           if (o.key === "batLvl") {
//             arr[i].value = 999;
//           }
//         });

//         device.postDeviceTelemetries();

//         let prevValue = parseFloat(device.attributes.client.Input1) || 0;
//         device.attributes.client.Input1 = prevValue + 1;
//         device.postClientDeviceAttributes();

//         // Post RPC response
//         device.postDeviceRPCResponse(requestId, attr);
//       },
//     },
//     {
//       name: "setGpioStatus",
//       action: function (requestId, attr, device) {
//         console.log(
//           "2222 RPC ACTION *************************************************",
//           attr
//           // device
//         );

//         // Post RPC response
//         device.postDeviceRPCResponse(requestId, {
//           1: true,
//           2: false,
//           3: false,
//           4: true,
//         });
//       },
//     },
//     {
//       name: "getGpioStatus",
//       action: function (requestId, attr, device) {
//         console.log(
//           "2222 RPC ACTION *************************************************",
//           attr
//           // device
//         );

//         // Post RPC response
//         device.postDeviceRPCResponse(requestId, {
//           1: false,
//           2: true,
//           3: true,
//           4: true,
//         });
//       },
//     },
//   ],
//   attributes: {
//     client: [
//       {
//         name: "Input 1",
//         key: "Input1",
//         value: "Input 5 Value Client",
//         onUpdate: function (attr, device) {
//           console.log(" >>>> >> ]]]]]]]]]]]]]]]]]]]]]]]]]]]]]] ----- [[");
//         },
//       },
//       {
//         name: "Input 2",
//         key: "Input2",
//         value: "Input 2 Value",
//       },
//     ],
//     shared: [
//       {
//         name: "Input 1",
//         key: "Input1",
//         value: "Input 5 Value Shared",
//         onUpdate: function (attr, device) {
//           console.log(" >>>> << ]]]]]]]]]]]]]]]]]]]]]]]]]]]]]] ----- [[");
//         },
//       },
//       {
//         name: "Input S1",
//         key: "InputS1",
//         value: "Input S1 Value",
//         onUpdate: function (attr, device) {
//           console.log("]]]]]]]]]]]]]]]]]]]]]]]]]]]]]] ----- [[");
//         },
//       },
//       {
//         name: "Input S2",
//         key: "InputS2",
//         value: "Input S2 Value",
//         onUpdate: function (attr, device) {
//           console.log("555555]]]]]]]]]]]]]]]]]]]]]]]]] ----- [[");
//         },
//       },
//     ],
//   },
//   telemetry: [
//     {
//       key: "batLvl",
//       sendInterval: 10000,
//       value: 3000,
//       emulator: function (prevValue) {
//         return Math.floor(Math.random() * 100);
//       },
//     },
//     {
//       key: "batAmp",
//       sendInterval: 10000,
//       value: 150,
//       emulator: function (prevValue) {
//         return Math.random() + 1 + prevValue;
//       },
//     },
//   ],
// });

// console.log(aaa);

// // Demo devices
// let devices_to_fake = [
//   "veRsOqA8SdK5t23ShQhB",
//   "MQjzRg27rpUFF5zzNvy4",
//   "EA2hpZUuXAlmbK2gza2c",
//   "1Heb7lZe6FTz403Fw4cl",
// ];

// const mqtt_host = "mqtt://tb.bertha.co";

// // Demo devices
// let devices_to_fake = [
//   "fwkQOwCRGsaXavMR5l4T",
//   "xu9IWSD4ocPzgtKPOyOY",
//   "ZfkeS2heDRouuiyk5pJU",
// ];

// const devices_arr = [];

// for (let i = 0, l = devices_to_fake.length; i < l; i++) {
//   let temp = new Kaliflah({
//     username: devices_to_fake[i],
//     host: mqtt_host,
//     logLevel: 0,
//   });

//   // temp.fakeUsage(temp);

//   devices_arr.push(temp);
// }

// let temp = new Kaliflah({
//   username: "fwkQOwCRGsaXavMR5l4T",
//   host: mqtt_host,
//   logLevel: 0,
// });

// console.log(devices_arr);
