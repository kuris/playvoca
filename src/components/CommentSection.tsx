import React, { useState } from 'react';
import { Comment } from '../types';
import { MessageCircle, Send, Trash2, Lightbulb, Loader2 } from 'lucide-react';
import { Word } from '../types';

interface CommentSectionProps {
  wordId: number;
  word: Word;
  comments: Comment[];
  onAddComment: (wordId: number, content: string, author: string) => Promise<boolean>;
  onDeleteComment: (commentId: number) => Promise<boolean>;
  loading?: boolean;
  refetchComments?: () => void;
}

export const CommentSection: React.FC<CommentSectionProps> = ({
  wordId,
  word,
  comments,
  onAddComment,
  onDeleteComment,
  loading = false,
  refetchComments
}) => {
  // **을 bold로 변환하는 간단한 렌더러
  const renderContent = (content: string) => {
    return content.split('**').map((part, index) =>
      index % 2 === 1 ? <strong key={index} className="font-bold text-gray-900">{part}</strong> : part
    );
  };

  // 단어가 바뀔 때마다 댓글 새로고침
  React.useEffect(() => {
    if (refetchComments) {
      refetchComments();
    }
  }, [wordId, refetchComments]);
  const [newComment, setNewComment] = useState('');
  const [authorName, setAuthorName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newComment.trim()) {
      setIsSubmitting(true);
      const success = await onAddComment(wordId, newComment.trim(), authorName.trim() || '익명');
      if (success) {
        setNewComment('');
        setAuthorName('');
      }
      setIsSubmitting(false);
    }
  };
  const handleDelete = async (commentId: number) => {
    await onDeleteComment(commentId);
  };

  const wordComments = comments.filter(comment => comment.wordId === wordId);

  // AI 도우미 댓글과 일반 댓글 분리
  const aiComments = [...wordComments].filter(c => c.author.includes('AI 도우미')).reverse();
  const userComments = [...wordComments].filter(c => !c.author.includes('AI 도우미'));

  return (
    <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 shadow-inner">
      <div className="flex items-center gap-2 mb-6">
        <Lightbulb className="text-yellow-500" size={24} />
        <h3 className="text-xl font-bold text-gray-800">💡 연상고리 & 기억법</h3>
        {loading && <Loader2 className="animate-spin text-purple-500" size={20} />}
      </div>

      {/* AI 도우미 댓글 먼저 렌더링 */}
      {aiComments.length > 0 && (
        <div className="space-y-4 mb-6">
          {aiComments.map((comment) => (
            <div
              key={comment.id}
              className={`bg-white rounded-xl p-4 shadow-sm border hover:shadow-md transition-shadow relative group border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50`}
            >
              <div className="flex justify-between items-start mb-2">
                <span className="text-sm font-medium flex items-center gap-1 text-emerald-600">
                  <Sparkles size={14} />
                  <span>{comment.author}</span>
                </span>
                <button
                  onClick={() => handleDelete(comment.id)}
                  className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all p-1 rounded"
                  title="댓글 삭제"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <p className="text-gray-700 leading-relaxed mb-2">{renderContent(comment.content)}</p>
              <span className="text-xs text-gray-400">
                {comment.createdAt.toLocaleDateString('ko-KR')} {comment.createdAt.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mb-6">
        <div className="flex gap-3 mb-3">
          <input
            type="text"
            placeholder="닉네임 (선택사항)"
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            className="flex-1 px-4 py-2 rounded-lg border border-gray-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-100 outline-none transition-all"
            maxLength={20}
          />
        </div>
        <div className="flex gap-3">
          <textarea
            placeholder="이 단어를 기억하는 나만의 방법을 공유해보세요! 🎯"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="flex-1 px-4 py-3 rounded-lg border border-gray-200 focus:border-purple-400 focus:ring-2 focus:ring-purple-100 outline-none resize-none transition-all"
            rows={3}
            maxLength={500}
          />
          <button
            type="submit"
            disabled={!newComment.trim() || isSubmitting}
            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2 min-w-[80px]"
          >
            {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
          </button>
        </div>
      </form>

      <div className="space-y-4">
        {wordComments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <MessageCircle size={48} className="mx-auto mb-3 text-gray-300" />
            <p>{loading ? '연상고리를 불러오는 중...' : '아직 연상고리가 없어요.'}</p>
            <p className="text-sm">첫 번째 기억법을 공유하거나 AI 생성을 시도해보세요! ✨</p>
          </div>
        ) : (
          [...userComments].reverse().map((comment) => (
            <div
              key={comment.id}
              className={`bg-white rounded-xl p-4 shadow-sm border hover:shadow-md transition-shadow relative group border-gray-100`}
            >
              <div className="flex justify-between items-start mb-2">
                <span className="text-sm font-medium flex items-center gap-1 text-purple-600">
                  <span>{comment.author}</span>
                </span>
                <button
                  onClick={() => handleDelete(comment.id)}
                  className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all p-1 rounded"
                  title="댓글 삭제"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <p className="text-gray-700 leading-relaxed mb-2">{renderContent(comment.content)}</p>
              <span className="text-xs text-gray-400">
                {comment.createdAt.toLocaleDateString('ko-KR')} {comment.createdAt.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};