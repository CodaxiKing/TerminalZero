import { useLocation } from "wouter";
import codingValleyLogo from "../assets/coding-valley-logo.png";

export default function Navbar() {
  const [location, setLocation] = useLocation();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 wood-frame navbar-wood px-shadow-2">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <button
            onClick={() => setLocation("/")}
            className="flex items-center space-x-3 text-xl font-bold text-foreground hover:text-primary transition-colors duration-200 shine-sweep"
            data-testid="navbar-logo"
          >
            <img 
              src={codingValleyLogo} 
              alt="Coding Valley" 
              className="h-10 w-auto pixelated float-bob"
            />
          </button>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-8">
            <button
              onClick={() => setLocation("/")}
              className={`text-sm font-pixel transition-colors duration-200 hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${
                location === "/" ? "text-primary px-outline-gold" : "text-muted-foreground"
              }`}
              data-testid="nav-home"
            >
              Início
            </button>
            <button
              onClick={() => setLocation("/game")}
              className={`text-sm font-pixel transition-colors duration-200 hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${
                location.startsWith("/game") ? "text-primary px-outline-gold" : "text-muted-foreground"
              }`}
              data-testid="nav-roadmaps"
            >
              Trilhas
            </button>
          </div>

          {/* CTA Button */}
          <button
            onClick={() => setLocation("/")}
            className="hidden sm:flex items-center pixel-btn-brown hover:glow-primary transition-all duration-200"
            data-testid="nav-cta"
          >
            Começar Agora
          </button>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-muted/20 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Menu de navegação móvel"
            data-testid="mobile-menu-button"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>
    </nav>
  );
}