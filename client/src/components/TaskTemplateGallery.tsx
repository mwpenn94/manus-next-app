import DOMPurify from "dompurify";

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, GripVertical, List, PlusCircle } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";


type Template = {
  id: string;
  title: string;
  description: string;
  prompt: string;
  category: string;
  icon: string;
  usageCount: number;
  createdAt: number;
};

type TaskTemplateGalleryProps = {
  templates: Template[];
  onUseTemplate: (template: { title: string; prompt: string }) => void;
  onDeleteTemplate: (id: string) => void;
  onEditTemplate: (id: string) => void;
  categories: string[];
};

const TemplateCard = ({ template, onPreview, onEdit, onDelete }: {
    template: Template;
    onPreview: () => void;
    onEdit: (e: React.MouseEvent) => void;
    onDelete: (e: React.MouseEvent) => void;
}) => {
    const Icon = (props: any) => <div {...props} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(template.icon) }} />;

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ type: 'spring' as const, stiffness: 300, damping: 25 }}
            className="relative group"
        >
            <Card className="h-full flex flex-col cursor-pointer transition-all duration-200 hover:shadow-lg hover:border-primary/50" onClick={onPreview}>
                <CardHeader className="flex-row items-start gap-4 space-y-0 pb-4">
                    <div className="w-10 h-10 flex items-center justify-center bg-accent rounded-lg">
                        <Icon className="w-6 h-6 text-accent-foreground" />
                    </div>
                    <div className="flex-1">
                        <CardTitle className="text-base font-semibold">{template.title}</CardTitle>
                        <Badge variant="secondary" className="mt-1">{template.category}</Badge>
                    </div>
                </CardHeader>
                <CardContent className="flex-1">
                    <p className="text-sm text-muted-foreground line-clamp-2">{template.description}</p>
                </CardContent>
                <div className="p-4 pt-0 flex justify-between items-center text-xs text-muted-foreground">
                    <span>Used {template.usageCount} times</span>
                </div>
            </Card>
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}>
                    <GripVertical className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onDelete}>
                    <X className="h-4 w-4" />
                </Button>
            </div>
        </motion.div>
    );
};

export const TaskTemplateGallery = ({
  templates,
  onUseTemplate,
  onDeleteTemplate,
  onEditTemplate,
  categories,
}: TaskTemplateGalleryProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [sortOrder, setSortOrder] = useState('Most used');
  const [previewingTemplate, setPreviewingTemplate] = useState<Template | null>(null);

  const filteredAndSortedTemplates = useMemo(() => {
    let filtered = templates.filter(
      (t) =>
        (t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          t.description.toLowerCase().includes(searchTerm.toLowerCase())) &&
        (selectedCategory === 'All' || t.category === selectedCategory)
    );

    switch (sortOrder) {
      case 'Most used':
        filtered.sort((a, b) => b.usageCount - a.usageCount);
        break;
      case 'Newest':
        filtered.sort((a, b) => b.createdAt - a.createdAt);
        break;
      case 'Alphabetical':
        filtered.sort((a, b) => a.title.localeCompare(b.title));
        break;
    }

    return filtered;
  }, [templates, searchTerm, selectedCategory, sortOrder]);

  const handleUseTemplate = () => {
    if (previewingTemplate) {
      onUseTemplate({ title: previewingTemplate.title, prompt: previewingTemplate.prompt });
      setPreviewingTemplate(null);
    }
  };

  if (templates.length === 0) {
      return (
          <div className="flex flex-col items-center justify-center h-[500px] text-center p-8 border-2 border-dashed rounded-lg">
              <PlusCircle className="w-16 h-16 text-muted-foreground mb-4" />
              <h2 className="text-2xl font-semibold mb-2">No templates yet</h2>
              <p className="text-muted-foreground mb-6">Create your first task template to get started.</p>
              <Button>Create New Template</Button>
          </div>
      )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 justify-between">
        <div className="relative w-full md:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
            <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="overflow-x-auto">
                <TabsList>
                    <TabsTrigger value="All">All</TabsTrigger>
                    {categories.map((cat) => (
                        <TabsTrigger key={cat} value={cat}>{cat}</TabsTrigger>
                    ))}
                </TabsList>
            </Tabs>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline">
                        <List className="mr-2 h-4 w-4" />
                        {sortOrder}
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    {['Most used', 'Newest', 'Alphabetical'].map(order => (
                        <DropdownMenuItem key={order} onSelect={() => setSortOrder(order)}>
                            {order}
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </div>

      <AnimatePresence>
        <motion.div layout className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredAndSortedTemplates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onPreview={() => setPreviewingTemplate(template)}
              onEdit={(e) => { e.stopPropagation(); onEditTemplate(template.id); }}
              onDelete={(e) => { e.stopPropagation(); onDeleteTemplate(template.id); }}
            />
          ))}
        </motion.div>
      </AnimatePresence>

      <AnimatePresence>
        {previewingTemplate && (
          <Dialog open onOpenChange={() => setPreviewingTemplate(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{previewingTemplate.title}</DialogTitle>
                <DialogDescription>{previewingTemplate.description}</DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <h4 className="font-semibold mb-2">Prompt</h4>
                <div className="max-h-[40vh] overflow-y-auto p-4 bg-muted rounded-md text-sm text-muted-foreground">
                  <pre className="whitespace-pre-wrap font-sans">{previewingTemplate.prompt}</pre>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleUseTemplate}>Use This Template</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>
    </div>
  );
};