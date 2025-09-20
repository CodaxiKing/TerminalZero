import { useLocation } from "wouter";

export default function Navbar() {
  const [location, setLocation] = useLocation();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 navbar-blur">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <button
            onClick={() => setLocation("/")}
            className="flex items-center space-x-2 text-xl font-bold text-foreground hover:text-primary transition-colors duration-200"
            data-testid="navbar-logo"
          >
            <span className="text-2xl">🚀</span>
            <span>CodeQuest</span>
          </button>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-8">
            <button
              onClick={() => setLocation("/")}
              className={`text-sm font-medium transition-colors duration-200 hover:text-primary ${
                location === "/" ? "text-primary" : "text-muted-foreground"
              }`}
              data-testid="nav-home"
            >
              Início
            </button>
            <button
              onClick={() => setLocation("/game")}
              className={`text-sm font-medium transition-colors duration-200 hover:text-primary ${
                location.startsWith("/game") ? "text-primary" : "text-muted-foreground"
              }`}
              data-testid="nav-roadmaps"
            >
              Trilhas
            </button>
          </div>

          {/* CTA Button */}
          <button
            onClick={() => setLocation("/")}
            className="hidden sm:flex items-center px-4 py-2 text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl hover:glow-primary"
            data-testid="nav-cta"
          >
            Começar Agora
          </button>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 rounded-lg hover:bg-muted/20 transition-colors"
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