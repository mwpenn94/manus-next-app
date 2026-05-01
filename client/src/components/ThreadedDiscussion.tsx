import React, { useState, useMemo } from 'react';
import { MessageSquare, ChevronDown, ChevronRight, ArrowUp, ArrowDown, CornerDownRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

// --- TYPES ---
type CommentType = {
  id: string;
  author: string;
  avatar: string;
  timestamp: string;
  content: string;
  votes: number;
  replies: CommentType[];
};

// --- MOCK DATA ---
const initialComments: CommentType[] = [
  {
    id: '1',
    author: 'Alice',
    avatar: 'A',
    timestamp: '2 hours ago',
    content: 'This is the first top-level comment. What does everyone think about the new design?',
    votes: 15,
    replies: [
      {
        id: '1.1',
        author: 'Bob',
        avatar: 'B',
        timestamp: '1 hour ago',
        content: 'I like it! The color scheme is much more modern.',
        votes: 8,
        replies: [
          {
            id: '1.1.1',
            author: 'Alice',
            avatar: 'A',
            timestamp: '30 minutes ago',
            content: 'Glad you think so! We were aiming for a cleaner look.',
            votes: 3,
            replies: [],
          },
        ],
      },
      {
        id: '1.2',
        author: 'Charlie',
        avatar: 'C',
        timestamp: '45 minutes ago',
        content: 'It feels a bit too minimalist for my taste. Maybe some more graphical elements?',
        votes: -2,
        replies: [],
      },
    ],
  },
  {
    id: '2',
    author: 'David',
    avatar: 'D',
    timestamp: '5 hours ago',
    content: 'Second top-level comment here. Just wanted to say hi!',
    votes: 5,
    replies: [],
  },
];

const depthColors = [
  'border-blue-500',
  'border-green-500',
  'border-purple-500',
];

// --- COMMENT COMPONENT ---
interface CommentProps {
  comment: CommentType;
  depth: number;
  onReply: (commentId: string, replyContent: string) => void;
}

const Comment: React.FC<CommentProps> = ({ comment, depth, onReply }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showReply, setShowReply] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [votes, setVotes] = useState(comment.votes);

  const handleVote = (amount: number) => {
    setVotes(prev => prev + amount);
  };

  const handleReplySubmit = () => {
    if (replyContent.trim()) {
      onReply(comment.id, replyContent);
      setReplyContent('');
      setShowReply(false);
    }
  };

  const hasReplies = comment.replies && comment.replies.length > 0;
  const borderClass = depth > 0 ? cn('pl-4', depthColors[(depth - 1) % depthColors.length]) : '';

  return (
    <div className={cn('flex flex-col', depth > 0 && 'ml-4 mt-2 border-l-2', borderClass)}>
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0 w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center text-white font-bold">
          {comment.author.charAt(0)}
        </div>
        <div className="flex-1">
          <div className="flex items-center space-x-2 text-sm">
            <span className="font-bold text-gray-100">{comment.author}</span>
            <span className="text-gray-400">·</span>
            <span className="text-gray-400">{comment.timestamp}</span>
          </div>
          <p className="mt-1 text-gray-300">{comment.content}</p>
          <div className="flex items-center space-x-4 mt-2 text-sm text-gray-400">
            <div className="flex items-center space-x-1">
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleVote(1)}>
                <ArrowUp className="h-4 w-4" />
              </Button>
              <span className="font-medium w-4 text-center">{votes}</span>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleVote(-1)}>
                <ArrowDown className="h-4 w-4" />
              </Button>
            </div>
            {depth < 3 && (
              <Button variant="ghost" size="sm" className="p-1 h-auto" onClick={() => setShowReply(!showReply)}>
                <CornerDownRight className="h-4 w-4 mr-1" />
                Reply
              </Button>
            )}
            {hasReplies && (
              <Button variant="ghost" size="sm" className="p-1 h-auto" onClick={() => setIsCollapsed(!isCollapsed)}>
                {isCollapsed ? <ChevronRight className="h-4 w-4 mr-1" /> : <ChevronDown className="h-4 w-4 mr-1" />}
                {isCollapsed ? `Show ${comment.replies.length} replies` : 'Hide'}
              </Button>
            )}
          </div>
        </div>
      </div>

      {showReply && depth < 3 && (
        <div className="mt-2 ml-11">
          <Textarea
            placeholder={`Replying to ${comment.author}...`}
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            className="bg-gray-800 border-gray-600 text-white"
          />
          <div className="flex justify-end space-x-2 mt-2">
            <Button variant="ghost" size="sm" onClick={() => setShowReply(false)}>Cancel</Button>
            <Button size="sm" onClick={handleReplySubmit}>Submit Reply</Button>
          </div>
        </div>
      )}

      {!isCollapsed && hasReplies && (
        <div className="mt-2">
          {comment.replies.map(reply => (
            <Comment key={reply.id} comment={reply} depth={depth + 1} onReply={onReply} />
          ))}
        </div>
      )}
    </div>
  );
};

// --- MAIN COMPONENT ---
export default function ThreadedDiscussion() {
  const [comments, setComments] = useState<CommentType[]>(initialComments);

  const addReply = (parentId: string, content: string) => {
    const newReply: CommentType = {
      id: `${parentId}.${Date.now()}`,
      author: 'CurrentUser',
      avatar: 'U',
      timestamp: 'Just now',
      content,
      votes: 0,
      replies: [],
    };

    const addReplyToComment = (commentsList: CommentType[]): CommentType[] => {
      return commentsList.map(comment => {
        if (comment.id === parentId) {
          return { ...comment, replies: [newReply, ...comment.replies] };
        }
        if (comment.replies.length > 0) {
          return { ...comment, replies: addReplyToComment(comment.replies) };
        }
        return comment;
      });
    };

    setComments(addReplyToComment(comments));
  };

  return (
    <div className="bg-gray-900 text-white p-6 rounded-lg max-w-4xl mx-auto font-sans">
      <h2 className="text-xl font-bold mb-4 flex items-center">
        <MessageSquare className="h-6 w-6 mr-2" />
        Discussion ( {useMemo(() => {
            let count = 0;
            const countComments = (list: CommentType[]) => {
                list.forEach(c => {
                    count++;
                    if(c.replies) countComments(c.replies);
                })
            }
            countComments(comments);
            return count;
        }, [comments])} )
      </h2>
      <div className="space-y-6">
        {comments.map(comment => (
          <Comment key={comment.id} comment={comment} depth={0} onReply={addReply} />
        ))}
      </div>
    </div>
  );
}
