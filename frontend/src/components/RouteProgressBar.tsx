import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

export function RouteProgressBar() {
  const location = useLocation();
  const [active, setActive] = useState(false);

  useEffect(() => {
    setActive(true);
    const timer = window.setTimeout(() => setActive(false), 380);
    return () => window.clearTimeout(timer);
  }, [location.pathname, location.search]);

  if (!active) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[80] h-1 bg-cyan-500/15">
      <div className="progress-bar-indeterminate h-full bg-cyan-400" />
    </div>
  );
}
