// First, some configuration.
// Let's generate 40 pins like on the Raspberry Pi for this demo.
// We will store them as a device attribute. We will then post those
// attributes to our ThingsBoard server.

const Device = require("./src/devices");

// const mqttConfig = {
//   host: "mqtt://mqtt.thingsboard.cloud", // <-- Change the MQTT Host - api.dynamik.cc
//   config: {
//     username: "5Fbn87196NIOweGJiTTQ", // <-- Add a valide devide token - TQwsIvjbHKf9xJnKmo3h
//   },
// };

const mqttConfig = {
  host: "mqtt://10.0.0.251", // <-- Change the MQTT Host - api.dynamik.cc
  config: {
    username: "5Fbn87196NIOweGJiTTQ", // <-- Add a valide devide token - TQwsIvjbHKf9xJnKmo3h
  },
};

// Generate a new device
const rpi = new Device({
  mqtt: mqttConfig,
  attributes: {
    client: [
      {
        name: "isIn1Connected",
        key: "isIn1Connected",
        value: false,
      },
      {
        name: "isIn2Connected",
        key: "isIn2Connected",
        value: false,
      },
      {
        name: "isIn3Connected",
        key: "isIn1Connected",
        value: false,
      },
      {
        name: "isIn4Connected",
        key: "isIn4Connected",
        value: false,
      },
      {
        name: "isOut1Active",
        key: "isOut1Active",
        value: false,
      },
      {
        name: "isOut2Active",
        key: "isOut2Active",
        value: false,
      },
      {
        name: "isOut3Active",
        key: "isOut3Active",
        value: false,
      },
      {
        name: "isOut4Active",
        key: "isOut4Active",
        value: false,
      },
    ],
  },
  telemetry: [
    {
      key: "ber",
      sendInterval: 60000,
      value: 12,
      emulator: function (prevValue) {
        return Math.floor(
          normalizeRanges(new Date().getMinutes(), 0, 59, -100, 100),
          2
        );
      },
    },
    {
      key: "vBat",
      sendInterval: 60000,
      value: 12,
      emulator: function (prevValue) {
        let rez =
          Math.round(
            normalizeRanges(new Date().getHours(), 0, 24, 9.5, 12.5) * 100
          ) / 100;
        return rez;
      },
    },
    {
      key: "iBat",
      sendInterval: 60000,
      value: 0,
      emulator: function (prevValue) {
        return (
          Math.round(
            normalizeRanges(new Date().getMinutes(), 0, 59, 0.05, 1.5) * 100
          ) / 100
        );
      },
    },
    {
      key: "vChr",
      sendInterval: 60000,
      value: 12,
      emulator: function (prevValue) {
        let rez =
          Math.round(
            normalizeRanges(new Date().getHours(), 0, 24, 9.9, 12.9) * 100
          ) / 100;
        return rez;
      },
    },
    {
      key: "iChr",
      sendInterval: 60000,
      value: 0,
      emulator: function (prevValue) {
        return (
          Math.round(
            normalizeRanges(new Date().getHours(), 0, 24, 1.05, 2.5) * 100
          ) / 100
        );
      },
    },
    {
      key: "iOut",
      sendInterval: 60000,
      value: 0,
      emulator: function (prevValue) {
        return (
          Math.round(
            normalizeRanges(new Date().getHours(), 0, 24, 1.05, 2.5) * 100
          ) / 100
        );
      },
    },
    {
      key: "temp",
      sendInterval: 60000,
      value: 1,
      emulator: function (prevValue) {
        return (
          Math.round(
            normalizeRanges(new Date().getHours(), 0, 24, 0, 30) * 100
          ) / 100
        );
      },
    },
    {
      key: "light",
      sendInterval: 60000,
      value: 5,
      emulator: function (prevValue) {
        return Math.round(normalizeRanges(new Date().getHours(), 0, 24, 5, 75));
      },
    },
    {
      key: "input",
      sendInterval: 60000,
      value: '["input2"]',
      emulator: function (prevValue) {
        return new Date().getMinutes() % 2 == 0 ? '["915:5b43"]' : '["input2"]';
      },
    },
    {
      key: "output",
      sendInterval: 60000,
      value: '["output0","output1"]',
      emulator: function (prevValue) {
        return '["output0","output1"]';
      },
    },
  ],
  rpc: [
    {
      name: "setFlashPatternStatus",
      action: function (requestId, attr, device) {
        // Update the device attributtes
        if (attr.params.out1) {
          device.attributes.client.isOut1Active = attr.params.type;
        } else {
          device.attributes.client.isOut1Active = attr.params.out1;
        }
        if (attr.params.out2) {
          device.attributes.client.isOut2Active = attr.params.type;
        } else {
          device.attributes.client.isOut2Active = attr.params.out2;
        }
        if (attr.params.out3) {
          device.attributes.client.isOut3Active = attr.params.type;
        } else {
          device.attributes.client.isOut3Active = attr.params.out3;
        }
        if (attr.params.out4) {
          device.attributes.client.isOut4Active = attr.params.type;
        } else {
          device.attributes.client.isOut4Active = attr.params.out4;
        }

        // Have the device send its attributes to the server
        device.postClientDeviceAttributes();
      },
    },
    {
      name: "setHigh",
      action: function (requestId, attr, device) {
        console.log(attr.params);
        device.postDeviceTelemetry("vBat", attr.params.vBat);
        // Prepare the response payload to send back to ThingsBoard
        let response = true;
        // Have the device send the response payload
        if (attr.params.vBat == 9.9) {
          device.postDeviceRPCResponse(requestId, response).then((err) => {
            device.client.end(true, {}, function () {
              console.log("WE ARE DONE MOFO");
            });
          });
        }
      },
    },
  ],
});

