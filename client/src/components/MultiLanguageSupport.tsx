import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, Languages, Search, ChevronDown, Globe } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

interface Language {
  code: string;
  name: string;
  nativeName: string;
  direction: 'ltr' | 'rtl';
  completeness: number;
}

interface TranslationStats {
  total: number;
  translated: number;
  missing: number;
}

interface MultiLanguageSupportProps {
  currentLanguage: string;
  availableLanguages: Language[];
  onLanguageChange: (code: string) => void;
  translationStats: TranslationStats;
  compact?: boolean;
}

const LanguageFlag = ({ code }: { code: string }) => {
  // Basic flag emoji generation from country code
  const countryCode = code.split('-')[1] || code;
  if (countryCode.length !== 2) {
    return <Globe className="w-4 h-4 mr-2" />;
  }
  const flag = countryCode.toUpperCase().replace(/./g, char => String.fromCodePoint(char.charCodeAt(0) + 127397));
  return <span className="mr-2 text-lg">{flag}</span>;
};

export const MultiLanguageSupport: React.FC<MultiLanguageSupportProps> = ({
  currentLanguage,
  availableLanguages,
  onLanguageChange,
  translationStats,
  compact = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const filteredLanguages = useMemo(() =>
    availableLanguages.filter(lang =>
      lang.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lang.nativeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lang.code.toLowerCase().includes(searchQuery.toLowerCase())
    ), [availableLanguages, searchQuery]);

  const currentLangDetails = availableLanguages.find(l => l.code === currentLanguage);

  const handleLanguageSelect = (code: string) => {
    onLanguageChange(code);
    setIsOpen(false);
    setSearchQuery('');
  };

  if (compact) {
    return (
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="icon">
            <Languages className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="end">
          {/* Content is the same as non-compact, just inside a popover */}
          <LanguageSelectorContent 
            currentLanguage={currentLanguage}
            filteredLanguages={filteredLanguages}
            handleLanguageSelect={handleLanguageSelect}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            translationStats={translationStats}
          />
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Languages className="mr-2" />
          Multi-Language Support
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <LanguageSelectorContent 
            currentLanguage={currentLanguage}
            filteredLanguages={filteredLanguages}
            handleLanguageSelect={handleLanguageSelect}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            translationStats={translationStats}
          />
      </CardContent>
      <CardFooter className="text-xs text-muted-foreground p-4">
        <p>Currently selected: <span className="font-semibold">{currentLangDetails?.name} ({currentLangDetails?.nativeName})</span></p>
      </CardFooter>
    </Card>
  );
};

const LanguageSelectorContent: React.FC<{
  currentLanguage: string;
  filteredLanguages: Language[];
  handleLanguageSelect: (code: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  translationStats: TranslationStats;
}> = ({ currentLanguage, filteredLanguages, handleLanguageSelect, searchQuery, setSearchQuery, translationStats }) => {
  const completenessPercentage = translationStats.total > 0 ? (translationStats.translated / translationStats.total) * 100 : 0;

  return (
    <div className="flex flex-col">
      <div className="p-4 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search languages..."
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="mt-4 text-sm text-muted-foreground">
          <div className="flex justify-between items-center mb-2">
            <span>Translation Progress</span>
            <span className="font-semibold">{Math.round(completenessPercentage)}%</span>
          </div>
          <Progress value={completenessPercentage} className="h-2" />
          <div className="flex justify-between mt-2 text-xs">
            <span>{translationStats.translated} translated</span>
            <span>{translationStats.missing} missing</span>
            <span>{translationStats.total} total</span>
          </div>
        </div>
      </div>
      <div className="max-h-60 overflow-y-auto p-2">
        <AnimatePresence>
          {filteredLanguages.map(lang => (
            <motion.div
              key={lang.code}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2, ease: 'easeInOut' as const }}
            >
              <Button
                variant="ghost"
                className="w-full justify-start h-auto py-2 px-3 mb-1"
                onClick={() => handleLanguageSelect(lang.code)}
              >
                <div className="flex items-center w-full">
                  <div className="flex items-center flex-grow">
                    <LanguageFlag code={lang.code} />
                    <div>
                      <div className="flex items-center">
                        <span className="font-medium">{lang.name}</span>
                        <Badge variant="outline" className="ml-2 text-xs">{lang.direction.toUpperCase()}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground text-left">{lang.nativeName}</p>
                    </div>
                  </div>
                  {currentLanguage === lang.code && <Check className="w-4 h-4 text-primary ml-auto" />}
                </div>
              </Button>
              <div className="px-3 pb-2">
                <Progress value={lang.completeness} className="h-1" />
                <p className="text-xs text-muted-foreground mt-1 text-right">{lang.completeness}% complete</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {filteredLanguages.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-4">No languages found.</p>
        )}
      </div>
    </div>
  );
};
