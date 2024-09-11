const fs = require('fs');
const wav = require('node-wav');

function stringToBinary(str) {
  return str.split('').map(char => 
    char.charCodeAt(0).toString(2).padStart(8, '0')
  ).join('');
}

function binaryToString(binary) {
  return binary.match(/.{1,8}/g).map(byte => 
    String.fromCharCode(parseInt(byte, 2))
  ).join('');
}

function embedMessage(audioBuffer, message) {
  const binaryMessage = stringToBinary(message) + '00000000'; // End marker
  let messageIndex = 0;

  for (let i = 0; i < audioBuffer.length && messageIndex < binaryMessage.length; i++) {
    const sample = audioBuffer[i];
    const binary = Math.abs(Math.round(sample * 32767)).toString(2).padStart(16, '0');
    const newLSB = binaryMessage[messageIndex];
    const newBinary = binary.slice(0, -1) + newLSB;
    audioBuffer[i] = parseInt(newBinary, 2) / 32767 * Math.sign(sample);
    messageIndex++;
  }

  return audioBuffer;
}

function extractMessage(audioBuffer) {
  let binaryMessage = '';
  let byte = '';

  for (let i = 0; i < audioBuffer.length; i++) {
    const sample = audioBuffer[i];
    const binary = Math.abs(Math.round(sample * 32767)).toString(2).padStart(16, '0');
    byte += binary[binary.length - 1];

    if (byte.length === 8) {
      if (byte === '00000000') {
        break;
      }
      binaryMessage += byte;
      byte = '';
    }
  }

  return binaryToString(binaryMessage);
}

// Fungsi untuk menyembunyikan pesan
function hideMessage(inputFile, outputFile, message) {
  const wavData = wav.decode(fs.readFileSync(inputFile));
  const modifiedBuffer = embedMessage(wavData.channelData[0], message);
  const encodedWav = wav.encode([modifiedBuffer], { sampleRate: wavData.sampleRate, float: true, bitDepth: 32 });
  fs.writeFileSync(outputFile, encodedWav);
  console.log('Pesan berhasil disembunyikan.');
}

// Fungsi untuk mengekstrak pesan
function revealMessage(inputFile) {
  const wavData = wav.decode(fs.readFileSync(inputFile));
  const extractedMessage = extractMessage(wavData.channelData[0]);
  console.log('Pesan yang diekstrak:', extractedMessage);
}

// Contoh penggunaan
const inputFile = 'input.wav';
const outputFile = 'output_with_message.wav';
const secretMessage = 'Ini adalah pesan rahasia!';

hideMessage(inputFile, outputFile, secretMessage);
revealMessage(outputFile);
