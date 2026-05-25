const os = require("os");
const net = require("net");
const { SerialPort } = require("serialport");
require("dotenv").config();

const drawerType = process.env.DRAWER_TYPE || "lan";
const drawerIP = process.env.DRAWER_IP || "192.168.0.100";
const drawerPort = Number(process.env.DRAWER_PORT) || 9100;
const baudRate = Number(process.env.BAUD_RATE) || 9600;
const envSerialPort = process.env.SERIAL_PORT;

const DRAWER_CMD = Buffer.from([0x1B, 0x70, 0x00, 0x19, 0xFA]);
// Optional "close" command (stub - update with real code if supported)
const CLOSE_DRAWER_CMD = Buffer.from([0x1B, 0x70, 0x00, 0x00, 0x00]);

let detectedSerialPort = null;

async function openDrawer() {
  if (drawerType === "lan") {
    return openLanDrawer(DRAWER_CMD, "opened");
  } else if (drawerType === "usb" || drawerType === "serial") {
    return openUsbDrawer(DRAWER_CMD, "opened");
  } else {
    throw new Error("Invalid DRAWER_TYPE specified.");
  }
}

async function closeDrawer() {
  if (drawerType === "lan") {
    return openLanDrawer(CLOSE_DRAWER_CMD, "closed");
  } else if (drawerType === "usb" || drawerType === "serial") {
    return openUsbDrawer(CLOSE_DRAWER_CMD, "closed");
  } else {
    throw new Error("Invalid DRAWER_TYPE specified.");
  }
}

function openLanDrawer(command, label) {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();

    socket.connect(drawerPort, drawerIP, () => {
      socket.write(command);
      socket.end();
      resolve(`Drawer ${label} via LAN.`);
    });

    socket.on("error", (err) => {
      reject(`LAN drawer error: ${err.message}`);
    });
  });
}

async function openUsbDrawer(command, label) {
  const portPath = await getSerialPort();

  return new Promise((resolve, reject) => {
    const port = new SerialPort({
      path: portPath,
      baudRate: baudRate,
      autoOpen: false,
    });

    port.open((err) => {
      if (err) return reject(`Failed to open serial port: ${err.message}`);
      port.write(command, (writeErr) => {
        if (writeErr) return reject(`Failed to send drawer command: ${writeErr.message}`);
        port.close();
        resolve(`Drawer ${label} via USB (${portPath}).`);
      });
    });
  });
}

async function getAvailableSerialPorts() {
  const ports = await SerialPort.list();
  return ports.map((port) => port.path);
}

async function getSerialPort() {
  if (envSerialPort) return envSerialPort;

  if (detectedSerialPort) return detectedSerialPort;

  const ports = await getAvailableSerialPorts();

  if (!ports.length) {
    throw new Error("No serial ports detected.");
  }

  detectedSerialPort = ports[0];
  console.log(`Auto-selected serial port: ${detectedSerialPort}`);
  return detectedSerialPort;
}

module.exports = {
  openDrawer,
  closeDrawer,
  getAvailableSerialPorts,
};
