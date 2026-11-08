"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { MessageCircle, ThumbsDown, ThumbsUp, Trash2, X } from "lucide-react";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";
import type { DashboardNewsFeedItem } from "@/lib/localData/dashboardNewsFeed";
import NewsPhotoCredit from "./NewsPhotoCredit";
import styles from "./NewsDiscussion.module.css";

type Feedback = { article_id: string; likes: number; dislikes: number; comments: number; reaction: number };
type Comment = { id: string; body: string; created_at: string; is_own: boolean };
type Discussion = { feedback: Record<string, Feedback>; busy: string | null; message: { articleId: string; text: string } | null; react: (id: string, value: number) => Promise<void>; open: (article: DashboardNewsFeedItem, comments?: boolean) => void };
const Context = createContext<Discussion | null>(null);
function useDiscussion() { const value = useContext(Context); if (!value) throw new Error("News discussion provider missing"); return value; }

export function NewsArticleOpen({ article, children }: { article: DashboardNewsFeedItem; children: ReactNode }) {
  const { open } = useDiscussion();
  return <button className={styles.articleTitle} type="button" onClick={() => open(article)}>{children}</button>;
}
export function NewsArticleActions({ article }: { article: DashboardNewsFeedItem }) {
  const { feedback, busy, message, react, open } = useDiscussion();
  const value = feedback[article.id];
  return <div className={styles.actions}>
    <button type="button" aria-label={`Thumbs up: ${article.title}`} aria-pressed={value?.reaction === 1} disabled={busy !== null} onClick={() => void react(article.id, value?.reaction === 1 ? 0 : 1)}><ThumbsUp aria-hidden="true" />{value ? <span>{value.likes}</span> : null}</button>
    <button type="button" aria-label={`Thumbs down: ${article.title}`} aria-pressed={value?.reaction === -1} disabled={busy !== null} onClick={() => void react(article.id, value?.reaction === -1 ? 0 : -1)}><ThumbsDown aria-hidden="true" />{value ? <span>{value.dislikes}</span> : null}</button>
    <button type="button" aria-label={`Comments: ${article.title}`} onClick={() => open(article, true)}><MessageCircle aria-hidden="true" /><span>{value?.comments || "Comment"}</span></button>
    {message?.articleId === article.id ? <span role="status" className={styles.message}>{message.text}</span> : null}
  </div>;
}

