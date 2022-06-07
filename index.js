/* --------------------------------------------------
           Dynamik device emulator
 -------------------------------------------------- */

const Device = require("./src/devices");

// Generate a new device
const rpi = new Device({
  mqtt: {
    host: "mqtt://mqtt.thingsboard.cloud", // <-- Change the MQTT Host
    config: {
      username: "5Fbn87196NIOweGJiTTQ", // <-- Add a valide devide token
    },
  },
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
      sendInterval: 1000,
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
  ],
});

function normalizeRanges(val, minVal, maxVal, newMin, newMax) {
  return newMin + ((val - minVal) * (newMax - newMin)) / (maxVal - minVal);
}
