<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    maxLife: number;
    size: number;
    color: string;
    type: 'star' | 'dust' | 'energy';
  }

  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D | null = null;
  let particles: Particle[] = [];
  let animationId: number | null = null;
  let mouse = { x: 0, y: 0 };

  const particleCount = 150;
  const colors = [
    'rgba(147, 51, 234, 0.8)', // Purple
    'rgba(59, 130, 246, 0.8)', // Blue
    'rgba(236, 72, 153, 0.8)', // Pink
    'rgba(139, 92, 246, 0.8)', // Violet
    'rgba(34, 197, 94, 0.8)',  // Green
    'rgba(251, 146, 60, 0.8)', // Orange
  ];

  onMount(() => {
    if (!canvas) return;

    ctx = canvas.getContext('2d');
    if (!ctx) return;

    resizeCanvas();
    initParticles();
    animate();

    const handleResize = () => resizeCanvas();
    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  });

  function resizeCanvas() {
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }

  function initParticles() {
    particles = [];
    for (let i = 0; i < particleCount; i++) {
      createParticle();
    }
  }

  function createParticle() {
    const types: ('star' | 'dust' | 'energy')[] = ['star', 'dust', 'energy'];
    const type = types[Math.floor(Math.random() * types.length)];
    
    particles.push({
      x: Math.random() * (canvas?.width || window.innerWidth),
      y: Math.random() * (canvas?.height || window.innerHeight),
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      life: Math.random() * 100,
      maxLife: 100 + Math.random() * 100,
      size: type === 'star' ? Math.random() * 2 + 1 : Math.random() * 3 + 0.5,
      color: colors[Math.floor(Math.random() * colors.length)],
      type
    });
  }

  function updateParticles() {
    particles.forEach((particle, index) => {
      // Update position
      particle.x += particle.vx;
      particle.y += particle.vy;

      // Mouse interaction
      const dx = mouse.x - particle.x;
      const dy = mouse.y - particle.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < 100) {
        const force = (100 - distance) / 100;
        particle.vx += dx * force * 0.0001;
        particle.vy += dy * force * 0.0001;
      }

      // Update life
      particle.life += 0.5;

      // Reset particle if it goes off screen or dies
      if (particle.x < -10 || particle.x > (canvas?.width || 0) + 10 || 
          particle.y < -10 || particle.y > (canvas?.height || 0) + 10 ||
          particle.life > particle.maxLife) {
        particles[index] = {
          x: Math.random() * (canvas?.width || window.innerWidth),
          y: Math.random() * (canvas?.height || window.innerHeight),
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          life: 0,
          maxLife: 100 + Math.random() * 100,
          size: particle.type === 'star' ? Math.random() * 2 + 1 : Math.random() * 3 + 0.5,
          color: colors[Math.floor(Math.random() * colors.length)],
          type: particle.type
        };
      }
    });
  }

  function drawParticles() {
    if (!ctx || !canvas) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    particles.forEach(particle => {
      if (!ctx) return;
      const alpha = 1 - (particle.life / particle.maxLife);
      ctx.save();

      ctx.globalAlpha = alpha;
      ctx.fillStyle = particle.color;

      if (particle.type === 'star') {
        // Draw twinkling star
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
        
        // Add sparkle effect
        ctx.globalAlpha = alpha * 0.5;
        ctx.strokeStyle = particle.color;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(particle.x - particle.size * 2, particle.y);
        ctx.lineTo(particle.x + particle.size * 2, particle.y);
        ctx.moveTo(particle.x, particle.y - particle.size * 2);
        ctx.lineTo(particle.x, particle.y + particle.size * 2);
        ctx.stroke();

      } else if (particle.type === 'dust') {
        // Draw cosmic dust
        ctx.globalAlpha = alpha * 0.6;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();

      } else if (particle.type === 'energy') {
        // Draw energy particle with glow
        const gradient = ctx.createRadialGradient(
          particle.x, particle.y, 0,
          particle.x, particle.y, particle.size * 3
        );
        gradient.addColorStop(0, particle.color);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size * 3, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    });
  }

  function animate() {
    updateParticles();
    drawParticles();
    animationId = requestAnimationFrame(animate);
  }

  onDestroy(() => {
    if (animationId) {
      cancelAnimationFrame(animationId);
    }
  });
</script>

<canvas 
  bind:this={canvas}
  class="fixed inset-0 pointer-events-none z-0"
  style="mix-blend-mode: screen;"
></canvas>
