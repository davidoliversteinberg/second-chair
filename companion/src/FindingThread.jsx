import { useEffect, useRef, useState } from "react";
import {
  Button,
  Heading,
  Text,
  Textarea,
  Menu,
  MenuTrigger,
  MenuContent,
} from "@optiaxiom/react";
import {
  IconArrowLeft,
  IconArrowUpRightFromSquare,
  IconPause,
} from "@optiaxiom/icons";
import {
  needsYou,
  threadStatus,
  threadStatusLabels,
} from "../server/finding-state.mjs";
import { reportDate } from "./inbox.mjs";

function EvidenceLink({ source, open }) {
  return source?.url ? (
    <Button
      appearance="subtle"
      size="sm"
      className="thread-evidence"
      icon={<IconArrowUpRightFromSquare size={14} />}
      iconPosition="end"
      onClick={() => open(source.url)}
    >
      {source.label}
    </Button>
  ) : source?.label ? (
    <span className="thread-evidence">{source.label}</span>
  ) : null;
}

export function FindingThread({
  alert,
  data,
  action,
  back,
  open,
  draft,
  setDraft,
}) {
  const status = threadStatus(alert);
  const actionable = needsYou(alert);
  const chat = data.chats.find((c) => c.findingKey === alert.key);
  const [sending, setSending] = useState(false);
  const end = useRef(null);
  const follow = useRef(false);
  const reported = alert.thread?.events || [];
  const events = [
    ...reported.map((e) => ({
      ...e,
      category: "source",
      caption: e.actor === "self" ? "Your reply · Reported" : "From source",
    })),
    ...(alert.notes || []).map((e) => ({
      ...e,
      author: "You",
      category: "private",
      caption: e.kind === "status" ? "Local status" : "Private note",
    })),
    ...(chat?.messages || []).map((e, i) => ({
      ...e,
      id: `${chat.id}:${i}`,
      at: e.createdAt,
      author: e.role === "user" ? "You" : "Second Chair",
      category: "agent",
      caption:
        e.role === "user"
          ? "To Second Chair"
          : data.demo
            ? "Sample reply"
            : "Agent reply",
    })),
  ].sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  useEffect(() => {
    if (follow.current) end.current?.scrollIntoView({ block: "end" });
  }, [events.length, chat?.messages.at(-1)?.text]);
  async function send(kind) {
    if (!draft.trim() || sending) return;
    setSending(true);
    follow.current = true;
    try {
      const result = await action(
        kind === "note" ? "thread/note" : "chat",
        kind === "note"
          ? { key: alert.key, text: draft }
          : { findingKey: alert.key, text: draft },
      );
      if (result) setDraft("");
    } finally {
      setSending(false);
    }
  }
  return (
    <div className="finding-thread">
      <div className="thread-toolbar">
        <Button
          appearance="subtle"
          aria-label="Back to findings"
          icon={<IconArrowLeft />}
          onClick={back}
        >
          Thread
        </Button>
        <Menu
          options={[
            ...Object.entries(threadStatusLabels).map(([value, label]) => ({
              label,
              selected: status === value,
              execute: () =>
                action("thread/status", {
                  key: alert.key,
                  revision: alert.revision,
                  status: value,
                }),
            })),
            ...(actionable
              ? [
                  {
                    label: "Remind me in an hour",
                    execute: () =>
                      action("alert", { key: alert.key, action: "snooze" }),
                  },
                ]
              : []),
          ]}
        >
          <MenuTrigger
            aria-label={`Thread status: ${threadStatusLabels[status]}`}
          >
            {threadStatusLabels[status]}
          </MenuTrigger>
          <MenuContent />
        </Menu>
      </div>
      <div
        className="thread-scroll scroll"
        onScroll={(e) => {
          const el = e.currentTarget;
          follow.current =
            el.scrollHeight - el.scrollTop - el.clientHeight < 60;
        }}
      >
        <div className="thread-intro">
          <Text className="thread-project" color="fg.secondary">
            {alert.kind[0].toUpperCase() + alert.kind.slice(1)} ·{" "}
            {alert.project}
          </Text>
          <Heading level="3" asChild>
            <h2>{alert.title}</h2>
          </Heading>
          {(actionable || !reported.length) && (
            <Text color="fg.secondary">{alert.summary}</Text>
          )}
          {status === "waiting" && (
            <Text className="thread-status-note">
              No action for you right now.
            </Text>
          )}
          {status === "done" && (
            <Text className="thread-status-note">
              Closed here. History is kept.
            </Text>
          )}
          <EvidenceLink source={alert.source} open={open} />
          {actionable && (alert.action?.steps?.length || alert.nextStep) && (
            <div className="thread-next-step">
              <Heading level="4">Next step</Heading>
              {alert.action?.steps?.length ? (
                <ol>
                  {alert.action.steps.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ol>
              ) : (
                <Text>{alert.nextStep}</Text>
              )}
            </div>
          )}
          {actionable && alert.action?.url && (
            <Button
              appearance="primary"
              size="sm"
              icon={<IconArrowUpRightFromSquare />}
              iconPosition="end"
              onClick={() => open(alert.action.url)}
            >
              {alert.action.label}
            </Button>
          )}
        </div>
        <div className="thread-events" aria-label="Thread history">
          <Heading level="4">Conversation</Heading>
          {!events.length && (
            <Text color="fg.secondary" className="thread-empty">
              No replies have been reported yet. Keep a private note or ask
              Second Chair below.
            </Text>
          )}
          {events.map((e) => (
            <article
              className={`thread-event ${e.actor === "self" || e.author === "You" ? "from-you" : ""}`}
              key={`${e.category}:${e.id}`}
            >
              <div className="thread-event-meta">
                <strong>{e.author}</strong>
                <time dateTime={e.at}>{reportDate(e.at)}</time>
              </div>
              <span className="thread-caption">{e.caption}</span>
              <Text className="thread-message">{e.text || "Thinking…"}</Text>
              {e.source && <EvidenceLink source={e.source} open={open} />}
            </article>
          ))}
          {chat?.error && (
            <p className="error" role="alert">
              {chat.error}
            </p>
          )}
          <div ref={end} />
        </div>
      </div>
      <div className="thread-composer">
        <label htmlFor="thread-draft">Private · You and Second Chair</label>
        <Textarea
          id="thread-draft"
          aria-label="Thread message"
          rows={2}
          maxLength={4000}
          value={draft}
          placeholder="Add a note or ask about this thread…"
          onChange={(e) => setDraft(e.target.value)}
        />
        <div className="thread-compose-actions">
          <Button
            size="sm"
            disabled={!draft.trim() || sending}
            onClick={() => send("note")}
          >
            Save note
          </Button>
          {chat?.busy ? (
            <Button
              size="sm"
              icon={<IconPause />}
              onClick={() => action("chat/stop", { chatId: chat.id })}
            >
              Stop reply
            </Button>
          ) : (
            <Button
              size="sm"
              appearance="primary"
              disabled={
                !draft.trim() ||
                sending ||
                data.agent === "unconfigured" ||
                data.chats.some((c) => c.busy)
              }
              onClick={() => send("agent")}
            >
              Ask Second Chair
            </Button>
          )}
        </div>
        <span className="thread-caption">
          {data.demo
            ? "Sample replies · No AI calls"
            : data.agent === "unconfigured"
              ? "Sign in to Claude to ask your agent. Notes stay available."
              : "Questions use your Claude connection."}{" "}
          Nothing is posted to teammates.
        </span>
      </div>
    </div>
  );
}
