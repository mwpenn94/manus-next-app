
import React, { useState, useRef } from 'react';
import { MessageSquare, CheckCircle, X, CornerUpLeft, Plus } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { AnimatePresence, motion } from 'framer-motion';

// --- TYPES ---
type Reply = {
  id: string;
  author: {
    name: string;
    avatar: string;
  };
  content: string;
  timestamp: string;
};

type CommentThread = {
  id: string;
  position: { x: number; y: number };
  author: {
    name: string;
    avatar: string;
  };
  content: string;
  timestamp: string;
  isResolved: boolean;
  replies: Reply[];
};

// --- MOCK DATA ---
const MOCK_ANNOTATIONS: CommentThread[] = [
  {
    id: 'anno-1',
    position: { x: 25, y: 15 },
    author: { name: 'Alex Doe', avatar: 'https://github.com/shadcn.png' },
    content: "Can we enhance the contrast on this section? It's a bit hard to read.",
    timestamp: '2 hours ago',
    isResolved: false,
    replies: [
      {
        id: 'reply-1-1',
        author: { name: 'Jane Smith', avatar: 'https://github.com/shadcn.png' },
        content: "Good point. I'll adjust the color scheme.",
        timestamp: '1 hour ago',
      },
    ],
  },
  {
    id: 'anno-2',
    position: { x: 60, y: 40 },
    author: { name: 'Sam Wilson', avatar: 'https://github.com/shadcn.png' },
    content: 'What is the data source for this chart? We should cite it.',
    timestamp: '5 hours ago',
    isResolved: false,
    replies: [],
  },
  {
    id: 'anno-3',
    position: { x: 80, y: 75 },
    author: { name: 'Alex Doe', avatar: 'https://github.com/shadcn.png' },
    content: 'This image seems to be low resolution. Can we get a higher quality version?',
    timestamp: '1 day ago',
    isResolved: true,
    replies: [
      {
        id: 'reply-3-1',
        author: { name: 'Jane Smith', avatar: 'https://github.com/shadcn.png' },
        content: 'Already on it. The new version has been uploaded.',
        timestamp: '22 hours ago',
      },
    ],
  },
];

// --- HELPER COMPONENTS ---
const AnnotationPin = ({ annotation, onClick, index }: { annotation: CommentThread; onClick: () => void; index: number }) => (
  <motion.div
    className="absolute w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold cursor-pointer shadow-lg"
    style={{ left: `${annotation.position.x}%`, top: `${annotation.position.y}%` }}
    onClick={onClick}
    whileHover={{ scale: 1.2 }}
  >
    {index + 1}
  </motion.div>
);

