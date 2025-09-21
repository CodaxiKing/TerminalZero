import { useState, useEffect, ReactNode } from "react";

// Inventory Grid Component
interface InventorySlotProps {
  item?: { name: string; count?: number; icon: string };
  isSelected?: boolean;
  onClick?: () => void;
  className?: string;
}

export function InventorySlot({ item, isSelected, onClick, className = "" }: InventorySlotProps) {
  return (
    <button
      className={`
        relative w-12 h-12 border-2 border-solid cursor-pointer
        transition-all duration-100 px-shadow-1
        ${isSelected 
          ? 'border-yellow-400 px-outline-gold bg-yellow-50 dark:bg-yellow-900/20' 
          : 'border-amber-800 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/40'
        }
        ${className}
      `}
      onClick={onClick}
      tabIndex={0}
      data-testid={`inventory-slot-${item?.name || 'empty'}`}
    >
      {/* Bevel effect */}
      <div className="absolute inset-1 border border-amber-200 dark:border-amber-700 pointer-events-none" />
      
      {item && (
        <>
          <span className="text-lg pixel-art" title={item.name}>
            {item.icon}
          </span>
          {item.count && item.count > 1 && (
            <span className="absolute -bottom-1 -right-1 bg-red-600 text-white text-xs font-pixel px-1 rounded px-shadow-1">
              {item.count > 99 ? '99+' : item.count}
            </span>
          )}
        </>
      )}
    </button>
  );
}

interface InventoryGridProps {
  items?: Array<{ name: string; count?: number; icon: string } | undefined>;
  selectedIndex?: number;
  onSlotClick?: (index: number) => void;
  columns?: number;
  rows?: number;
}

export function InventoryGrid({ 
  items = [], 
  selectedIndex, 
  onSlotClick, 
  columns = 12, 
  rows = 5 
}: InventoryGridProps) {
  const totalSlots = columns * rows;
  const slots = Array.from({ length: totalSlots }, (_, i) => items[i] || undefined);

  return (
    <div 
      className="wood-frame p-2"
      style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
    >
      <div className={`grid gap-1 p-2`} style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {slots.map((item, index) => (
          <InventorySlot
            key={index}
            item={item}
            isSelected={selectedIndex === index}
            onClick={() => onSlotClick?.(index)}
          />
        ))}
      </div>
    </div>
  );
}

// Hotbar Component
interface HotbarProps {
  items?: Array<{ name: string; count?: number; icon: string } | undefined>;
  selectedIndex?: number;
  onSlotClick?: (index: number) => void;
}

