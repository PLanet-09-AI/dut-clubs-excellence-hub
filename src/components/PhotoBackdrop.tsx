import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import img1 from "@/assets/ceremony-1.jpg";
import img2 from "@/assets/ceremony-2.jpg";
import img3 from "@/assets/ceremony-3.jpg";
import img4 from "@/assets/ceremony-4.jpg";

const photos = [img1, img2, img3, img4];

export default function PhotoBackdrop() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((p) => (p + 1) % photos.length), 6000);
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
          initial={{ opacity: 0, scale: 1.08 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.02 }}
          transition={{ duration: 1.6, ease: "easeInOut" }}
          className="absolute inset-0 h-full w-full object-cover"
        />
      </AnimatePresence>
      <div className="absolute inset-0 bg-gradient-to-tr from-background via-background/40 to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,oklch(0.10_0.06_265/0.6)_100%)]" />
    </div>
  );
}
