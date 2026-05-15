import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Drop-in photos: place files in /public/backdrops/ named 1.jpg, 2.jpg, …
// To add more, increase BACKDROP_COUNT and add a matching file.
const BACKDROP_COUNT = 4;
const photos = Array.from({ length: BACKDROP_COUNT }, (_, i) => `/backdrops/${i + 1}.jpg`);

export default function PhotoBackdrop() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((p) => (p + 1) % photos.length), 5500);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden rounded-[2rem]">
      <AnimatePresence mode="sync">
        <motion.img
          key={i}
          src={photos[i]}
          alt="DUT Awards ceremony atmosphere"
          width={1536}
          height={1024}
          loading="lazy"
          initial={{ opacity: 0, scale: 1.12, filter: "blur(8px)" }}
          animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
          exit={{ opacity: 0, scale: 1.02, filter: "blur(4px)" }}
          transition={{ duration: 1.8, ease: "easeInOut" }}
          className="absolute inset-0 h-full w-full object-cover"
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
        />
      </AnimatePresence>
      {/* Cinematic overlays */}
      <div className="absolute inset-0 bg-gradient-to-tr from-background via-background/40 to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,oklch(0.10_0.06_265/0.6)_100%)]" />
      {/* Animated golden light beam */}
      <motion.div
        className="absolute -inset-x-10 top-0 h-full opacity-40 mix-blend-soft-light"
        style={{ background: "linear-gradient(115deg, transparent 30%, oklch(0.85 0.17 88 / 0.45) 50%, transparent 70%)" }}
        animate={{ x: ["-30%", "30%"] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", repeatType: "reverse" }}
      />
      {/* Soft vignette + grain */}
      <div className="grain absolute inset-0 opacity-[0.08] mix-blend-overlay" />
      {/* Photo index dots */}
      <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 gap-2">
        {photos.map((_, idx) => (
          <button
            key={idx}
            aria-label={`Show photo ${idx + 1}`}
            onClick={() => setI(idx)}
            className={`h-1.5 rounded-full transition-all ${idx === i ? "w-8 bg-gold" : "w-3 bg-white/30 hover:bg-white/60"}`}
          />
        ))}
      </div>
    </div>
  );
}
