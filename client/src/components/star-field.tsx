import { useEffect, useRef } from "react";

export default function StarField() {
  const starFieldRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const starField = starFieldRef.current;
    if (!starField) return;

    // Clear existing stars
    starField.innerHTML = '';

    // Create stars
    for (let i = 0; i < 50; i++) {
      const star = document.createElement('div');
      star.className = 'star';
      star.style.left = Math.random() * 100 + '%';
      star.style.top = Math.random() * 100 + '%';
      star.style.animationDelay = Math.random() * 3 + 's';
      starField.appendChild(star);
    }
  }, []);

  return (
    <div 
      ref={starFieldRef}
      className="fixed top-0 left-0 w-full h-full pointer-events-none z-[-1]"
      data-testid="star-field"
    />
  );
}