const CommentCard = ({ annotation, onReply, onResolveToggle, commentRef }: { annotation: CommentThread; onReply: (id: string, content: string) => void; onResolveToggle: (id: string) => void; commentRef: React.RefObject<HTMLDivElement | null> }) => {
  const [replying, setReplying] = useState(false);
  const [replyContent, setReplyContent] = useState('');

  const handleReplySubmit = () => {
    if (replyContent.trim()) {
      onReply(annotation.id, replyContent);
      setReplyContent('');
      setReplying(false);
    }
  };

  return (
    <div ref={commentRef} className="mb-4 last:mb-0">
      <Card className={`transition-opacity ${annotation.isResolved ? 'opacity-60' : 'opacity-100'}`}>
        <CardHeader className="p-4 flex flex-row items-start justify-between">
          <div className="flex items-center space-x-3">
            <Avatar className="w-8 h-8">
              <AvatarImage src={annotation.author.avatar} alt={annotation.author.name} />
              <AvatarFallback>{annotation.author.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-semibold">{annotation.author.name}</p>
              <p className="text-xs text-gray-500">{annotation.timestamp}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => onResolveToggle(annotation.id)}>
            <CheckCircle className={`w-4 h-4 ${annotation.isResolved ? 'text-green-500' : 'text-gray-400'}`} />
          </Button>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <p className="text-sm">{annotation.content}</p>
        </CardContent>
        {annotation.replies.length > 0 && (
          <CardContent className="p-4 pt-0 border-t">
            {annotation.replies.map(reply => (
              <div key={reply.id} className="flex items-start space-x-3 mt-3 first:mt-0">
                <Avatar className="w-6 h-6">
                  <AvatarImage src={reply.author.avatar} alt={reply.author.name} />
                  <AvatarFallback>{reply.author.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-semibold">{reply.author.name} <span className="text-xs text-gray-500 font-normal">{reply.timestamp}</span></p>
                  <p className="text-sm">{reply.content}</p>
                </div>
              </div>
            ))}
          </CardContent>
        )}
        <CardFooter className="p-4 pt-0">
          {!replying && (
            <Button variant="ghost" size="sm" onClick={() => setReplying(true)}>
              <CornerUpLeft className="w-4 h-4 mr-2" />
              Reply
            </Button>
          )}
          <AnimatePresence>
            {replying && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="w-full overflow-hidden">
                <Textarea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="Write a reply..."
                  className="mt-2"
                />
                <div className="flex justify-end space-x-2 mt-2">
                  <Button variant="ghost" size="sm" onClick={() => setReplying(false)}>Cancel</Button>
                  <Button size="sm" onClick={handleReplySubmit}>Submit</Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardFooter>
      </Card>
    </div>
  );
};

// --- MAIN COMPONENT ---
export default function CommentAnnotation() {
  const [annotations, setAnnotations] = useState<CommentThread[]>(MOCK_ANNOTATIONS);
  const [showResolved, setShowResolved] = useState(true);
  const commentRefs = useRef<{[key: string]: React.RefObject<HTMLDivElement | null>}>({});

  annotations.forEach(anno => {
    if (!commentRefs.current[anno.id]) {
      commentRefs.current[anno.id] = React.createRef<HTMLDivElement>();
    }
  });

  const handlePinClick = (id: string) => {
    commentRefs.current[id]?.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const handleResolveToggle = (id: string) => {
    setAnnotations(prev =>
      prev.map(anno =>
        anno.id === id ? { ...anno, isResolved: !anno.isResolved } : anno
      )
    );
  };

  const handleReply = (id: string, content: string) => {
    const newReply: Reply = {
      id: `reply-${id}-${Date.now()}`,
      author: { name: 'Current User', avatar: 'https://github.com/shadcn.png' },
      content,
      timestamp: 'Just now',
    };
    setAnnotations(prev =>
      prev.map(anno =>
        anno.id === id ? { ...anno, replies: [...anno.replies, newReply] } : anno
      )
    );
  };

  const filteredAnnotations = annotations.filter(anno => showResolved || !anno.isResolved);

  return (
    <div className="flex h-[700px] w-full bg-gray-50">
      {/* Content Area */}
      <div className="flex-grow relative bg-gray-200 m-8 rounded-lg overflow-hidden">
        <img src="https://images.unsplash.com/photo-1522071820081-009f0129c711?q=80&w=2070&auto=format&fit=crop" alt="Content background" className="w-full h-full object-cover" />
        <div className="absolute inset-0">
          {annotations.map((anno, index) => (
            <AnnotationPin key={anno.id} annotation={anno} index={index} onClick={() => handlePinClick(anno.id)} />
          ))}
        </div>
      </div>

      {/* Sidebar */}
      <div className="w-[380px] h-full bg-white border-l border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Comments ({filteredAnnotations.length})</h2>
          <div className="flex items-center space-x-2">
            <Switch id="show-resolved" checked={showResolved} onCheckedChange={setShowResolved} />
            <Label htmlFor="show-resolved" className="text-sm">Show Resolved</Label>
          </div>
        </div>
        <div className="flex-grow overflow-y-auto p-4">
          {filteredAnnotations.map(anno => (
            <CommentCard
              key={anno.id}
              annotation={anno}
              onReply={handleReply}
              onResolveToggle={handleResolveToggle}
              commentRef={commentRefs.current[anno.id]}
            />
          ))}
        </div>
        <div className="p-4 border-t border-gray-200">
            <Button className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Add New Comment
            </Button>
        </div>
      </div>
    </div>
  );
}