export default function NewsDiscussion({ articles, children }: { articles: DashboardNewsFeedItem[]; children: ReactNode }) {
  const [feedback, setFeedback] = useState<Record<string, Feedback>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<Discussion["message"]>(null);
  const [reader, setReader] = useState<{ article: DashboardNewsFeedItem; comments: boolean } | null>(null);
  const generation = useRef(0);
  const invalidate = useCallback(() => { generation.current++; }, []);
  const idsKey = articles.map(article => article.id).join("\n");
  const refresh = useCallback(async (ids: string[]) => {
    const ticket = generation.current;
    const result = await supabase.rpc("member_news_feedback", { p_article_ids: ids });
    if (ticket !== generation.current || result.error) return;
    setFeedback(previous => ({ ...previous, ...Object.fromEntries(((result.data ?? []) as Feedback[]).map(value => [value.article_id, value])) }));
  }, []);
  useEffect(() => {
    let disposed = false;
    invalidate();
    queueMicrotask(() => { if (!disposed) { setFeedback({}); setMessage(null); void refresh(idsKey.split("\n")); } });
    const auth = supabase.auth.onAuthStateChange(event => {
      if (event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED") return;
      generation.current++; setFeedback({}); setReader(null); setMessage(null);
      queueMicrotask(() => void refresh(idsKey.split("\n")));
    });
    return () => { disposed = true; invalidate(); auth.data.subscription.unsubscribe(); };
  }, [idsKey, refresh, invalidate]);
  const react = async (id: string, value: number) => {
    if (busy) return;
    const ticket = generation.current;
    setBusy(id); setMessage(null);
    try {
      const result = await supabase.rpc("set_member_news_reaction", { p_article_id: id, p_reaction: value });
      if (ticket !== generation.current) return;
      if (result.error) throw new Error("Your reaction could not be saved. Please try again.");
      const saved = (result.data as Feedback[] | null)?.[0];
      if (saved) setFeedback(previous => ({ ...previous, [id]: saved }));
    } catch (error) { if (ticket === generation.current) setMessage({ articleId: id, text: error instanceof Error ? error.message : "Your reaction could not be saved." }); }
    finally { setBusy(null); }
  };
  return <Context.Provider value={{ feedback, busy, message, react, open: (article, comments = false) => setReader({ article, comments }) }}>
    {children}
    {reader ? <NewsReader key={reader.article.id} article={reader.article} showComments={reader.comments} close={() => setReader(null)} refresh={() => void refresh([reader.article.id])} /> : null}
  </Context.Provider>;
}

function NewsReader({ article, showComments, close, refresh }: { article: DashboardNewsFeedItem; showComments: boolean; close: () => void; refresh: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const commentsSection = useRef<HTMLElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const alive = useRef(true);
  const loadComments = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const result = await supabase.rpc("member_news_comments", { p_article_id: article.id });
      if (!alive.current) return;
      if (result.error) throw new Error("Comments could not be loaded. Please try again.");
      setComments(((result.data ?? []) as Comment[]).slice().reverse());
    } catch (cause) { if (alive.current) setError(cause instanceof Error ? cause.message : "Comments could not be loaded."); }
    finally { if (alive.current) setLoading(false); }
  }, [article.id]);
  useEffect(() => {
    let disposed = false;
    alive.current = true;
    const element = dialog.current;
    element?.showModal();
    queueMicrotask(() => { if (!disposed) void loadComments(); });
    return () => { disposed = true; alive.current = false; element?.close(); };
  }, [loadComments]);
  useEffect(() => { if (showComments && !loading) { commentsSection.current?.scrollIntoView({ block: "start" }); input.current?.focus({ preventScroll: true }); } }, [showComments, loading]);
  const send = async () => {
    if (!body.trim() || saving) return;
    setSaving(true); setError("");
    try {
      const result = await supabase.rpc("add_member_news_comment", { p_article_id: article.id, p_body: body.trim() });
      if (!alive.current) return;
      if (result.error) throw new Error(result.error.message.includes("Please wait") ? "Please wait a moment before posting another comment." : "Your comment could not be saved. Your text is still here to retry.");
      setBody(""); await loadComments(); refresh();
    } catch (cause) { if (alive.current) setError(cause instanceof Error ? cause.message : "Your comment could not be saved."); }
    finally { if (alive.current) setSaving(false); }
  };
  const remove = async (id: string) => {
    if (saving) return;
    setSaving(true); setError("");
    try {
      const result = await supabase.rpc("delete_member_news_comment", { p_id: id });
      if (!alive.current) return;
      if (result.error || !result.data) throw new Error("Your comment could not be removed. Please try again.");
      await loadComments(); refresh();
    } catch (cause) { if (alive.current) setError(cause instanceof Error ? cause.message : "Your comment could not be removed."); }
    finally { if (alive.current) setSaving(false); }
  };
  return createPortal(<dialog ref={dialog} className={styles.reader} aria-labelledby="news-reader-title" onClose={() => { if (!dialog.current?.open) close(); }} onClick={event => { if (event.target === event.currentTarget) close(); }} data-dashboard-wheel-lock="true">
    <div className={styles.readerScroll} data-dashboard-orbiter-local-scroll="true">
      <button type="button" className={styles.close} onClick={close} aria-label="Close article"><X /></button>
      <div className={styles.readerPhoto}>{article.image ? <Image src={article.image} alt={article.imageAlt || "Article photo"} fill sizes="(max-width: 760px) 100vw, 740px" className="object-cover" unoptimized={article.image.startsWith("https://")} /> : null}<NewsPhotoCredit credit={article.photoCredit} /></div>
      <div className={styles.readerBody}>
        <h2 id="news-reader-title">{article.title}</h2>
        <time dateTime={article.publishedAt}>{new Date(article.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</time>
        {(article.body || article.summary).split(/\n\s*\n/).map((paragraph, index) => <p key={index}>{paragraph}</p>)}
        {article.sourceUrl ? <a href={article.sourceUrl} target="_blank" rel="noopener noreferrer">Read source article · {article.source}</a> : null}
        <NewsArticleActions article={article} />
        <section ref={commentsSection} className={styles.comments} aria-label="Article comments">
          <h3>Comments</h3>
          {loading ? <p role="status">Loading comments…</p> : null}
          {!loading && !error && comments.length === 0 ? <p>Start the conversation.</p> : null}
          {comments.length === 50 ? <p>Latest 50 comments</p> : null}
          <ul>{comments.map(comment => <li key={comment.id}><div><strong>{comment.is_own ? "You" : "Member"}</strong><time dateTime={comment.created_at}>{new Date(comment.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</time>{comment.is_own ? <button type="button" disabled={saving} aria-label="Remove your comment" onClick={() => void remove(comment.id)}><Trash2 size={14} /></button> : null}</div><p>{comment.body}</p></li>)}</ul>
          <form onSubmit={event => { event.preventDefault(); void send(); }}>
            <label htmlFor="news-comment-body">Add a comment</label>
            <textarea ref={input} id="news-comment-body" value={body} maxLength={2000} rows={3} onChange={event => setBody(event.target.value)} placeholder="Share your thoughts…" />
            <button type="submit" disabled={saving || !body.trim()}>{saving ? "Saving…" : "Post comment"}</button>
          </form>
          {error ? <p role="status">{error} <button type="button" disabled={loading || saving} onClick={() => void loadComments()}>Retry</button></p> : null}
        </section>
      </div>
    </div>
  </dialog>, document.body);
}
