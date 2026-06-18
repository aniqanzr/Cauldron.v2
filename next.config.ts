import type { NextConfig } from "next";
import os, { type NetworkInterfaceInfo } from "node:os";

function isLocalNetworkOrigin(
  networkInterface: NetworkInterfaceInfo | undefined,
): networkInterface is NetworkInterfaceInfo {
  if (!networkInterface) {
    return false;
  }

  return networkInterface.family === "IPv4" && !networkInterface.internal;
}

const localNetworkOrigins = Object.values(os.networkInterfaces())
  .flat()
  .filter(isLocalNetworkOrigin)
  .map((networkInterface) => networkInterface.address);

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    ...localNetworkOrigins,
    "*.ngrok-free.app",
    "*.ngrok.app",
    "*.ngrok.io",
  ],
};

export default nextConfig;
