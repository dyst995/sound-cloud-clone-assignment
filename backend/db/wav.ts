import fs from "fs";
import path from "path";

type Wave = "sine" | "square";

export function writeToneWav(
  filePath: string,
  options: { frequency: number; seconds: number; wave?: Wave },
): number {
  const sampleRate = 22050;
  const seconds = options.seconds;
  const numSamples = sampleRate * seconds;
  const dataSize = numSamples * 2;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);

  const fadeSamples = Math.floor(sampleRate * 0.03);
  for (let i = 0; i < numSamples; i += 1) {
    const time = i / sampleRate;
    const raw =
      options.wave === "square"
        ? Math.sign(Math.sin(2 * Math.PI * options.frequency * time))
        : Math.sin(2 * Math.PI * options.frequency * time);
    const fade = Math.min(1, i / fadeSamples, (numSamples - i) / fadeSamples);
    const sample = Math.max(-1, Math.min(1, raw * 0.25 * fade));
    buffer.writeInt16LE(Math.round(sample * 32767), 44 + i * 2);
  }

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, buffer);
  return seconds;
}
