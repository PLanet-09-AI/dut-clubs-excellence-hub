import { motion } from "framer-motion";

/** Slim indeterminate progress bar shown under a button while a download is in flight. */
export default function DownloadProgressBar() {
  return (
    <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-primary/10">
      <motion.div
        className="h-full w-1/3 rounded-full bg-gold"
        animate={{ x: ["-100%", "300%"] }}
        transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}