export function Hotbar({ items = [], selectedIndex = 0, onSlotClick }: HotbarProps) {
  const slots = Array.from({ length: 10 }, (_, i) => items[i] || undefined);

  // Handle number key selection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key;
      if (key >= '1' && key <= '9') {
        const index = parseInt(key) - 1;
        onSlotClick?.(index);
      } else if (key === '0') {
        onSlotClick?.(9);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onSlotClick]);

  return (
    <div className="wood-frame px-shadow-2">
      <div className="flex gap-1 p-2">
        {slots.map((item, index) => (
          <div key={index} className="relative">
            <InventorySlot
              item={item}
              isSelected={selectedIndex === index}
              onClick={() => onSlotClick?.(index)}
              className="relative"
            />
            {/* Number key indicator */}
            <span className="absolute -top-2 -left-1 text-xs font-pixel text-foreground/70">
              {index === 9 ? '0' : index + 1}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Status Bars Component  
interface StatusBarProps {
  current: number;
  max: number;
  type: 'health' | 'energy';
  showNumbers?: boolean;
}

export function StatusBar({ current, max, type, showNumbers = true }: StatusBarProps) {
  const icon = type === 'health' ? '❤️' : '⭐';
  const barColor = type === 'health' ? 'bg-red-500' : 'bg-blue-500';
  const percentage = Math.max(0, Math.min(100, (current / max) * 100));

  return (
    <div className="wood-frame px-shadow-1">
      <div className="flex items-center gap-2 p-2">
        <span className="text-sm pixel-art" title={type === 'health' ? 'Vida' : 'Energia'}>
          {icon}
        </span>
        <div className="flex-1 relative">
          {/* Background bar */}
          <div className="h-4 bg-gray-700 border border-gray-800 px-shadow-1">
            {/* Fill bar */}
            <div 
              className={`h-full transition-all duration-300 ${barColor}`}
              style={{ width: `${percentage}%` }}
            />
          </div>
          {/* Pixel segments overlay */}
          <div className="absolute inset-0 flex">
            {Array.from({ length: 10 }, (_, i) => (
              <div 
                key={i} 
                className="flex-1 border-r border-gray-900 last:border-r-0" 
              />
            ))}
          </div>
        </div>
        {showNumbers && (
          <span className="text-xs font-pixel text-foreground min-w-[3rem] text-right">
            {current}/{max}
          </span>
        )}
      </div>
    </div>
  );
}

interface StatusBarsProps {
  health: { current: number; max: number };
  energy: { current: number; max: number };
}

export function StatusBars({ health, energy }: StatusBarsProps) {
  return (
    <div className="space-y-2">
      <StatusBar 
        current={health.current} 
        max={health.max} 
        type="health"
      />
      <StatusBar 
        current={energy.current} 
        max={energy.max} 
        type="energy"
      />
    </div>
  );
}

// Dialogue Box Component
interface DialogueBoxProps {
  title?: string;
  children: ReactNode;
  actions?: Array<{ label: string; onClick: () => void; primary?: boolean }>;
  speaker?: string;
  onClose?: () => void;
}

export function DialogueBox({ title, children, actions, speaker, onClose }: DialogueBoxProps) {
  return (
    <div className="parchment-card rope-corners px-shadow-3 max-w-md">
      {/* Speaker nameplate */}
      {speaker && (
        <div className="absolute -top-3 left-4 wood-frame px-1 py-0.5">
          <span className="text-xs font-pixel text-foreground">
            {speaker}
          </span>
        </div>
      )}

      {/* Dialogue tail */}
      <div className="absolute -bottom-2 left-8 w-0 h-0 border-l-[8px] border-r-[8px] border-t-[8px] border-l-transparent border-r-transparent border-t-amber-200 dark:border-t-amber-800" />

      <div className="space-y-3">
        {title && (
          <h3 className="font-pixel font-bold text-foreground text-lg">
            {title}
          </h3>
        )}
        
        <div className="text-foreground leading-relaxed">
          {children}
        </div>

        {actions && actions.length > 0 && (
          <div className="flex gap-2 pt-2">
            {actions.map((action, index) => (
              <button
                key={index}
                onClick={action.onClick}
                className={`
                  ${action.primary ? 'pixel-btn-brown' : 'px-2 py-1 border-2 border-amber-800 bg-amber-100 dark:bg-amber-900/40 hover:bg-amber-200 dark:hover:bg-amber-900/60'}
                  font-pixel text-sm transition-all duration-100 px-shadow-1
                `}
                data-testid={`dialogue-action-${index}`}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}

        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center text-foreground/60 hover:text-foreground hover:bg-amber-200/50 dark:hover:bg-amber-800/50 rounded-full transition-colors"
            aria-label="Fechar"
            data-testid="dialogue-close"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}

// Currency Box Component
interface CurrencyBoxProps {
  amount: number;
  type?: 'gold' | 'xp' | 'star';
  label?: string;
  animated?: boolean;
}

export function CurrencyBox({ amount, type = 'gold', label, animated = false }: CurrencyBoxProps) {
  const icons = {
    gold: '🟡',
    xp: '⭐',
    star: '✨'
  };

  const colors = {
    gold: 'text-yellow-600 dark:text-yellow-400',
    xp: 'text-blue-600 dark:text-blue-400', 
    star: 'text-purple-600 dark:text-purple-400'
  };

  return (
    <div className={`wood-frame px-shadow-1 ${animated ? 'tilt-wiggle' : ''}`}>
      <div className="flex items-center gap-2 px-3 py-1">
        <span className="text-sm pixel-art">
          {icons[type]}
        </span>
        <span className={`font-pixel text-sm ${colors[type]}`}>
          {amount.toLocaleString()}
        </span>
        {label && (
          <span className="text-xs text-foreground/70 font-pixel">
            {label}
          </span>
        )}
      </div>
    </div>
  );
}

// Game-like notification/toast
interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  onClose: () => void;
  duration?: number;
}

export function GameToast({ message, type = 'info', onClose, duration = 3000 }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300); // Allow fade out animation
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const typeColors = {
    success: 'border-green-600 bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200',
    error: 'border-red-600 bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200',
    info: 'border-blue-600 bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200'
  };

  return (
    <div 
      className={`
        fixed top-20 right-4 z-50 px-shadow-2 wood-frame transition-all duration-300
        ${typeColors[type]}
        ${isVisible ? 'opacity-100 transform translate-x-0' : 'opacity-0 transform translate-x-full'}
      `}
    >
      <div className="flex items-center gap-2 p-3">
        <span className="font-pixel text-sm">
          {message}
        </span>
        <button
          onClick={() => {
            setIsVisible(false);
            setTimeout(onClose, 300);
          }}
          className="text-current/60 hover:text-current"
        >
          ×
        </button>
      </div>
    </div>
  );
}