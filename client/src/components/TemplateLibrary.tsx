import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, FileText, Mail, Presentation as PresentationIcon, Share2, LayoutTemplate, Star, Users, ChevronRight, Download } from 'lucide-react';

type Category = 'All' | 'Email' | 'Report' | 'Presentation' | 'Social';

interface Template {
  id: string;
  title: string;
  description: string;
  category: Category;
  thumbnail: string;
  author: string;
  uses: number;
  tags: string[];
  previewContent: string;
}

const MOCK_TEMPLATES: Template[] = [
  { 
    id: '1', 
    title: 'Weekly Status Report', 
    description: 'A comprehensive weekly status report template for engineering teams.', 
    category: 'Report', 
    thumbnail: 'bg-blue-500', 
    author: 'Alice Chen', 
    uses: 1240, 
    tags: ['weekly', 'engineering', 'status'],
    previewContent: '1. Executive Summary\n2. Key Accomplishments\n3. Blockers & Risks\n4. Next Week Priorities'
  },
  { 
    id: '2', 
    title: 'Client Onboarding Email', 
    description: 'Standard welcome email for new enterprise clients.', 
    category: 'Email', 
    thumbnail: 'bg-green-500', 
    author: 'Bob Smith', 
    uses: 850, 
    tags: ['onboarding', 'client', 'welcome'],
    previewContent: 'Subject: Welcome to [Company]!\n\nHi [Name],\n\nWe are thrilled to have you on board...'
  },
  { 
    id: '3', 
    title: 'Q3 Pitch Deck', 
    description: 'Professional presentation template for quarterly business reviews.', 
    category: 'Presentation', 
    thumbnail: 'bg-purple-500', 
    author: 'Charlie Davis', 
    uses: 3200, 
    tags: ['qbr', 'pitch', 'deck'],
    previewContent: 'Slide 1: Title\nSlide 2: Agenda\nSlide 3: Q3 Highlights\nSlide 4: Financials\nSlide 5: Q4 Roadmap'
  },
  { 
    id: '4', 
    title: 'Product Launch Thread', 
    description: 'Engaging 5-part thread template for new feature announcements.', 
    category: 'Social', 
    thumbnail: 'bg-yellow-500', 
    author: 'Diana Prince', 
    uses: 450, 
    tags: ['twitter', 'launch', 'thread'],
    previewContent: '1/5 🚀 We are excited to announce [Feature]!\n\n2/5 Here is why we built it...\n\n3/5 How it works...'
  },
  { 
    id: '5', 
    title: 'Monthly Marketing Analytics', 
    description: 'Detailed report template for marketing performance metrics.', 
    category: 'Report', 
    thumbnail: 'bg-red-500', 
    author: 'Eve Adams', 
    uses: 670, 
    tags: ['marketing', 'analytics', 'data'],
    previewContent: 'Traffic Overview\n- Organic: [X]%\n- Paid: [Y]%\n\nConversion Rates\n- Landing Page A: [Z]%'
  },
  { 
    id: '6', 
    title: 'Newsletter Template', 
    description: 'Clean, responsive email template for weekly newsletters.', 
    category: 'Email', 
    thumbnail: 'bg-indigo-500', 
    author: 'Frank Castle', 
    uses: 2100, 
    tags: ['newsletter', 'weekly', 'update'],
    previewContent: 'Header Image\n\nTop Story: [Headline]\n\nIndustry News\n- [Link 1]\n- [Link 2]\n\nFooter'
  },
  { 
    id: '7', 
    title: 'Investor Update', 
    description: 'Quarterly update presentation for stakeholders and investors.', 
    category: 'Presentation', 
    thumbnail: 'bg-pink-500', 
    author: 'Grace Hopper', 
    uses: 150, 
    tags: ['investor', 'update', 'financial'],
    previewContent: 'Company Metrics\n- MRR: $X\n- Churn: Y%\n- CAC: $Z\n\nKey Hires\n- [Role 1]\n- [Role 2]'
  },
  { 
    id: '8', 
    title: 'LinkedIn Post - Hiring', 
    description: 'Template for announcing open roles on LinkedIn.', 
    category: 'Social', 
    thumbnail: 'bg-teal-500', 
    author: 'Hank Pym', 
    uses: 890, 
    tags: ['linkedin', 'hiring', 'recruiting'],
    previewContent: 'We are growing! 🌱\n\nOur team is looking for a [Role] to help us build [Product].\n\nApply here: [Link]'
  },
];

