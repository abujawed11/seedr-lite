import { useEffect, useRef } from "react";

export default function AdBanner() {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const script = document.createElement("script");
    script.async = true;
    script.setAttribute("data-cfasync", "false");
    script.src =
      "https://pl28862953.effectivegatecpm.com/f712929b7ed9a7e23f0d1b3b12d2487c/invoke.js";
    containerRef.current.appendChild(script);
  }, []);

  return (
    <div className="w-full my-4">
      <div
        id="container-f712929b7ed9a7e23f0d1b3b12d2487c"
        ref={containerRef}
      />
    </div>
  );
}
