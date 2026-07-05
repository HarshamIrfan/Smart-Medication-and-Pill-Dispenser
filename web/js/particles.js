/**
 * particles.js — Initialises tsParticles for the hero background.
 *
 * Kept in its own file because the tsParticles config is verbose and
 * mixing it into app.js would bury the application boot logic.
 *
 * Design intent: very subtle, slow-drifting blue dots with faint links.
 * The effect should feel like background texture, not a feature.
 */

const Particles = (() => {

  async function init() {
    // tsParticles exposes a global `tsParticles` object from the CDN bundle
    if (typeof tsParticles === 'undefined') return;

    await tsParticles.load({
      id: 'particles-canvas',
      options: {
        fpsLimit: 40, // Capped low — we want ambient, not active

        particles: {
          number: {
            value: 55,
            density: { enable: true, area: 900 },
          },

          color: { value: '#2563EB' },

          opacity: {
            value: { min: 0.04, max: 0.18 },
            animation: {
              enable: true,
              speed: 0.5,
              sync: false,
            },
          },

          size: {
            value: { min: 1, max: 3 },
          },

          links: {
            enable: true,
            color:   '#3B82F6',
            opacity: 0.08,
            distance: 140,
            width: 1,
          },

          move: {
            enable: true,
            speed: 0.4,     // Very slow drift — presence, not motion
            direction: 'none',
            random: true,
            outModes: { default: 'out' },
          },
        },

        interactivity: {
          events: {
            onHover: {
              enable: true,
              mode: 'grab', // Hover pulls nearby particles — subtle delight
            },
            resize: { enable: true },
          },
          modes: {
            grab: {
              distance: 120,
              links: { opacity: 0.25 },
            },
          },
        },

        detectRetina: true,
        background: { color: 'transparent' },
      },
    });
  }

  return { init };
})();
