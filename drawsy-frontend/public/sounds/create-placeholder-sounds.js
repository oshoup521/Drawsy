// Simple script to create placeholder sound files
// Run this in a browser console or as a Node.js script with appropriate audio libraries

const createBeepSound = (frequency, duration, filename) => {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const sampleRate = audioContext.sampleRate;
  const buffer = audioContext.createBuffer(1, duration * sampleRate, sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < data.length; i++) {
    const t = i / sampleRate;
    data[i] = Math.sin(2 * Math.PI * frequency * t) * 0.3 * Math.exp(-t * 3);
  }

  // Convert to WAV (simplified)
  const wav = audioBufferToWav(buffer);
  const blob = new Blob([wav], { type: 'audio/wav' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  
  URL.revokeObjectURL(url);
};

function audioBufferToWav(buffer) {
  const length = buffer.length;
  const arrayBuffer = new ArrayBuffer(44 + length * 2);
  const view = new DataView(arrayBuffer);
  const sampleRate = buffer.sampleRate;
  
  // WAV header
  const writeString = (offset, string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };
  
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + length * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, length * 2, true);
  
  const data = buffer.getChannelData(0);
  let offset = 44;
  for (let i = 0; i < length; i++) {
    const sample = Math.max(-1, Math.min(1, data[i]));
    view.setInt16(offset, sample * 0x7FFF, true);
    offset += 2;
  }
  
  return arrayBuffer;
}

// Create all the sounds
console.log('Creating placeholder sounds...');
createBeepSound(800, 0.3, 'lobby-message.wav');
createBeepSound(600, 0.3, 'game-message.wav');
createBeepSound(1000, 0.5, 'correct-guess.wav');
createBeepSound(300, 0.4, 'wrong-guess.wav');
createBeepSound(523, 1.5, 'winner-celebration.wav');
createBeepSound(659, 1.0, 'game-start.wav');
createBeepSound(784, 0.4, 'round-start.wav');
createBeepSound(400, 0.6, 'time-warning.wav');
createBeepSound(700, 0.3, 'player-join.wav');
createBeepSound(500, 0.3, 'player-leave.wav');