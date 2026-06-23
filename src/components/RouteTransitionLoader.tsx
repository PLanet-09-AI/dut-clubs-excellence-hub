import { useEffect, useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { motion } from "framer-motion";

export function RouteTransitionLoader() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const handleRouteChange = () => {
      setIsLoading(true);
      const timer = setTimeout(() => setIsLoading(false), 500);
      return () => clearTimeout(timer);
    };

    // Subscribe to route changes
    const unsubscribe = router.subscribe("onBeforeLoad", handleRouteChange);

    return () => {
      unsubscribe?.();
    };
  }, [router]);

  if (!isLoading) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="fixed top-0 left-0 right-0 z-50 h-1 bg-gradient-to-r from-gold via-primary to-gold"
      style={{
        backgroundSize: "200% 100%",
        animation: "loading-bar 1.5s ease-in-out",
      }}
    />
  );
}