const CATEGORIES: { id: Category; label: string; icon: React.ElementType }[] = [
  { id: 'All', label: 'All Templates', icon: LayoutTemplate },
  { id: 'Email', label: 'Email', icon: Mail },
  { id: 'Report', label: 'Report', icon: FileText },
  { id: 'Presentation', label: 'Presentation', icon: PresentationIcon },
  { id: 'Social', label: 'Social', icon: Share2 },
];

export default function TemplateLibrary() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<Category>('All');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);

  const filteredTemplates = useMemo(() => {
    return MOCK_TEMPLATES.filter(template => {
      const matchesSearch = template.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            template.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCategory = activeCategory === 'All' || template.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, activeCategory]);

  return (
    <div className="flex h-screen w-full bg-gray-50 text-gray-900 overflow-hidden font-sans">
      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Header */}
        <header className="px-8 py-6 bg-white border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Template Library</h1>
              <p className="text-sm text-gray-500 mt-1">Discover and use pre-built templates for your workflows.</p>
            </div>
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-100 border-transparent rounded-lg text-sm focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none"
              />
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide">
            {CATEGORIES.map((category) => {
              const Icon = category.icon;
              const isActive = activeCategory === category.id;
              return (
                <button
                  key={category.id}
                  onClick={() => setActiveCategory(category.id)}
                  className={`flex items-center px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                    isActive 
                      ? 'bg-blue-600 text-white shadow-sm' 
                      : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  <Icon className={`w-4 h-4 mr-2 ${isActive ? 'text-blue-100' : 'text-gray-400'}`} />
                  {category.label}
                </button>
              );
            })}
          </div>
        </header>

        {/* Grid */}
        <main className="flex-1 overflow-y-auto p-8">
          {filteredTemplates.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              <AnimatePresence>
                {filteredTemplates.map((template) => (
                  <motion.div
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.2 }}
                    key={template.id}
                    onClick={() => setSelectedTemplate(template)}
                    className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group flex flex-col h-full"
                  >
                    {/* Thumbnail */}
                    <div className={`h-40 w-full ${template.thumbnail} relative overflow-hidden`}>
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                        <div className="opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all bg-white text-gray-900 px-4 py-2 rounded-lg font-medium text-sm shadow-sm flex items-center">
                          Preview <ChevronRight className="w-4 h-4 ml-1" />
                        </div>
                      </div>
                      {/* Decorative elements for thumbnail */}
                      <div className="absolute top-4 left-4 right-4 bottom-4 bg-white/20 rounded border border-white/30 backdrop-blur-sm p-3">
                        <div className="w-1/3 h-2 bg-white/50 rounded mb-2"></div>
                        <div className="w-full h-2 bg-white/30 rounded mb-1"></div>
                        <div className="w-5/6 h-2 bg-white/30 rounded mb-1"></div>
                        <div className="w-4/6 h-2 bg-white/30 rounded"></div>
                      </div>
                    </div>
                    
                    {/* Content */}
                    <div className="p-5 flex flex-col flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-gray-900 line-clamp-1" title={template.title}>{template.title}</h3>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 ml-2 shrink-0">
                          {template.category}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 line-clamp-2 mb-4 flex-1">{template.description}</p>
                      
                      <div className="flex items-center justify-between text-xs text-gray-400 mt-auto pt-4 border-t border-gray-100">
                        <div className="flex items-center">
                          <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-medium mr-2">
                            {template.author.charAt(0)}
                          </div>
                          {template.author}
                        </div>
                        <div className="flex items-center">
                          <Download className="w-3 h-3 mr-1" />
                          {template.uses.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Search className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-1">No templates found</h3>
              <p className="text-gray-500 max-w-sm">We couldn't find any templates matching your search. Try adjusting your filters or search query.</p>
              <button 
                onClick={() => { setSearchQuery(''); setActiveCategory('All'); }}
                className="mt-4 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
              >
                Clear filters
              </button>
            </div>
          )}
        </main>
      </div>

      {/* Detail Panel Overlay */}
      <AnimatePresence>
        {selectedTemplate && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedTemplate(null)}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
            />
            <motion.div
              initial={{ x: '100%', boxShadow: '-10px 0 30px rgba(0,0,0,0)' }}
              animate={{ x: 0, boxShadow: '-10px 0 30px rgba(0,0,0,0.1)' }}
              exit={{ x: '100%', boxShadow: '-10px 0 30px rgba(0,0,0,0)' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-white z-50 flex flex-col shadow-2xl border-l border-gray-200"
            >
              {/* Panel Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900">Template Details</h2>
                <button 
                  onClick={() => setSelectedTemplate(null)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Panel Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {/* Large Preview */}
                <div className={`w-full aspect-video rounded-xl ${selectedTemplate.thumbnail} mb-6 relative overflow-hidden shadow-inner`}>
                  <div className="absolute inset-4 bg-white/90 backdrop-blur-md rounded-lg p-4 shadow-sm overflow-hidden flex flex-col">
                    <div className="w-1/2 h-3 bg-gray-200 rounded mb-4"></div>
                    <div className="space-y-2 flex-1">
                      <div className="w-full h-2 bg-gray-100 rounded"></div>
                      <div className="w-full h-2 bg-gray-100 rounded"></div>
                      <div className="w-5/6 h-2 bg-gray-100 rounded"></div>
                      <div className="w-4/6 h-2 bg-gray-100 rounded"></div>
                    </div>
                    <div className="mt-auto flex justify-end">
                      <div className="w-16 h-6 bg-blue-100 rounded"></div>
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700">
                      {selectedTemplate.category}
                    </span>
                    <span className="flex items-center text-xs text-gray-500">
                      <Star className="w-3.5 h-3.5 mr-1 text-yellow-400 fill-yellow-400" />
                      4.9 (120 reviews)
                    </span>
                  </div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">{selectedTemplate.title}</h1>
                  <p className="text-gray-600 leading-relaxed">{selectedTemplate.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <div className="flex items-center text-gray-500 mb-1">
                      <Users className="w-4 h-4 mr-2" />
                      <span className="text-xs font-medium uppercase tracking-wider">Author</span>
                    </div>
                    <p className="font-medium text-gray-900">{selectedTemplate.author}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <div className="flex items-center text-gray-500 mb-1">
                      <Download className="w-4 h-4 mr-2" />
                      <span className="text-xs font-medium uppercase tracking-wider">Uses</span>
                    </div>
                    <p className="font-medium text-gray-900">{selectedTemplate.uses.toLocaleString()}</p>
                  </div>
                </div>

                <div className="mb-8">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wider">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedTemplate.tags.map(tag => (
                      <span key={tag} className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3 uppercase tracking-wider">Preview Content</h3>
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 text-sm text-gray-700 whitespace-pre-wrap font-mono">
                    {selectedTemplate.previewContent}
                  </div>
                </div>
              </div>

              {/* Panel Footer */}
              <div className="p-6 border-t border-gray-100 bg-gray-50 flex space-x-3">
                <button className="flex-1 bg-white border border-gray-300 text-gray-700 px-4 py-2.5 rounded-lg font-medium hover:bg-gray-50 transition-colors focus:ring-2 focus:ring-gray-200 outline-none">
                  Customize
                </button>
                <button className="flex-1 bg-blue-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 outline-none">
                  Use Template
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}