import { useEffect, useRef } from "react";
import { BANNER_AD } from "../utils/adConfig";

export default function AdBanner() {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const script = document.createElement("script");
    script.async = true;
    script.setAttribute("data-cfasync", "false");
    script.src = BANNER_AD.scriptUrl;
    containerRef.current.appendChild(script);
  }, []);

  return (
    <div className="w-full my-4">
      <div
        id={BANNER_AD.containerId}
        ref={containerRef}
      />
    </div>
  );
}
