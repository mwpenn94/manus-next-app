import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { Check, ChevronsUpDown, FileCode, FileJson, FileText, Table, Type, Code as CodeIcon, Braces } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';

interface FormatOption {
  id: string;
  label: string;
  icon: string;
  description: string;
  example?: string;
}

interface OutputFormatSelectorProps {
  selectedFormat: string;
  onFormatChange: (format: string) => void;
  formats?: FormatOption[];
  isVisible: boolean;
}

const iconMap: { [key: string]: React.ReactNode } = {
  Markdown: <Type className="h-4 w-4" />,
  JSON: <FileJson className="h-4 w-4" />,
  Code: <FileCode className="h-4 w-4" />,
  Table: <Table className="h-4 w-4" />,
  'Plain Text': <FileText className="h-4 w-4" />,
  HTML: <CodeIcon className="h-4 w-4" />,
  Default: <Braces className="h-4 w-4" />,
};

const getIcon = (iconName: string) => iconMap[iconName] || iconMap.Default;

const defaultFormats: FormatOption[] = [
  { id: 'markdown', label: 'Markdown', icon: 'Markdown', description: 'Formatted text with headers, lists, etc.', example: '# Hello\n\n- Point 1\n- Point 2' },
  { id: 'json', label: 'JSON', icon: 'JSON', description: 'Structured data in key-value pairs.', example: '{\n  "key": "value"\n}' },
  { id: 'code', label: 'Code', icon: 'Code', description: 'Syntax-highlighted code snippet.', example: 'const x = 1;' },
  { id: 'table', label: 'Table', icon: 'Table', description: 'Data organized in rows and columns.', example: '| Head 1 | Head 2 |\n|---|---|\n| Val 1 | Val 2 |' },
  { id: 'text', label: 'Plain Text', icon: 'Plain Text', description: 'Unformatted, plain text.', example: 'Just a simple line of text.' },
  { id: 'html', label: 'HTML', icon: 'HTML', description: 'Web content with tags and elements.', example: '<h1>Title</h1>\n<p>Paragraph</p>' },
];

export const OutputFormatSelector: React.FC<OutputFormatSelectorProps> = ({ 
  selectedFormat,
  onFormatChange,
  formats = defaultFormats,
  isVisible
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.metaKey && event.key === '.') {
      event.preventDefault();
      const currentIndex = formats.findIndex(f => f.id === selectedFormat);
      const nextIndex = (currentIndex + 1) % formats.length;
      onFormatChange(formats[nextIndex].id);
    }
  }, [formats, selectedFormat, onFormatChange]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  const selectedFormatDetails = useMemo(() => 
    formats.find(f => f.id === selectedFormat) || formats[0],
    [formats, selectedFormat]
  );

  const popoverVariants: Variants = {
    hidden: { opacity: 0, y: -10, scale: 0.95 },
    visible: { 
      opacity: 1, 
      y: 0, 
      scale: 1, 
      transition: { type: 'spring', stiffness: 300, damping: 30, duration: 0.2 }
    },
  };

  if (!isVisible) {
    return null;
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex items-center gap-2">
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={isOpen}
              className="w-[180px] justify-between bg-background text-foreground"
            >
              <span className="flex items-center gap-2">
                {getIcon(selectedFormatDetails.label)}
                {selectedFormatDetails.label}
              </span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[300px] p-0 bg-card border-border" asChild>
            <motion.div
              initial="hidden"
              animate="visible"
              exit="hidden"
              variants={popoverVariants}
            >
              {formats.map((format) => (
                <Tooltip key={format.id}>
                  <TooltipTrigger asChild>
                    <div
                      onClick={() => {
                        onFormatChange(format.id);
                        setIsOpen(false);
                      }}
                      className="flex items-center justify-between p-2 hover:bg-accent cursor-pointer rounded-md"
                    >
                      <div className="flex items-center gap-3">
                        {getIcon(format.label)}
                        <div>
                          <p className="font-medium text-sm text-foreground">{format.label}</p>
                          <p className="text-xs text-muted-foreground">{format.description}</p>
                        </div>
                      </div>
                      <AnimatePresence>
                        {selectedFormat === format.id && (
                          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                            <Check className="h-4 w-4 text-primary" />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </TooltipTrigger>
                  {format.example && (
                    <TooltipContent side="right" className="max-w-xs bg-background border-border text-foreground">
                      <p className="font-semibold mb-1">Example:</p>
                      <pre className="text-xs bg-muted p-2 rounded-md text-muted-foreground whitespace-pre-wrap">
                        <code>{format.example}</code>
                      </pre>
                    </TooltipContent>
                  )}
                </Tooltip>
              ))}
            </motion.div>
          </PopoverContent>
        </Popover>
        <Badge variant="secondary" className="hidden sm:inline-flex">{selectedFormatDetails.label}</Badge>
      </div>
    </TooltipProvider>
  );
};
