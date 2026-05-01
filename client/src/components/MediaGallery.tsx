
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Image as ImageIcon, LayoutGrid, List, X, ArrowLeft, ArrowRight, CheckSquare, Square, ChevronDown } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

const mockImages = [
  { id: 1, src: 'https://images.unsplash.com/photo-1617396900799-f4ec2b43c7ae?w=800&q=80', name: 'Abstract Fluid Art', width: 800, height: 1000, format: 'JPEG', size: '212 KB', date: '2023-03-15' },
  { id: 2, src: 'https://images.unsplash.com/photo-1550684376-ef9b86b05aa0?w=800&q=80', name: 'Retro Tech Grid', width: 800, height: 600, format: 'PNG', size: '345 KB', date: '2023-05-20' },
  { id: 3, src: 'https://images.unsplash.com/photo-1543286386-7134a0012267?w=800&q=80', name: 'Mountain Vista', width: 800, height: 533, format: 'JPEG', size: '189 KB', date: '2022-11-01' },
  { id: 4, src: 'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=800&q=80', name: 'Lush Valley', width: 800, height: 533, format: 'WEBP', size: '150 KB', date: '2024-01-10' },
  { id: 5, src: 'https://images.unsplash.com/photo-1511497584788-876760111969?w=800&q=80', name: 'Forest Canopy', width: 800, height: 1200, format: 'JPEG', size: '431 KB', date: '2023-09-28' },
  { id: 6, src: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800&q=80', name: 'Gradient Background', width: 800, height: 600, format: 'PNG', size: '98 KB', date: '2022-07-14' },
];

type Image = {
  id: number;
  src: string;
  name: string;
  width: number;
  height: number;
  format: string;
  size: string;
  date: string;
};

type SortOption = 'date-desc' | 'date-asc' | 'name-asc' | 'name-desc';

export default function MediaGallery() {
  const [images, setImages] = useState<Image[]>(mockImages);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sort, setSort] = useState<SortOption>('date-desc');
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
  const [isBatchSelectionMode, setIsBatchSelectionMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());

  const sortedImages = useMemo(() => {
    return [...images].sort((a, b) => {
      switch (sort) {
        case 'name-asc': return a.name.localeCompare(b.name);
        case 'name-desc': return b.name.localeCompare(a.name);
        case 'date-asc': return new Date(a.date).getTime() - new Date(b.date).getTime();
        case 'date-desc':
        default: return new Date(b.date).getTime() - new Date(a.date).getTime();
      }
    });
  }, [images, sort]);

  const handleItemClick = (id: number) => {
    const index = sortedImages.findIndex(img => img.id === id);
    if (isBatchSelectionMode) {
      toggleItemSelection(id);
    } else {
      setSelectedImageIndex(index);
    }
  };

  const closeLightbox = () => setSelectedImageIndex(null);

  const nextImage = useCallback(() => {
    if (selectedImageIndex !== null) {
      setSelectedImageIndex((prev) => (prev! + 1) % sortedImages.length);
    }
  }, [selectedImageIndex, sortedImages.length]);

  const prevImage = useCallback(() => {
    if (selectedImageIndex !== null) {
      setSelectedImageIndex((prev) => (prev! - 1 + sortedImages.length) % sortedImages.length);
    }
  }, [selectedImageIndex, sortedImages.length]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedImageIndex === null) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowRight') nextImage();
      if (e.key === 'ArrowLeft') prevImage();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedImageIndex, nextImage, prevImage]);

  const toggleBatchSelection = () => {
    setIsBatchSelectionMode(prev => !prev);
    setSelectedItems(new Set());
  };

  const toggleItemSelection = (id: number) => {
    const newSelection = new Set(selectedItems);
    if (newSelection.has(id)) newSelection.delete(id); else newSelection.add(id);
    setSelectedItems(newSelection);
  };

  const Lightbox = () => {
    if (selectedImageIndex === null) return null;
    const image = sortedImages[selectedImageIndex];

    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
          onClick={closeLightbox}
        >
          <div className="relative w-full h-full flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <motion.img
              key={image.src} layoutId={`image-${image.id}`}
              initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }}
              src={image.src} alt={image.name}
              className="max-w-[calc(100vw-20rem)] max-h-[90vh] object-contain rounded-lg shadow-2xl"
            />
            <div className="absolute top-0 right-0 bottom-0 w-72 bg-gray-900/60 text-white p-6 overflow-y-auto">
              <h3 className="text-xl font-bold mb-4">Details</h3>
              <p className="font-semibold">{image.name}</p>
              <div className="text-sm space-y-2 mt-4 text-gray-300">
                <p><strong>Dimensions:</strong> {image.width} x {image.height}</p>
                <p><strong>Format:</strong> {image.format}</p>
                <p><strong>Size:</strong> {image.size}</p>
                <p><strong>Date:</strong> {new Date(image.date).toLocaleDateString()}</p>
              </div>
            </div>
            <button onClick={closeLightbox} className="absolute top-4 right-[18.5rem] text-white/70 hover:text-white transition-colors z-10"><X size={32} /></button>
            <button onClick={prevImage} className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/75 transition"><ArrowLeft size={24} /></button>
            <button onClick={nextImage} className="absolute right-[18.5rem] top-1/2 -translate-y-1/2 bg-black/50 text-white p-2 rounded-full hover:bg-black/75 transition"><ArrowRight size={24} /></button>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  };

  const GalleryItem = ({ image }: { image: Image }) => {
    const isSelected = selectedItems.has(image.id);
    return (
      <motion.div layout className="relative group break-inside-avoid cursor-pointer" onClick={() => handleItemClick(image.id)}>
        <motion.img layoutId={`image-${image.id}`} src={image.src} alt={image.name} className={`w-full h-auto object-cover rounded-lg shadow-md transition-all duration-300 ${isSelected ? 'ring-4 ring-blue-500 ring-offset-2' : ''} ${isBatchSelectionMode ? '' : 'group-hover:scale-105'}`} />
        {isBatchSelectionMode && (
          <div className={`absolute top-2 left-2 bg-white/80 rounded-full p-1 transition-all ${isSelected ? 'scale-100' : 'scale-0 group-hover:scale-100'}`}>
            {isSelected ? <CheckSquare className="text-blue-600" /> : <Square className="text-gray-500" />}
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-4 bg-gray-100 rounded-lg shadow-inner font-sans">
      <div className="flex items-center justify-between mb-4 p-2 bg-white rounded-md shadow-sm">
        <div className="flex items-center gap-2">
            <button onClick={toggleBatchSelection} className={`px-3 py-2 rounded-md text-sm font-medium flex items-center transition-colors ${isBatchSelectionMode ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}>
              <CheckSquare className="w-4 h-4 mr-2" />
              {isBatchSelectionMode ? `(${selectedItems.size}) Selected` : 'Select'}
            </button>
            <div className="relative">
                <select onChange={(e) => setSort(e.target.value as SortOption)} value={sort} className="appearance-none bg-gray-200 text-gray-800 text-sm font-medium rounded-md pl-3 pr-8 py-2 hover:bg-gray-300 cursor-pointer">
                    <option value="date-desc">Newest</option>
                    <option value="date-asc">Oldest</option>
                    <option value="name-asc">Name (A-Z)</option>
                    <option value="name-desc">Name (Z-A)</option>
                </select>
                <ChevronDown className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 text-gray-600 pointer-events-none" />
            </div>
        </div>
        <div className="flex items-center space-x-1 bg-gray-200 p-1 rounded-md">
          <button onClick={() => setViewMode('grid')} className={`p-2 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-white'}`}><LayoutGrid className="w-5 h-5" /></button>
          <button onClick={() => setViewMode('list')} className={`p-2 rounded-md transition-colors ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-white'}`}><List className="w-5 h-5" /></button>
        </div>
      </div>

      {viewMode === 'grid' ? (
        <motion.div layout className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
          {sortedImages.map((image) => <GalleryItem key={image.id} image={image} />)}
        </motion.div>
      ) : (
        <motion.div layout className="space-y-2">
          {sortedImages.map((image) => (
            <motion.div layout key={image.id} className={`flex items-center p-2 bg-white rounded-lg shadow-sm hover:bg-gray-50 transition-all cursor-pointer ${selectedItems.has(image.id) ? 'ring-2 ring-blue-500' : ''}`} onClick={() => handleItemClick(image.id)}>
              {isBatchSelectionMode && <div className="mr-4">{selectedItems.has(image.id) ? <CheckSquare className="text-blue-600" /> : <Square className="text-gray-500" />}</div>}
              <motion.img layoutId={`image-${image.id}`} src={image.src} alt={image.name} className="w-16 h-16 object-cover rounded-md mr-4" />
              <div className="flex-grow">
                <p className="font-semibold text-gray-800">{image.name}</p>
                <p className="text-sm text-gray-500">{image.width}x{image.height} - {image.format} - {image.size}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      <Lightbox />
    </div>
  );
}
