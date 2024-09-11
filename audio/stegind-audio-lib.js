const fs = require('fs');

class MP3Manipulator {
  constructor(filePath) {
    this.filePath = filePath;
    this.buffer = null;
    this.header = null;
  }

  // Membaca file MP3
  readFile() {
    return new Promise((resolve, reject) => {
      fs.readFile(this.filePath, (err, data) => {
        if (err) reject(err);
        this.buffer = data;
        this.parseHeader();
        resolve();
      });
    });
  }

  // Parsing header MP3
  parseHeader() {
    if (!this.buffer) throw new Error('File belum dibaca');

    // Mencari frame sync
    let offset = 0;
    while (offset < this.buffer.length - 1) {
      if (this.buffer[offset] === 0xFF && (this.buffer[offset + 1] & 0xE0) === 0xE0) {
        break;
      }
      offset++;
    }

    if (offset === this.buffer.length - 1) {
      throw new Error('MP3 header tidak ditemukan');
    }

    this.header = {
      frameSync: this.buffer.readUInt16BE(offset),
      version: (this.buffer[offset + 1] & 0x18) >> 3,
      layer: (this.buffer[offset + 1] & 0x06) >> 1,
      protectionBit: this.buffer[offset + 1] & 0x01,
      bitrateIndex: (this.buffer[offset + 2] & 0xF0) >> 4,
      samplingRateIndex: (this.buffer[offset + 2] & 0x0C) >> 2,
      paddingBit: (this.buffer[offset + 2] & 0x02) >> 1,
      privateBit: this.buffer[offset + 2] & 0x01,
      channelMode: (this.buffer[offset + 3] & 0xC0) >> 6,
      modeExtension: (this.buffer[offset + 3] & 0x30) >> 4,
      copyright: (this.buffer[offset + 3] & 0x08) >> 3,
      original: (this.buffer[offset + 3] & 0x04) >> 2,
      emphasis: this.buffer[offset + 3] & 0x03
    };
  }

  // Mendapatkan informasi MP3
  getInfo() {
    if (!this.header) throw new Error('Header belum diparsing');

    const versionTable = ['MPEG Version 2.5', 'Reserved', 'MPEG Version 2', 'MPEG Version 1'];
    const layerTable = ['Reserved', 'Layer III', 'Layer II', 'Layer I'];
    const bitrateTable = [
      [0, 32, 64, 96, 128, 160, 192, 224, 256, 288, 320, 352, 384, 416, 448],
      [0, 32, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 384],
      [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320]
    ];
    const samplingRateTable = [
      [44100, 48000, 32000],
      [22050, 24000, 16000],
      [11025, 12000, 8000]
    ];
    const channelModeTable = ['Stereo', 'Joint Stereo', 'Dual Channel', 'Single Channel'];

    return {
      version: versionTable[this.header.version],
      layer: layerTable[this.header.layer],
      bitrate: bitrateTable[this.header.version][this.header.bitrateIndex],
      samplingRate: samplingRateTable[this.header.version][this.header.samplingRateIndex],
      channelMode: channelModeTable[this.header.channelMode]
    };
  }

  // Menyembunyikan data dalam frame MP3
  hideData(data) {
    if (!this.buffer) throw new Error('File belum dibaca');

    // Implementasi sederhana: menyisipkan data di akhir file
    // Perhatian: Ini bukan metode steganografi yang aman atau robust
    const newBuffer = Buffer.concat([this.buffer, Buffer.from(data)]);
    this.buffer = newBuffer;
  }

  // Mengekstrak data tersembunyi
  extractHiddenData(length, offset = this.buffer.length - length) {
    if (!this.buffer) throw new Error('File belum dibaca');

    return this.buffer.slice(offset, offset + length).toString();
  }

  // Menyimpan file MP3 yang telah dimodifikasi
  saveFile(outputPath) {
    return new Promise((resolve, reject) => {
      fs.writeFile(outputPath, this.buffer, (err) => {
        if (err) reject(err);
        resolve();
      });
    });
  }
}

module.exports = MP3Manipulator;

// Contoh penggunaan
async function example() {
  const manipulator = new MP3Manipulator('input.mp3');
  
  try {
    await manipulator.readFile();
    console.log('Informasi MP3:', manipulator.getInfo());

    manipulator.hideData('Data rahasia');
    await manipulator.saveFile('output.mp3');
    console.log('File berhasil disimpan dengan data tersembunyi');

    const extractedData = manipulator.extractHiddenData('Data rahasia'.length);
    console.log('Data yang diekstrak:', extractedData);
  } catch (error) {
    console.error('Terjadi kesalahan:', error.message);
  }
}

example();
