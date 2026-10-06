export type SubnetReference = {
  prefix: 24 | 25 | 26 | 27 | 28;
  mask: string;
  maskOctet: number;
  hostBits: number;
  totalAddresses: number;
  traditionalHostCount: number;
  blockSize: number;
};

export const subnetReferences = [
  { prefix: 24, mask: "255.255.255.0", maskOctet: 0, hostBits: 8, totalAddresses: 256, traditionalHostCount: 254, blockSize: 256 },
  { prefix: 25, mask: "255.255.255.128", maskOctet: 128, hostBits: 7, totalAddresses: 128, traditionalHostCount: 126, blockSize: 128 },
  { prefix: 26, mask: "255.255.255.192", maskOctet: 192, hostBits: 6, totalAddresses: 64, traditionalHostCount: 62, blockSize: 64 },
  { prefix: 27, mask: "255.255.255.224", maskOctet: 224, hostBits: 5, totalAddresses: 32, traditionalHostCount: 30, blockSize: 32 },
  { prefix: 28, mask: "255.255.255.240", maskOctet: 240, hostBits: 4, totalAddresses: 16, traditionalHostCount: 14, blockSize: 16 },
] as const satisfies readonly SubnetReference[];

export function getSubnetReference(prefix: SubnetReference["prefix"]) {
  return subnetReferences.find((item) => item.prefix === prefix)!;
}