// // const aaa = new Device({
// //   mqtt: {
// //     host: "mqtt://mqtt.thingsboard.cloud", // thingsboard.cloud
// //     config: {
// //       username: "DKA85BcZPI6O1ZJ8hb60", // Xp4VqqZbulh31aT4XJ4K
// //     },
// //   },
// //   rpc: [
// //     {
// //       name: "rpcCommand_2",
// //       action: function (requestId, attr, device) {
// //         console.log(
// //           "RPC rpcCommand_2 ACTION *************************************************",
// //           attr
// //           // device.telemetry
// //         );

// //         // Take action on telemetries
// //         let obj = device.telemetry.map((o, i, arr) => {
// //           if (o.key === "batAmp") {
// //             arr[i].value = 111;
// //           }
// //           if (o.key === "batLvl") {
// //             arr[i].value = 999;
// //           }
// //         });

// //         device.postDeviceTelemetries();

// //         let prevValue = parseFloat(device.attributes.client.Input1) || 0;
// //         device.attributes.client.Input1 = prevValue + 1;
// //         device.postClientDeviceAttributes();

// //         // Post RPC response
// //         device.postDeviceRPCResponse(requestId, attr);
// //       },
// //     },
// //     {
// //       name: "setGpioStatus",
// //       action: function (requestId, attr, device) {
// //         console.log(
// //           "2222 RPC ACTION *************************************************",
// //           attr
// //           // device
// //         );

// //         // Post RPC response
// //         device.postDeviceRPCResponse(requestId, {
// //           1: true,
// //           2: false,
// //           3: false,
// //           4: true,
// //         });
// //       },
// //     },
// //     {
// //       name: "getGpioStatus",
// //       action: function (requestId, attr, device) {
// //         console.log(
// //           "2222 RPC ACTION *************************************************",
// //           attr
// //           // device
// //         );

