import React, { useState, useMemo } from 'react';
import { Folder, File, Star, Clock, Tag, GripVertical, Download, Upload, List, LayoutGrid, MoreHorizontal, Plus, Search, BookOpen, CheckCircle, Trash2 } from 'lucide-react';
import { motion, Reorder } from 'framer-motion';

// Mock Data
const initialFolders = [
  { id: '1', name: 'Work', parentId: null },
  { id: '2', name: 'Personal', parentId: null },
  { id: '3', name: 'Design Inspiration', parentId: '1' },
  { id: '4', name: 'Side Projects', parentId: '1' },
  { id: '5', name: 'Recipes', parentId: '2' },
];

const initialBookmarks = [
  { id: 'b1', folderId: '3', title: 'Awwwards', url: 'https://www.awwwards.com/', description: 'Best of web design.', tags: ['design', 'inspiration'], favicon: 'https://www.awwwards.com/favicon.ico' },
  { id: 'b2', folderId: '3', title: 'Dribbble', url: 'https://dribbble.com/', description: 'Discover the world’s top designers & creatives.', tags: ['design', 'ui/ux'], favicon: 'https://cdn.dribbble.com/assets/favicon-63b2904a073c893733459353229e02b3a299d1a537218152f2f8f799962b41a4.ico' },
  { id: 'b3', folderId: '4', title: 'React Docs', url: 'https://react.dev/', description: 'The library for web and native user interfaces.', tags: ['react', 'docs'], favicon: 'https://react.dev/favicon.ico' },
  { id: 'b4', folderId: '5', title: 'Smitten Kitchen', url: 'https://smittenkitchen.com/', description: 'Fearless cooking from a tiny kitchen in New York City.', tags: ['cooking', 'food'], favicon: 'https://smittenkitchen.com/favicon.ico' },
];

const initialReadingList = [
    { id: 'r1', bookmarkId: 'b3', read: false, addedAt: new Date() },
    { id: 'r2', bookmarkId: 'b4', read: true, addedAt: new Date(Date.now() - 86400000) },
];

// Main Component
export default function BookmarkCollection() {
  const [folders, setFolders] = useState(initialFolders);
  const [bookmarks, setBookmarks] = useState(initialBookmarks);
  const [readingList, setReadingList] = useState(initialReadingList);
  const [selectedFolder, setSelectedFolder] = useState('3');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [searchTerm, setSearchTerm] = useState('');

  const filteredBookmarks = useMemo(() => {
    return bookmarks
      .filter(b => b.folderId === selectedFolder)
      .filter(b => 
        b.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );
  }, [bookmarks, selectedFolder, searchTerm]);

  const renderFolderTree = (parentId: string | null = null) => {
    return folders
      .filter(folder => folder.parentId === parentId)
      .map(folder => (
        <div key={folder.id} className="pl-4">
          <div 
            className={`flex items-center p-2 rounded-md cursor-pointer ${selectedFolder === folder.id ? 'bg-gray-200 dark:bg-gray-700' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}
            onClick={() => setSelectedFolder(folder.id)}
          >
            <Folder size={16} className="mr-2" />
            <span>{folder.name}</span>
          </div>
          {renderFolderTree(folder.id)}
        </div>
      ));
  };

  const BookmarkCard = ({ bookmark, isGrid }: { bookmark: typeof initialBookmarks[0]; isGrid: boolean }) => (
    <motion.div layout className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm flex items-start space-x-4 relative group">
        <img src={bookmark.favicon} alt="" className="w-6 h-6 mt-1" onError={(e) => e.currentTarget.src = `https://www.google.com/s2/favicons?domain=${bookmark.url}`}/>
        <div className="flex-1">
            <a href={bookmark.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-gray-800 dark:text-white hover:underline">
                {bookmark.title}
            </a>
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{bookmark.url}</p>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{bookmark.description}</p>
            <div className="mt-2 flex flex-wrap gap-2">
                {bookmark.tags.map((tag: string) => (
                    <span key={tag} className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded-full dark:bg-blue-900 dark:text-blue-200">{tag}</span>
                ))}
            </div>
        </div>
        <div className="absolute top-2 right-2 flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full" onClick={() => alert('Add to reading list')}><BookOpen size={14} /></button>
            <button className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full"><MoreHorizontal size={14} /></button>
        </div>
        <div className="absolute bottom-2 right-2 cursor-grab opacity-25 group-hover:opacity-100 transition-opacity">
            <GripVertical size={16} />
        </div>
    </motion.div>
  );

  const ReadingListItem = ({ item }: { item: typeof initialReadingList[0] }) => {
      const bookmark = bookmarks.find(b => b.id === item.bookmarkId);
      if (!bookmark) return null;

      return (
          <div className={`flex items-center p-2 rounded-md ${item.read ? 'opacity-60' : ''}`}>
              <img src={bookmark.favicon} alt="" className="w-4 h-4 mr-3" onError={(e) => e.currentTarget.src = `https://www.google.com/s2/favicons?domain=${bookmark.url}`}/>
              <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{bookmark.title}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{bookmark.url}</p>
              </div>
              <div className="flex items-center space-x-2 ml-2">
                  <button className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full" onClick={() => alert('Toggle read status')}>
                      {item.read ? <CheckCircle size={16} className="text-green-500" /> : <CheckCircle size={16} className="text-gray-400" />}
                  </button>
                  <button className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full" onClick={() => alert('Remove from list')}><Trash2 size={14} /></button>
              </div>
          </div>
      )
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        <div className="p-4">
          <h2 className="text-lg font-semibold">Folders</h2>
        </div>
        <nav className="flex-1 overflow-y-auto">
          {renderFolderTree()}
        </nav>
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold mb-2">Reading List</h3>
            <div className="space-y-1 max-h-48 overflow-y-auto">
                {readingList.map(item => <ReadingListItem key={item.id} item={item} />)}
            </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        <header className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-4">
            <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                    type="text" 
                    placeholder="Search bookmarks..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md pl-10 pr-4 py-2 w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button className="flex items-center space-x-2 px-3 py-2 text-sm rounded-md bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700">
              <Upload size={16} />
              <span>Import</span>
            </button>
            <button className="flex items-center space-x-2 px-3 py-2 text-sm rounded-md bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700">
              <Download size={16} />
              <span>Export</span>
            </button>
            <button className="flex items-center space-x-2 px-3 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700">
              <Plus size={16} />
              <span>Add</span>
            </button>
            <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded-md ml-4">
                <button onClick={() => setViewMode('list')} className={`p-2 rounded-l-md ${viewMode === 'list' ? 'bg-gray-200 dark:bg-gray-700' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}><List size={18}/></button>
                <button onClick={() => setViewMode('grid')} className={`p-2 rounded-r-md ${viewMode === 'grid' ? 'bg-gray-200 dark:bg-gray-700' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}><LayoutGrid size={18}/></button>
            </div>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-4">
          <Reorder.Group 
            axis="y" 
            values={filteredBookmarks} 
            onReorder={setBookmarks} 
            className={`gap-4 ${viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3' : 'flex flex-col'}`}
          >
            {filteredBookmarks.map(bookmark => (
              <Reorder.Item key={bookmark.id} value={bookmark}>
                <BookmarkCard bookmark={bookmark} isGrid={viewMode === 'grid'} />
              </Reorder.Item>
            ))}
          </Reorder.Group>
          {filteredBookmarks.length === 0 && (
              <div className="text-center py-16 text-gray-500">
                  <p>No bookmarks found in this folder.</p>
              </div>
          )}
        </div>
      </main>
    </div>
  );
}
