import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { Plus, X, User, Bot, Palette, Sparkles, Trash2 } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// --- TYPES --- //

export interface Persona {
  id: string;
  name: string;
  description: string;
  avatar?: string;
  systemPrompt?: string;
  traits: string[];
  color: string;
  isBuiltIn?: boolean; // To distinguish deletable personas
}

interface AgentPersonaSwitcherProps {
  personas: Persona[];
  activePersonaId: string;
  onSwitch: (personaId: string) => void;
  onCreatePersona: (persona: Omit<Persona, 'id' | 'isBuiltIn'>) => void;
  onDeletePersona: (id: string) => void;
  isMidConversation?: boolean; // To trigger confirmation
}

// --- HELPER COMPONENTS --- //

const TraitInput = ({ traits, setTraits }: { traits: string[]; setTraits: (traits: string[]) => void }) => {
  const [inputValue, setInputValue] = useState('');

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      if (!traits.includes(inputValue.trim())) {
        setTraits([...traits, inputValue.trim()]);
      }
      setInputValue('');
    }
  };

  const removeTrait = (traitToRemove: string) => {
    setTraits(traits.filter(trait => trait !== traitToRemove));
  };

  return (
    <div className="space-y-2">
      <Label htmlFor="traits">Traits (press Enter to add)</Label>
      <Input
        id="traits"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="e.g., 'witty', 'formal', 'creative'"
      />
      <div className="flex flex-wrap gap-2 min-h-[2.5rem]">
        {traits.map(trait => (
          <Badge key={trait} variant="secondary" className="flex items-center gap-1">
            {trait}
            <button onClick={() => removeTrait(trait)} className="rounded-full hover:bg-muted-foreground/20">
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
    </div>
  );
};

const ColorPicker = ({ color, setColor }: { color: string; setColor: (color: string) => void }) => {
  const colors = [
    '#3b82f6', '#ef4444', '#22c55e', '#eab308', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'
  ];

  return (
    <div className="space-y-2">
        <Label>Accent Color</Label>
        <div className="flex flex-wrap gap-2">
            {colors.map(c => (
                <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={cn(
                        'w-8 h-8 rounded-full transition-transform transform hover:scale-110',
                        color === c && 'ring-2 ring-offset-2 ring-offset-background ring-foreground'
                    )}
                    style={{ backgroundColor: c }}
                />
            ))}
        </div>
    </div>
  );
};

const CreatePersonaDialog = ({ onCreatePersona, children }: { onCreatePersona: AgentPersonaSwitcherProps['onCreatePersona']; children: React.ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [traits, setTraits] = useState<string[]>([]);
  const [color, setColor] = useState('#3b82f6');

  const handleSubmit = () => {
    if (name.trim() && description.trim()) {
      onCreatePersona({ name, description, traits, color });
      setIsOpen(false);
      // Reset form
      setName('');
      setDescription('');
      setTraits([]);
      setColor('#3b82f6');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Create Custom Persona</DialogTitle>
          <DialogDescription>Define a new personality for the agent.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">Name</Label>
            <Input id="name" value={name} onChange={e => setName(e.target.value)} className="col-span-3" placeholder="e.g., 'Creative Muse'" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="description" className="text-right">Description</Label>
            <Input id="description" value={description} onChange={e => setDescription(e.target.value)} className="col-span-3" placeholder="Helps brainstorm creative ideas" />
          </div>
          <div className="grid grid-cols-4 items-start gap-4">
             <Label className="text-right pt-2">Traits</Label>
             <div className="col-span-3"><TraitInput traits={traits} setTraits={setTraits} /></div>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
             <Label className="text-right">Color</Label>
             <div className="col-span-3"><ColorPicker color={color} setColor={setColor} /></div>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" onClick={handleSubmit}>Create Persona</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const PersonaCard = ({
    persona,
    isActive,
    onSelect,
    onDelete,
    isMidConversation
}: {
    persona: Persona;
    isActive: boolean;
    onSelect: () => void;
    onDelete: () => void;
    isMidConversation?: boolean;
}) => {
    const cardContent = (
        <Card
            className={cn(
                'relative group w-48 h-36 flex-shrink-0 cursor-pointer transition-all duration-300 ease-in-out',
                'bg-card/80 backdrop-blur-sm hover:bg-card/100',
                isActive && 'shadow-lg'
            )}
        >
            <AnimatePresence>
            {isActive && (
                <motion.div
                    layoutId="activePersonaBorder"
                    className="absolute inset-0 rounded-lg border-2 pointer-events-none"
                    style={{ borderColor: persona.color }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ type: 'spring' as const, stiffness: 300, damping: 30 }}
                />
            )}
            </AnimatePresence>
            <CardContent className="p-4 flex flex-col justify-between h-full">
                <div className="flex items-start justify-between">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: `${persona.color}20` }}>
                        {persona.avatar ? (
                            <img src={persona.avatar} alt={persona.name} className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                            <User className="w-6 h-6" style={{ color: persona.color }} />
                        )}
                    </div>
                    {!persona.isBuiltIn && (
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This will permanently delete the '{persona.name}' persona. This action cannot be undone.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={onDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    )}
                </div>
                <div>
                    <h3 className="font-semibold truncate">{persona.name}</h3>
                    <div className="flex flex-wrap gap-1 mt-2">
                        {persona.traits.slice(0, 2).map(trait => (
                            <Badge key={trait} style={{ backgroundColor: `${persona.color}30`, color: persona.color }} className="border-none">{trait}</Badge>
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>
    );

    if (isMidConversation && !isActive) {
        return (
            <AlertDialog>
                <AlertDialogTrigger asChild><div onClick={(e) => e.preventDefault()}>{cardContent}</div></AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Switch Persona Mid-Conversation?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Switching personas now will reset the current conversation context. Are you sure you want to continue?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={onSelect}>Switch Persona</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        );
    }

    return <div onClick={onSelect}>{cardContent}</div>;
};

// --- MAIN COMPONENT --- //

export const AgentPersonaSwitcher = ({
  personas,
  activePersonaId,
  onSwitch,
  onCreatePersona,
  onDeletePersona,
  isMidConversation = false,
}: AgentPersonaSwitcherProps) => {

  return (
    <div className="w-full py-4">
        <LayoutGroup>
            <div className="flex items-center gap-4 pb-2 overflow-x-auto scrollbar-thin scrollbar-thumb-muted-foreground/50 scrollbar-track-transparent">
                {personas.map(persona => (
                    <PersonaCard
                        key={persona.id}
                        persona={persona}
                        isActive={activePersonaId === persona.id}
                        onSelect={() => onSwitch(persona.id)}
                        onDelete={() => onDeletePersona(persona.id)}
                        isMidConversation={isMidConversation}
                    />
                ))}

                <CreatePersonaDialog onCreatePersona={onCreatePersona}>
                    <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="w-48 h-36 flex-shrink-0"
                    >
                        <Card className="h-full w-full flex flex-col items-center justify-center bg-card/50 hover:bg-card/80 transition-colors border-2 border-dashed border-border cursor-pointer">
                            <Plus className="h-8 w-8 text-muted-foreground mb-2" />
                            <p className="text-sm font-medium text-muted-foreground">Create Custom</p>
                        </Card>
                    </motion.div>
                </CreatePersonaDialog>
            </div>
        </LayoutGroup>
    </div>
  );
};
