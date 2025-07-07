// Splash screen with particles and loader
const splash = document.getElementById('splash');
if (splash) {
  const canvas = splash.querySelector('canvas');
  const ctx = canvas.getContext('2d');
  let w = canvas.width = innerWidth;
  let h = canvas.height = innerHeight;

  const stars = Array.from({ length: 80 }, () => ({
    x: Math.random() * w,
    y: Math.random() * h,
    r: Math.random() * 1.5 + 0.5,
    a: Math.random()
  }));

  function draw() {
    ctx.clearRect(0, 0, w, h);
    stars.forEach(s => {
      s.a += (Math.random() - 0.5) * 0.05;
      if (s.a < 0.1) s.a = 0.1;
      if (s.a > 1) s.a = 1;
      ctx.fillStyle = `rgba(255,255,255,${s.a})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    });
    requestAnimationFrame(draw);
  }
  draw();

  addEventListener('resize', () => {
    w = canvas.width = innerWidth;
    h = canvas.height = innerHeight;
  });

  function hide() {
    splash.classList.add('hidden');
    splash.addEventListener('transitionend', () => splash.remove(), { once: true });
  }

  splash.addEventListener('click', hide);
  setTimeout(hide, 2500);
}
