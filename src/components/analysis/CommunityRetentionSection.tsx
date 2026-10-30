'use client';

import React, { useState } from 'react';
import {
  MessageSquare,
  ThumbsUp,
  Plus,
  Trash2,
  Send,
  Sparkles,
  ShieldAlert,
  Vote,
  CheckCircle2,
} from 'lucide-react';
import {
  CommunityVoteTopic,
  CommunityCommentItem,
} from './types';
import {
  INITIAL_COMMUNITY_VOTES,
  INITIAL_COMMUNITY_COMMENTS,
} from '@/lib/mock-analysis-data';

interface CommunityRetentionSectionProps {
  apartmentName: string;
}

export default function CommunityRetentionSection({
  apartmentName,
}: CommunityRetentionSectionProps) {
  // ─── 상태 관리 ───
  const [votes, setVotes] = useState<CommunityVoteTopic[]>(INITIAL_COMMUNITY_VOTES);
  const [comments, setComments] = useState<CommunityCommentItem[]>(INITIAL_COMMUNITY_COMMENTS);

  // 관리자 모드 토글 (대표님 지침: 불필요한 투표/악성 댓글 관리자 삭제 기능)
  const [isAdminMode, setIsAdminMode] = useState(false);

  // 새 댓글 입력
  const [newCommentText, setNewCommentText] = useState('');
  const [newAuthorTag, setNewAuthorTag] = useState<'입주민' | '집주인' | '이웃'>('입주민');

  // 새 투표 생성 모달
  const [isCreateVoteOpen, setIsCreateVoteOpen] = useState(false);
  const [newVoteTitle, setNewVoteTitle] = useState('');
  const [newVoteOpt1, setNewVoteOpt1] = useState('');
  const [newVoteOpt2, setNewVoteOpt2] = useState('');

  // ─── 투표 핸들러 ───
  const handleVote = (voteId: string, optIndex: number) => {
    setVotes((prev) =>
      prev.map((v) => {
        if (v.id !== voteId || v.userVotedIndex !== undefined) return v;
        const newOptions = v.options.map((opt, idx) => {
          if (idx === optIndex) {
            return { ...opt, count: opt.count + 1 };
          }
          return opt;
        });
        const total = v.totalVotes + 1;
        const recalculated = newOptions.map((opt) => ({
          ...opt,
          percent: Math.round((opt.count / total) * 100),
        }));
        return {
          ...v,
          options: recalculated,
          totalVotes: total,
          userVotedIndex: optIndex,
        };
      })
    );
  };

  // ─── 새 투표 생성 핸들러 ───
  const handleCreateVote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVoteTitle.trim() || !newVoteOpt1.trim() || !newVoteOpt2.trim()) return;

    const newVote: CommunityVoteTopic = {
      id: `vote_${Date.now()}`,
      title: newVoteTitle.trim(),
      description: '단지 주민이 직접 발의한 실시간 투표입니다.',
      options: [
        { label: newVoteOpt1.trim(), count: 1, percent: 50 },
        { label: newVoteOpt2.trim(), count: 1, percent: 50 },
      ],
      totalVotes: 2,
    };

    setVotes([newVote, ...votes]);
    setNewVoteTitle('');
    setNewVoteOpt1('');
    setNewVoteOpt2('');
    setIsCreateVoteOpen(false);
  };

  // ─── 관리자 투표 삭제 ───
  const handleDeleteVote = (voteId: string) => {
    setVotes((prev) => prev.filter((v) => v.id !== voteId));
  };

  // ─── 댓글 등록 핸들러 ───
  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim()) return;

    const newComment: CommunityCommentItem = {
      id: `comment_${Date.now()}`,
      author: '다산이웃',
      authorTag: newAuthorTag,
      content: newCommentText.trim(),
      createdAt: '방금 전',
      likes: 0,
      isLiked: false,
    };

    setComments([newComment, ...comments]);
    setNewCommentText('');
  };

  // ─── 좋아요 핸들러 ───
  const handleLike = (commentId: string) => {
    setComments((prev) =>
      prev.map((c) => {
        if (c.id !== commentId) return c;
        const isLiked = !c.isLiked;
        return {
          ...c,
          isLiked,
          likes: isLiked ? c.likes + 1 : c.likes - 1,
        };
      })
    );
  };

  // ─── 관리자 댓글 삭제 ───
  const handleDeleteComment = (commentId: string) => {
    setComments((prev) => prev.filter((c) => c.id !== commentId));
  };

  return (
    <div className="space-y-5">
      {/* ── 상단 커뮤니티 헤더 & 관리자 모드 토글 ── */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-[17px] font-extrabold text-text-primary tracking-tight flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-brand" />
            {apartmentName} 주민 이야기 & 투표
          </h2>
          <p className="text-[12px] text-text-tertiary mt-1">
            거주 후기, 시세 전망, 층간소음 체감을 공유하는 단지 톡
          </p>
        </div>

        {/* 관리자 모드 시뮬레이션 버튼 (대표님 지침 반영) */}
        <button
          type="button"
          onClick={() => setIsAdminMode(!isAdminMode)}
          className={`px-3 py-1 rounded-full text-[12px] font-bold border transition-all ${
            isAdminMode
              ? 'bg-red-500 text-white border-red-500 shadow-2xs'
              : 'bg-surface-subtle text-text-tertiary border-border-default'
          }`}
        >
          {isAdminMode ? '관리자 삭제 켜짐' : '관리자 모드'}
        </button>
      </div>

      {/* ── 1. 단지 핫 이슈 투표 위젯 (실시간 참여 & 결과 그래프) ── */}
      <section className="bg-surface-card rounded-2xl p-5 border border-border-default shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-extrabold text-[15px] text-text-primary">
            <Vote className="w-4 h-4 text-brand" />
            단지 핫 이슈 투표
          </div>
          <button
            type="button"
            onClick={() => setIsCreateVoteOpen(true)}
            className="h-7 px-3 rounded-full bg-brand-light text-brand-hover text-[12px] font-bold flex items-center gap-1 hover:bg-brand hover:text-white transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            새 투표 만들기
          </button>
        </div>

        {/* 투표 생성 모달 폼 */}
        {isCreateVoteOpen && (
          <form
            onSubmit={handleCreateVote}
            className="p-4 rounded-xl bg-surface-subtle border border-brand-line space-y-3 animate-fade-in"
          >
            <div className="text-[13px] font-extrabold text-text-primary">
              새로운 주민 투표 발의하기
            </div>
            <input
              type="text"
              required
              value={newVoteTitle}
              onChange={(e) => setNewVoteTitle(e.target.value)}
              placeholder="투표 질문 (예: 단지 내 헬스장 기구 만족도 어떤가요?)"
              className="w-full h-10 px-3 rounded-lg bg-surface-card border border-border-default text-[13px] font-bold text-text-primary focus:outline-none focus:border-brand"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                required
                value={newVoteOpt1}
                onChange={(e) => setNewVoteOpt1(e.target.value)}
                placeholder="선택지 1 (예: 만족해요)"
                className="h-9 px-3 rounded-lg bg-surface-card border border-border-default text-[12px] font-medium"
              />
              <input
                type="text"
                required
                value={newVoteOpt2}
                onChange={(e) => setNewVoteOpt2(e.target.value)}
                placeholder="선택지 2 (예: 아쉬워요)"
                className="h-9 px-3 rounded-lg bg-surface-card border border-border-default text-[12px] font-medium"
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsCreateVoteOpen(false)}
                className="px-3 py-2 text-[12px] font-bold text-text-tertiary"
              >
                취소
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-brand text-white text-[12px] font-extrabold shadow-xs"
              >
                투표 등록
              </button>
            </div>
          </form>
        )}

        {/* 투표 리스트 */}
        <div className="space-y-4">
          {votes.map((vote) => (
            <div key={vote.id} className="p-4 rounded-xl bg-surface-subtle border border-border-default space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-extrabold text-[15px] text-text-primary leading-snug">
                    {vote.title}
                  </div>
                  {vote.description && (
                    <div className="text-[12px] text-text-tertiary mt-1">
                      {vote.description} · 총 {vote.totalVotes}명 참여
                    </div>
                  )}
                </div>
                {isAdminMode && (
                  <button
                    type="button"
                    onClick={() => handleDeleteVote(vote.id)}
                    className="p-1 text-red-500 hover:bg-red-500/10 rounded"
                    title="관리자 삭제"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* 선택지 옵션 */}
              <div className="space-y-2 pt-1">
                {vote.options.map((opt, idx) => {
                  const isUserPicked = vote.userVotedIndex === idx;
                  const isVoted = vote.userVotedIndex !== undefined;

                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={isVoted}
                      onClick={() => handleVote(vote.id, idx)}
                      className={`w-full py-3 px-3 rounded-xl border text-left text-[12px] font-bold relative overflow-hidden transition-all ${
                        isUserPicked
                          ? 'border-brand bg-brand-subtle text-brand'
                          : 'border-border-default bg-surface-card text-text-secondary hover:border-brand-line-strong'
                      }`}
                    >
                      {/* 퍼센트 게이지 바 */}
                      {isVoted && (
                        <div
                          style={{ width: `${opt.percent}%` }}
                          className={`absolute top-0 left-0 bottom-0 pointer-events-none transition-all duration-500 ${
                            isUserPicked ? 'bg-brand-line' : 'bg-surface-subtle'
                          }`}
                        />
                      )}
                      <div className="relative z-10 flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          {isUserPicked && <CheckCircle2 className="w-3.5 h-3.5 text-brand" />}
                          {opt.label}
                        </span>
                        {isVoted && (
                          <span className="font-extrabold text-brand tabular-nums">
                            {opt.percent}% ({opt.count}표)
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 2. 단지 한마디 톡 피드 (호갱노노 이야기 22103.png 레퍼런스) ── */}
      <section className="bg-surface-card rounded-2xl p-5 border border-border-default shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-[15px] font-extrabold text-text-primary flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-brand" />
            단지 주민 한마디 ({comments.length})
          </div>
          <span className="text-[12px] font-bold text-text-tertiary">
            최신순 정렬
          </span>
        </div>

        {/* 댓글 작성 폼 */}
        <form onSubmit={handleAddComment} className="space-y-2">
          <div className="flex gap-2">
            {(['입주민', '집주인', '이웃'] as const).map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setNewAuthorTag(tag)}
                className={`px-3 py-1 rounded-full text-[12px] font-bold border transition-all ${
                  newAuthorTag === tag
                    ? 'bg-brand text-white border-brand'
                    : 'bg-surface-subtle text-text-tertiary border-border-default'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
              placeholder="단지에 대한 솔직한 생각이나 질문을 남겨보세요"
              className="flex-1 h-11 px-4 rounded-xl bg-surface-subtle border border-border-default text-[13px] font-medium text-text-primary focus:outline-none focus:border-brand"
            />
            <button
              type="submit"
              className="h-11 px-4 rounded-xl bg-brand text-white font-extrabold text-[13px] flex items-center gap-1 shadow-xs active:scale-95 transition-all"
            >
              <span>등록</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>

        {/* 댓글 목록 */}
        <div className="divide-y divide-border-light pt-1">
          {comments.map((c) => (
            <div key={c.id} className="py-4 space-y-2">
              <div className="flex items-center justify-between text-[12px]">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-text-primary">{c.author}</span>
                  <span className="px-2 py-0.2 rounded bg-surface-subtle text-text-tertiary font-medium border border-border-light">
                    {c.authorTag}
                  </span>
                  <span className="text-text-disabled">· {c.createdAt}</span>
                </div>
                {isAdminMode && (
                  <button
                    type="button"
                    onClick={() => handleDeleteComment(c.id)}
                    className="p-1 text-red-500 hover:bg-red-500/10 rounded"
                    title="관리자 삭제"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <p className="text-[13px] font-medium text-text-secondary leading-relaxed">
                {c.content}
              </p>

              <div className="flex items-center gap-3 pt-1 text-[12px] text-text-tertiary">
                <button
                  type="button"
                  onClick={() => handleLike(c.id)}
                  className={`flex items-center gap-1 font-bold transition-colors ${
                    c.isLiked ? 'text-brand' : 'hover:text-text-primary'
                  }`}
                >
                  <ThumbsUp className={`w-3.5 h-3.5 ${c.isLiked ? 'fill-brand' : ''}`} />
                  <span>좋아요 {c.likes}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
