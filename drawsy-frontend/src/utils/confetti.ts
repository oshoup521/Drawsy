import confetti from 'canvas-confetti';

// Winner celebration confetti
export const celebrateWinner = () => {
  // Burst from center
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 },
    zIndex: 9999
  });
  
  // Side cannons
  setTimeout(() => {
    confetti({
      particleCount: 50,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      zIndex: 9999
    });
    confetti({
      particleCount: 50,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      zIndex: 9999
    });
  }, 200);
};

// Podium celebration - more dramatic
export const celebratePodium = () => {
  // Create a custom canvas with higher z-index
  const canvas = document.createElement('canvas');
  canvas.style.position = 'fixed';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '10000';
  document.body.appendChild(canvas);

  const myConfetti = confetti.create(canvas, {
    resize: true,
    useWorker: true
  });

  const duration = 3000;
  const animationEnd = Date.now() + duration;
  const defaults = { startVelocity: 30, spread: 360, ticks: 60 };

  function randomInRange(min: number, max: number) {
    return Math.random() * (max - min) + min;
  }

  const interval: NodeJS.Timeout = setInterval(() => {
    const timeLeft = animationEnd - Date.now();

    if (timeLeft <= 0) {
      clearInterval(interval);
      // Clean up the canvas after animation
      setTimeout(() => {
        if (canvas.parentNode) {
          canvas.parentNode.removeChild(canvas);
        }
      }, 1000);
      return;
    }

    const particleCount = 50 * (timeLeft / duration);
    
    // Left side
    myConfetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
    });
    
    // Right side  
    myConfetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
    });
  }, 250);
};