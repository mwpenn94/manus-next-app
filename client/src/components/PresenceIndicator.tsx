import React, { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Briefcase, Clock } from 'lucide-react';

// In a real app, this would be from "@/lib/utils"
const cn = (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(' ');

// --- TYPE DEFINITIONS ---
type UserStatus = 'online' | 'away' | 'busy' | 'offline';

interface UserProfile {
  id: string;
  name: string;
  avatarUrl: string; // Using initials for simplicity
  status: UserStatus;
  currentPage: string;
  lastActive: string;
  isTyping?: boolean;
}

// --- MOCK DATA ---
const mockUsers: UserProfile[] = [
  { id: 'user1', name: 'Alex Ray', avatarUrl: 'AR', status: 'online', currentPage: 'Dashboard', lastActive: '1m ago' },
  { id: 'user2', name: 'Jordan Lee', avatarUrl: 'JL', status: 'busy', currentPage: 'Editor', lastActive: '5m ago', isTyping: true },
  { id: 'user3', name: 'Taylor Kim', avatarUrl: 'TK', status: 'away', currentPage: 'Settings', lastActive: '15m ago' },
  { id: 'user4', name: 'Casey Pat', avatarUrl: 'CP', status: 'offline', currentPage: 'Login', lastActive: '2h ago' },
  { id: 'user5', name: 'Morgan Ash', avatarUrl: 'MA', status: 'online', currentPage: 'Analytics', lastActive: '30s ago' },
  { id: 'user6', name: 'Sam River', avatarUrl: 'SR', status: 'online', currentPage: 'Dashboard', lastActive: '2m ago' },
  { id: 'user7', name: 'Drew Ellis', avatarUrl: 'DE', status: 'busy', currentPage: 'API Keys', lastActive: '10m ago' },
  { id: 'user8', name: 'Quinn Fox', avatarUrl: 'QF', status: 'offline', currentPage: 'Docs', lastActive: 'yesterday' },
];

// --- UTILITY COMPONENTS & FUNCTIONS ---
const statusConfig: { [key in UserStatus]: { color: string; label: string } } = {
  online: { color: 'bg-green-500', label: 'Online' },
  away: { color: 'bg-yellow-500', label: 'Away' },
  busy: { color: 'bg-red-500', label: 'Busy' },
  offline: { color: 'bg-gray-500', label: 'Offline' },
};

const TypingIndicator = () => (
  <motion.div
    className="flex items-center space-x-1 h-4"
    initial="start"
    animate="end"
    variants={{ start: { transition: { staggerChildren: 0.2 } }, end: { transition: { staggerChildren: 0.2 } } }}
  >
    {[...Array(3)].map((_, i) => (
      <motion.div
        key={i}
        className="w-1.5 h-1.5 bg-muted-foreground rounded-full"
        variants={{ start: { y: '50%' }, end: { y: '100%' } }}
        transition={{ duration: 0.5, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
      />
    ))}
  </motion.div>
);

const UserAvatar = React.forwardRef<HTMLButtonElement, { user: UserProfile; onProfileClick: (id: string) => void; }>(({ user, onProfileClick }, ref) => (
    <motion.div whileHover={{ zIndex: 10, scale: 1.1 }} transition={{ duration: 0.2 }}>
        <button ref={ref} onClick={() => onProfileClick(user.id)} className="relative flex items-center justify-center w-10 h-10 bg-muted rounded-full border-2 border-background text-foreground font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background focus:ring-blue-500">
            {user.avatarUrl}
            <motion.span 
              layoutId={`status-${user.id}`}
              className={cn("absolute bottom-0 right-0 block w-3 h-3 rounded-full border-2 border-background", statusConfig[user.status].color)} 
            />
        </button>
    </motion.div>
));
UserAvatar.displayName = 'UserAvatar';

export default function PresenceIndicator({ maxVisible = 5 }: { maxVisible?: number }) {
  const [users] = useState<UserProfile[]>(mockUsers);
  const [hoveredUser, setHoveredUser] = useState<UserProfile | null>(null);
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({});
  const avatarRefs = useRef<{[key: string]: HTMLButtonElement | null}>({});
  const hoverTimeoutRef = useRef<number | null>(null);

  const handleMouseEnter = (user: UserProfile) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    const target = avatarRefs.current[user.id];
    if (target) {
        const rect = target.getBoundingClientRect();
        setPopoverStyle({
            left: rect.left + rect.width / 2 + window.scrollX,
            top: rect.bottom + window.scrollY + 8,
            transform: 'translateX(-50%)',
        });
    }
    setHoveredUser(user);
  };

  const handleMouseLeave = () => {
    hoverTimeoutRef.current = window.setTimeout(() => {
        setHoveredUser(null);
    }, 100);
  };

  const handlePopoverInteraction = () => {
    if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
    }
  }

  const handleProfileClick = (userId: string) => {
    console.log(`Viewing profile for user: ${userId}`);
  };

  const visibleUsers = useMemo(() => users.slice(0, maxVisible), [users, maxVisible]);
  const overflowCount = useMemo(() => Math.max(0, users.length - maxVisible), [users, maxVisible]);

  return (
    <div className="relative flex items-center p-4 bg-background rounded-lg font-sans">
      <div className="flex items-center -space-x-3">
        {visibleUsers.map((user) => (
          <div key={user.id} onMouseEnter={() => handleMouseEnter(user)} onMouseLeave={handleMouseLeave}>
            <UserAvatar ref={(el: HTMLButtonElement | null) => { avatarRefs.current[user.id] = el; }} user={user} onProfileClick={handleProfileClick} />
          </div>
        ))}
        {overflowCount > 0 && (
          <div className="relative flex items-center justify-center w-10 h-10 bg-muted rounded-full border-2 border-background text-muted-foreground font-semibold text-sm z-0">
            +{overflowCount}
          </div>
        )}
      </div>
      <AnimatePresence>
        {hoveredUser && (
          <motion.div
            style={popoverStyle}
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="absolute w-64 bg-card border border-border rounded-lg shadow-xl z-50 p-4 text-sm text-foreground"
            onMouseEnter={handlePopoverInteraction}
            onMouseLeave={handleMouseLeave}
          >
            <div className="flex items-center mb-3">
              <div className="relative flex items-center justify-center w-12 h-12 bg-muted rounded-full border-2 border-background text-foreground font-semibold text-lg flex-shrink-0">
                  {hoveredUser.avatarUrl}
                  <motion.span 
                    layoutId={`status-${hoveredUser.id}`}
                    className={cn("absolute bottom-0 right-0 block w-3.5 h-3.5 rounded-full border-2 border-card", statusConfig[hoveredUser.status].color)} 
                  />
              </div>
              <div className="ml-3 min-w-0">
                <p className="font-semibold truncate">{hoveredUser.name}</p>
                <div className="flex items-center text-muted-foreground">
                    <span className={cn("w-2 h-2 rounded-full mr-1.5 flex-shrink-0", statusConfig[hoveredUser.status].color)} />
                    <span className="truncate">{statusConfig[hoveredUser.status].label}</span>
                    {hoveredUser.isTyping && <div className="ml-2"><TypingIndicator /></div>}
                </div>
              </div>
            </div>
            <div className="space-y-2 text-muted-foreground">
                <div className="flex items-center"><Briefcase className="w-4 h-4 mr-2 flex-shrink-0" /><span>On: <span className="text-foreground">{hoveredUser.currentPage}</span></span></div>
                <div className="flex items-center"><Clock className="w-4 h-4 mr-2 flex-shrink-0" /><span>Last active: {hoveredUser.lastActive}</span></div>
            </div>
            <button onClick={() => handleProfileClick(hoveredUser.id)} className="mt-4 w-full text-center text-xs py-1.5 bg-muted hover:bg-border rounded-md transition-colors duration-150 font-medium">View Profile</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
