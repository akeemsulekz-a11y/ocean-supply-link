import { useState, useEffect } from "react";
import appLogo from "@/assets/logo.png";

interface SplashScreenProps {
  onFinished: () => void;
}

const SplashScreen = ({ onFinished }: SplashScreenProps) => {
  const [phase, setPhase] = useState<"logo" | "text" | "exit">("logo");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("text"), 600);
    const t2 = setTimeout(() => setPhase("exit"), 2200);
    const t3 = setTimeout(onFinished, 2800);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [onFinished]);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center transition-opacity duration-500 ${
        phase === "exit" ? "opacity-0" : "opacity-100"
      }`}
      style={{
        background: "linear-gradient(145deg, hsl(215, 40%, 10%) 0%, hsl(203, 80%, 18%) 50%, hsl(174, 55%, 28%) 100%)",
      }}
    >
      {/* Radial glow */}
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            width: "600px",
            height: "600px",
            background: "radial-gradient(circle, hsla(174, 55%, 48%, 0.15) 0%, transparent 70%)",
          }}
        />
        {/* Subtle wave lines */}
        <svg className="absolute bottom-0 left-0 w-full opacity-10" viewBox="0 0 1440 200" preserveAspectRatio="none">
          <path d="M0,120 C360,180 720,60 1080,120 C1260,150 1380,100 1440,120 L1440,200 L0,200 Z" fill="hsla(174, 55%, 48%, 0.5)" />
          <path d="M0,150 C360,100 720,180 1080,130 C1260,110 1380,160 1440,140 L1440,200 L0,200 Z" fill="hsla(203, 80%, 48%, 0.3)" />
        </svg>
      </div>

      {/* Logo */}
      <div
        className={`relative z-10 transition-all duration-700 ease-out ${
          phase === "logo" ? "scale-75 opacity-0" : "scale-100 opacity-100"
        }`}
      >
        <div className="relative">
          <div
            className="absolute inset-0 rounded-2xl blur-2xl"
            style={{ background: "hsla(174, 55%, 48%, 0.3)" }}
          />
          <img
            src={appLogo}
            alt="OceanGush Logo"
            className="relative h-24 w-24 rounded-2xl object-contain drop-shadow-2xl sm:h-28 sm:w-28"
          />
        </div>
      </div>

      {/* Title */}
      <div
        className={`relative z-10 mt-8 text-center transition-all duration-700 delay-200 ease-out ${
          phase === "text" ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
        }`}
      >
        <h1
          className="font-display text-3xl font-bold tracking-tight sm:text-4xl"
          style={{ color: "hsl(0, 0%, 100%)" }}
        >
          OceanGush
        </h1>
        <p
          className="mt-1 text-xs font-medium uppercase tracking-[0.25em] sm:text-sm"
          style={{ color: "hsla(174, 55%, 70%, 0.9)" }}
        >
          International Services
        </p>
      </div>

      {/* Loading dots */}
      <div
        className={`relative z-10 mt-10 flex gap-1.5 transition-all duration-500 delay-300 ${
          phase === "text" ? "opacity-100" : "opacity-0"
        }`}
      >
        {[0, 1, 2].map(i => (
          <span
            key={i}
            className="inline-block h-2 w-2 rounded-full animate-pulse"
            style={{
              background: "hsl(174, 55%, 48%)",
              animationDelay: `${i * 200}ms`,
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default SplashScreen;
