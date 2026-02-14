import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Package, Truck, BarChart3, ShieldCheck, ChevronRight, ChevronLeft } from "lucide-react";
import appLogo from "@/assets/logo.png";

interface OnboardingScreenProps {
  onComplete: () => void;
}

const slides = [
  {
    icon: Package,
    color: "hsl(203, 80%, 40%)",
    bg: "hsla(203, 80%, 40%, 0.12)",
    title: "Manage Products & Stock",
    description: "Track every carton across your store and shops. Real-time inventory with opening balances, daily snapshots, and automatic closing calculations.",
  },
  {
    icon: Truck,
    color: "hsl(174, 55%, 38%)",
    bg: "hsla(174, 55%, 38%, 0.12)",
    title: "Supply & Transfer",
    description: "Dispatch stock from your store to shops with a transparent confirmation workflow. Shop staff accept or dispute — nothing falls through the cracks.",
  },
  {
    icon: BarChart3,
    color: "hsl(38, 92%, 50%)",
    bg: "hsla(38, 92%, 50%, 0.12)",
    title: "Sales & Revenue",
    description: "Record sales, generate receipts, and monitor revenue across all locations. Every transaction is logged and linked to daily stock reports.",
  },
  {
    icon: ShieldCheck,
    color: "hsl(152, 55%, 38%)",
    bg: "hsla(152, 55%, 38%, 0.12)",
    title: "Role-Based Access",
    description: "Admins, store managers, and shop staff each see exactly what they need. Secure, role-based access keeps your operations safe and organized.",
  },
];

const OnboardingScreen = ({ onComplete }: OnboardingScreenProps) => {
  const [current, setCurrent] = useState(0);
  const slide = slides[current];
  const isLast = current === slides.length - 1;

  const handleNext = () => {
    if (isLast) {
      onComplete();
    } else {
      setCurrent(c => c + 1);
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center p-4"
      style={{
        background: "linear-gradient(160deg, hsl(215, 40%, 10%) 0%, hsl(203, 80%, 15%) 100%)",
      }}
    >
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute -top-32 -right-32 h-96 w-96 rounded-full opacity-20 blur-3xl"
          style={{ background: slide.color }}
        />
        <div
          className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full opacity-10 blur-3xl"
          style={{ background: "hsl(174, 55%, 48%)" }}
        />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo header */}
        <div className="mb-8 flex items-center justify-center gap-2.5">
          <img src={appLogo} alt="OceanGush" className="h-8 w-8 rounded-lg object-contain" />
          <span className="font-display text-lg font-bold text-white">OceanGush</span>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-8 backdrop-blur-xl shadow-2xl">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div
              className="flex h-20 w-20 items-center justify-center rounded-2xl transition-all duration-500"
              style={{ background: slide.bg }}
            >
              <slide.icon
                className="h-10 w-10 transition-all duration-500"
                style={{ color: slide.color }}
              />
            </div>
          </div>

          {/* Content */}
          <div className="text-center mb-8 min-h-[120px]">
            <h2 className="font-display text-xl font-bold text-white mb-3 transition-all duration-300">
              {slide.title}
            </h2>
            <p className="text-sm leading-relaxed text-white/60 transition-all duration-300">
              {slide.description}
            </p>
          </div>

          {/* Dots */}
          <div className="flex justify-center gap-2 mb-8">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className="transition-all duration-300 rounded-full"
                style={{
                  width: i === current ? "24px" : "8px",
                  height: "8px",
                  background: i === current ? slide.color : "hsla(0, 0%, 100%, 0.2)",
                }}
              />
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {current > 0 ? (
              <Button
                variant="ghost"
                onClick={() => setCurrent(c => c - 1)}
                className="text-white/50 hover:text-white hover:bg-white/10"
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Back
              </Button>
            ) : (
              <Button
                variant="ghost"
                onClick={handleSkip}
                className="text-white/40 hover:text-white/70 hover:bg-white/5"
              >
                Skip
              </Button>
            )}
            <Button
              onClick={handleNext}
              className="flex-1 font-semibold text-white"
              style={{ background: slide.color }}
            >
              {isLast ? "Get Started" : "Next"}
              {!isLast && <ChevronRight className="ml-1 h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-[11px] text-white/30 tracking-wide">
          Wholesale Management System
        </p>
      </div>
    </div>
  );
};

export default OnboardingScreen;
