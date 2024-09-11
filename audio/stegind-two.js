// jangan lupa install dulu
const fs = require('fs');
const wav = require('node-wav'); 
const jimp = require('jimp');
const crypto = require('crypto');

// Fungsi untuk mengkonversi buffer ke array bit
function bufferToBitArray(buffer) {
    const bitArray = [];
    for (const byte of buffer) {
        for (let i = 7; i >= 0; i--) {
            bitArray.push((byte >> i) & 1);
        }
    }
    return bitArray;
}

// Fungsi untuk mengkonversi array bit ke buffer
function bitArrayToBuffer(bitArray) {
    const buffer = Buffer.alloc(Math.ceil(bitArray.length / 8));
    for (let i = 0; i < bitArray.length; i++) {
        const byteIndex = Math.floor(i / 8);
        const bitIndex = i % 8;
        buffer[byteIndex] |= bitArray[i] << (7 - bitIndex);
    }
    return buffer;
}

// Fungsi untuk menghasilkan pseudorandom sequence
function generatePRSequence(seed, length) {
    const prng = crypto.createHash('sha256').update(seed).digest();
    let sequence = [];
    for (let i = 0; i < length; i++) {
        sequence.push(prng[i % prng.length] & 1);
    }
    return sequence;
}

// Fungsi untuk menyembunyikan data menggunakan Spread Spectrum
function embedData(audioData, data, key) {
    const bitArray = bufferToBitArray(data);
    const prSequence = generatePRSequence(key, audioData.length);
    const spreadFactor = Math.floor(audioData.length / bitArray.length);
    
    for (let i = 0; i < bitArray.length; i++) {
        for (let j = 0; j < spreadFactor; j++) {
            const index = i * spreadFactor + j;
            audioData[index] += (bitArray[i] * 2 - 1) * prSequence[index] * 0.01;
        }
    }
    
    return audioData;
}

// Fungsi untuk mengekstrak data menggunakan Spread Spectrum
function extractData(audioData, dataLength, key) {
    const prSequence = generatePRSequence(key, audioData.length);
    const spreadFactor = Math.floor(audioData.length / (dataLength * 8));
    const extractedBits = [];
    
    for (let i = 0; i < dataLength * 8; i++) {
        let sum = 0;
        for (let j = 0; j < spreadFactor; j++) {
            const index = i * spreadFactor + j;
            sum += audioData[index] * prSequence[index];
        }
        extractedBits.push(sum > 0 ? 1 : 0);
    }
    
    return bitArrayToBuffer(extractedBits);
}

// Fungsi utama untuk menyembunyikan gambar dalam audio
async function hideImage(inputAudioPath, inputImagePath, outputAudioPath, key) {
    // Baca file audio
    const wavData = wav.decode(fs.readFileSync(inputAudioPath));
    const audioBuffer = wavData.channelData[0]; // Gunakan channel pertama

    // Baca dan proses gambar
    const image = await jimp.read(inputImagePath);
    const imageBuffer = await image.getBufferAsync(jimp.MIME_PNG);

    // Sembunyikan ukuran gambar terlebih dahulu
    const sizeBuffer = Buffer.alloc(4);
    sizeBuffer.writeUInt32BE(imageBuffer.length);
    
    // Gabungkan ukuran dan data gambar
    const dataToHide = Buffer.concat([sizeBuffer, imageBuffer]);

    // Sembunyikan data
    const modifiedAudioBuffer = embedData(audioBuffer, dataToHide, key);

    // Tulis kembali file audio
    const encodedWav = wav.encode([modifiedAudioBuffer], {
        sampleRate: wavData.sampleRate,
        float: true,
        bitDepth: 32
    });
    fs.writeFileSync(outputAudioPath, encodedWav);

    console.log('Gambar berhasil disembunyikan dalam file audio.');
}

// Fungsi utama untuk mengekstrak gambar dari audio
async function extractImage(inputAudioPath, outputImagePath, key) {
    // Baca file audio
    const wavData = wav.decode(fs.readFileSync(inputAudioPath));
    const audioBuffer = wavData.channelData[0];

    // Ekstrak ukuran gambar terlebih dahulu
    const sizeBuffer = extractData(audioBuffer, 4, key);
    const imageSize = sizeBuffer.readUInt32BE();

    // Ekstrak data gambar
    const imageBuffer = extractData(audioBuffer.slice(4 * 8), imageSize, key);

    // Tulis file gambar
    fs.writeFileSync(outputImagePath, imageBuffer);

    console.log('Gambar berhasil diekstrak dari file audio.');
}

// Contoh penggunaan
const inputAudioPath = 'input.wav';
const inputImagePath = 'input.png';
const outputAudioPath = 'output_with_image.wav';
const extractedImagePath = 'extracted_image.png';
const secretKey = 'rahasia';

// Sembunyikan gambar
hideImage(inputAudioPath, inputImagePath, outputAudioPath, secretKey)
    .then(() => {
        // Ekstrak gambar
        return extractImage(outputAudioPath, extractedImagePath, secretKey);
    })
    .catch(console.error);
