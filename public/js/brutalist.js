// Brutalist Interactions
// Uses Lenis for smooth scroll and GSAP for hard-cut reveals

document.addEventListener('DOMContentLoaded', () => {
    // 1. Lenis (Smooth Scroll) - DISABLED due to user feedback ("headache")
    // const lenis = new Lenis({ ... });
    // function raf(time) { ... }
    // requestAnimationFrame(raf);

    // 2. GSAP ScrollTrigger (Hard Reveals)
    gsap.registerPlugin(ScrollTrigger);

    // Animate all sections with a "Brutalist Slam" effect
    const reveals = document.querySelectorAll('.reveal');

    reveals.forEach(reveal => {
        gsap.fromTo(reveal,
            {
                y: 50, // Reduced from 100 for less motion
                opacity: 0,
                clipPath: 'inset(0 0 100% 0)'
            },
            {
                y: 0,
                opacity: 1,
                clipPath: 'inset(0 0 0% 0)',
                duration: 0.6, // Faster snappier feel
                ease: "expo.out", // Smoother than power4, less aggressive
                scrollTrigger: {
                    trigger: reveal,
                    start: "top 85%",
                    toggleActions: "play none none reverse"
                }
            }
        );
    });

    // Stagger grids
    const staggers = document.querySelectorAll('.reveal-stagger');
    staggers.forEach(grid => {
        gsap.fromTo(grid.children,
            {
                y: 30, // Reduced movement
                opacity: 0
            },
            {
                y: 0,
                opacity: 1,
                duration: 0.6,
                stagger: 0.1,
                ease: "expo.out",
                scrollTrigger: {
                    trigger: grid,
                    start: "top 95%", // Trigger earlier (was 80%) to ensure they appear
                    toggleActions: "play none none reverse"
                }
            }
        );
    });
});