// //         // Post RPC response
// //         device.postDeviceRPCResponse(requestId, {
// //           1: false,
// //           2: true,
// //           3: true,
// //           4: true,
// //         });
// //       },
// //     },
// //   ],
// //   attributes: {
// //     client: [
// //       {
// //         name: "Input 1",
// //         key: "Input1",
// //         value: "Input 5 Value Client",
// //         onUpdate: function (attr, device) {
// //           console.log(" >>>> >> ]]]]]]]]]]]]]]]]]]]]]]]]]]]]]] ----- [[");
// //         },
// //       },
// //       {
// //         name: "Input 2",
// //         key: "Input2",
// //         value: "Input 2 Value",
// //       },
// //     ],
// //     shared: [
// //       {
// //         name: "Input 1",
// //         key: "Input1",
// //         value: "Input 5 Value Shared",
// //         onUpdate: function (attr, device) {
// //           console.log(" >>>> << ]]]]]]]]]]]]]]]]]]]]]]]]]]]]]] ----- [[");
// //         },
// //       },
// //       {
// //         name: "Input S1",
// //         key: "InputS1",
// //         value: "Input S1 Value",
// //         onUpdate: function (attr, device) {
// //           console.log("]]]]]]]]]]]]]]]]]]]]]]]]]]]]]] ----- [[");
// //         },
// //       },
// //       {
// //         name: "Input S2",
// //         key: "InputS2",
// //         value: "Input S2 Value",
// //         onUpdate: function (attr, device) {
// //           console.log("555555]]]]]]]]]]]]]]]]]]]]]]]]] ----- [[");
// //         },
// //       },
// //     ],
// //   },
// //   telemetry: [
// //     {
// //       key: "batLvl",
// //       sendInterval: 10000,
// //       value: 3000,
// //       emulator: function (prevValue) {
// //         return Math.floor(Math.random() * 100);
// //       },
// //     },
// //     {
// //       key: "batAmp",
// //       sendInterval: 10000,
// //       value: 150,
// //       emulator: function (prevValue) {
// //         return Math.random() + 1 + prevValue;
// //       },
// //     },
// //   ],
// // });

// // console.log(aaa);

// // // Demo devices
// // let devices_to_fake = [
// //   "veRsOqA8SdK5t23ShQhB",
// //   "MQjzRg27rpUFF5zzNvy4",
// //   "EA2hpZUuXAlmbK2gza2c",
// //   "1Heb7lZe6FTz403Fw4cl",
// // ];

// // const mqtt_host = "mqtt://tb.bertha.co";

// // // Demo devices
// // let devices_to_fake = [
// //   "fwkQOwCRGsaXavMR5l4T",
// //   "xu9IWSD4ocPzgtKPOyOY",
// //   "ZfkeS2heDRouuiyk5pJU",
// // ];

// // const devices_arr = [];

// // for (let i = 0, l = devices_to_fake.length; i < l; i++) {
// //   let temp = new Kaliflah({
// //     username: devices_to_fake[i],
// //     host: mqtt_host,
// //     logLevel: 0,
// //   });

// //   // temp.fakeUsage(temp);

// //   devices_arr.push(temp);
// // }

// // let temp = new Kaliflah({
// //   username: "fwkQOwCRGsaXavMR5l4T",
// //   host: mqtt_host,
// //   logLevel: 0,
// // });

// // console.log(devices_arr);

// let timeFraction = 10;
// let x = 0.5;

// let rez = Math.pow(2, 10 * (timeFraction - 1));

// setInterval(() => {
//   let rez = Math.floor(normalizeRanges(new Date().getSeconds(), 0, 59, 0, 10));

//   // // oscillator(
//   // //   parseInt(),
//   // //   1,
//   // //   1,
//   // //   (phase = 0),
//   // //   (offset = 0)
//   // // );
//   // console.log(rez, new Date().getSeconds());
// }, 1000);

// function oscillator(time, frequency = 1, amplitude = 1, phase = 0, offset = 0) {
//   return (
//     Math.sin(time * frequency * Math.PI * 2 + phase * Math.PI * 2) * amplitude +
//     offset
//   );
// }

// // function getRandomNumberBetween(min,max){
// //   return Math.floor(Math.random()*(max-min+1)+min);
// // }

function normalizeRanges(val, minVal, maxVal, newMin, newMax) {
  return newMin + ((val - minVal) * (newMax - newMin)) / (maxVal - minVal);
}
