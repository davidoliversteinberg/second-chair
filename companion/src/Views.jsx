import { useEffect, useRef, useState } from "react";
import { BrandMark } from "./BrandMark.jsx";
import {
  Button,
  Heading,
  Text,
  Input,
  Tooltip,
  SegmentedControl,
  SegmentedControlItem,
  Switch,
  Select,
  SelectTrigger,
  SelectContent,
} from "@optiaxiom/react";
import {
  IconClockRotateLeft,
  IconArrowUp,
  IconPaperclip,
  IconPause,
  IconPlay,
  IconArrowLeft,
  IconArrowUpRightFromSquare,
  IconCheck,
  IconCircleCheck,
  IconXmark,
  IconCircle,
  IconFileLines,
  IconPlus,
  IconChevronRight,
  IconCircleExclamation,
} from "@optiaxiom/icons";
import { time } from "./App.jsx";
const label = (a) =>
  a.priority === "urgent"
    ? "Needs your attention"
    : a.priority === "attention"
      ? "Worth a look"
      : "For later";
function Title({ title, back }) {
  return (
    <div className="section-title">
      <Button
        appearance="subtle"
        aria-label="Back"
        icon={<IconArrowLeft />}
        onClick={back}
      />
      <Heading level="3" asChild>
        <h2>{title}</h2>
      </Heading>
    </div>
  );
}
function Source({ source, open }) {
  return source.url ? (
    <Button
      className="source-link"
      appearance="subtle"
      icon={<IconArrowUpRightFromSquare size={16} />}
      iconPosition="end"
      onClick={() => open(source.url)}
    >
      {source.label}
    </Button>
  ) : (
    <span>{source.label}</span>
  );
}
export function Chat({
  data,
  action,
  setView,
  chatId,
  setChatId,
  draft,
  setDraft,
  attachment,
  setAttachment,
  setError,
  settings,
  select,
}) {
  const chat = data.chats.find((c) => c.id === chatId),
    end = useRef(null),
    fileInput = useRef(null);
  useEffect(() => {
    end.current?.scrollIntoView({ block: "end", behavior: "instant" });
  }, [chat?.messages.length, chat?.messages.at(-1)?.text]);
  async function send(event) {
    event.preventDefault();
    if (!draft.trim()) return;
    const result = await action("chat", {
      text: draft,
      ...(chatId ? { chatId } : {}),
      ...(attachment ? { attachment } : {}),
    });
    if (result) {
      setChatId(result.chatId);
      setDraft("");
      setAttachment(null);
    }
  }
  async function attach(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (!/\.(md|txt)$/i.test(file.name) || file.size > 30000) {
      setError("Choose a Markdown or text file under 30 KB.");
      return;
    }
    setAttachment({ name: file.name, text: await file.text() });
    event.target.value = "";
  }
  const status = data.demo
    ? "Sample agent · No AI calls"
    : data.agent === "ready"
      ? "Claude · Configured"
      : "Claude · Not connected";
  return (
    <>
      <div className="chat-heading">
        <Heading level="4" asChild>
          <h2>{chat?.title || "A little space to think"}</h2>
        </Heading>
        <Tooltip content="Recent chats">
          <Button
            aria-label="Recent chats"
            appearance="subtle"
            icon={<IconClockRotateLeft />}
            onClick={() => setView("history")}
          />
        </Tooltip>
      </div>
      <div className="messages scroll" aria-live="polite">
        {!chat?.messages.length && (
          <div className="chat-empty">
            <div className="avatar">
              <BrandMark size={28} />
            </div>
            <Heading level="2">What’s on your mind?</Heading>
            <Text color="fg.secondary">
              Talk through a decision, prepare for a review, or make sense of
              what changed.
            </Text>
            {["What needs my attention?", "Help me prepare for tomorrow"].map(
              (t) => (
                <Button
                  key={t}
                  appearance="subtle"
                  icon={<IconArrowUpRightFromSquare />}
                  iconPosition="end"
                  onClick={() => setDraft(t)}
                >
                  {t}
                </Button>
              ),
            )}
            {data.agent === "unconfigured" && (
              <Button
                onClick={settings}
                icon={<IconChevronRight />}
                iconPosition="end"
              >
                Connect Claude
              </Button>
            )}
          </div>
        )}
        {chat?.messages.map((m, i) => (
          <div key={i} className={`message ${m.role}`}>
            {m.role === "assistant" && (
              <div className="avatar">
                <BrandMark size={26} />
              </div>
            )}
            <div className="message-body">
              <div className="bubble">
                <Text className="message-text" fontSize="lg">
                  {m.text || "Thinking…"}
                </Text>
                {m.attachment && (
                  <span className="attached">
                    <IconFileLines />
                    {m.attachment.name}
                  </span>
                )}
                {m.artifact && (
                  <Button
                    className="artifact"
                    icon={<IconFileLines filled />}
                    onClick={() =>
                      select(data.alerts.find((a) => a.id === "design-review"))
                    }
                  >
                    Design review prep
                  </Button>
                )}
              </div>
              <div className="message-time">
                {m.source || time(m.createdAt)}
              </div>
            </div>
          </div>
        ))}
        {chat?.error && (
          <p className="error" role="alert">
            {chat.error}
          </p>
        )}
        <div ref={end} />
      </div>
      <div className="compose-area">
        {attachment && (
          <div className="attachment-preview">
            <IconFileLines />
            {attachment.name}
            <Button
              appearance="subtle"
              aria-label="Remove attachment"
              icon={<IconXmark />}
              onClick={() => setAttachment(null)}
            />
          </div>
        )}
        <form className="composer" onSubmit={send}>
          <Input
            size="xl"
            aria-label="Message Second Chair"
            placeholder="Ask Second Chair…"
            maxLength={12000}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            addonPointerEvents="auto"
            addonAfter={
              <div className="compose-actions">
                <Tooltip content="Attach a text file">
                  <Button
                    appearance="subtle"
                    type="button"
                    aria-label="Attach a text file"
                    icon={<IconPaperclip />}
                    onClick={() => fileInput.current.click()}
                  />
                </Tooltip>
                <Button
                  appearance="primary"
                  type="submit"
                  aria-label="Send message"
                  icon={<IconArrowUp />}
                  disabled={!draft.trim() || chat?.busy}
                />
              </div>
            }
          />
          {/* Native file selection is not a text field; the visible trigger uses Axiom. */}
          <input
            ref={fileInput}
            type="file"
            accept=".txt,.md"
            hidden
            onChange={attach}
          />
        </form>
        <div className="agent-line">
          <Button
            className="agent-status"
            appearance="subtle"
            icon={
              <IconCircle
                filled
                size={8}
                className={data.agent === "unconfigured" ? "neutral" : "green"}
              />
            }
            onClick={settings}
          >
            {chat?.busy ? "Claude is thinking…" : status}
          </Button>
          {chat?.busy ? (
            <Tooltip content="Stop reply">
              <Button
                aria-label="Stop reply"
                icon={<IconXmark />}
                onClick={() => action("chat/stop", { chatId })}
              />
            </Tooltip>
          ) : (
            <Tooltip
              content={
                data.settings.paused ? "Resume watching" : "Pause watching"
              }
            >
              <Button
                aria-label={
                  data.settings.paused ? "Resume watching" : "Pause watching"
                }
                icon={data.settings.paused ? <IconPlay /> : <IconPause />}
                onClick={() =>
                  action("settings", { paused: !data.settings.paused })
                }
              />
            </Tooltip>
          )}
        </div>
      </div>
    </>
  );
}
export function Inbox({ data, active, action, issue, setView, select, open }) {
  const [filter, setFilter] = useState("active");
  return (
    <div className="content scroll">
      <div className="inbox-heading">
        <div className="eyebrow">A LITTLE CLARITY</div>
        <Heading level="2">
          {active.length
            ? `${active.length} ${active.length === 1 ? "thing" : "things"} to keep close.`
            : "Room to focus."}
        </Heading>
      </div>
      <Text className="intro" color="fg.secondary">
        {active.length
          ? "The meaningful changes. A small next step for each."
          : "New findings will appear here when a report arrives."}
      </Text>
      <SegmentedControl
        className="filters"
        aria-label="Findings filter"
        value={filter}
        onValueChange={(v) => v && setFilter(v)}
      >
        <SegmentedControlItem value="active">
          On your radar
        </SegmentedControlItem>
        <SegmentedControlItem value="all">All findings</SegmentedControlItem>
      </SegmentedControl>
      {(filter === "all" ? data.alerts : active).map((a) => (
        <article className="finding" key={a.key}>
          <div className="finding-meta">
            <span className={`priority ${a.priority}`}>{label(a)}</span>
            <span>{a.state === "new" ? a.kind : a.state}</span>
          </div>
          <Heading level="4" asChild>
            <h3>
              <Button
                appearance="subtle"
                className="finding-title"
                icon={<IconChevronRight />}
                iconPosition="end"
                onClick={() => select(a)}
              >
                {a.title}
              </Button>
            </h3>
          </Heading>
          <Text color="fg.secondary">{a.summary}</Text>
          <div className="finding-source">
            <Source source={a.source} open={open} />
          </div>
          <div className="finding-bottom">
            <span>{a.project}</span>
            <Button
              appearance="subtle"
              size="sm"
              icon={<IconCheck filled />}
              onClick={() =>
                action("alert", {
                  key: a.key,
                  action: a.state === "resolved" ? "reopen" : "acknowledge",
                })
              }
              disabled={a.state === "acknowledged"}
            >
              {a.state === "acknowledged"
                ? "Seen"
                : a.state === "resolved"
                  ? "Reopen"
                  : "Got it"}
            </Button>
            <Tooltip content="Remind me in an hour">
              <Button
                appearance="subtle"
                aria-label={`Snooze ${a.title}`}
                icon={<IconClockRotateLeft />}
                onClick={() =>
                  action("alert", { key: a.key, action: "snooze" })
                }
              />
            </Tooltip>
          </div>
        </article>
      ))}
      {issue && (
        <Button
          className="health-warning"
          appearance="subtle"
          icon={<IconCircleExclamation filled />}
          onClick={() => setView("health")}
        >
          Some sources need a look
        </Button>
      )}
    </div>
  );
}
export function Detail({ alert, action, back, open, discuss }) {
  async function act(value) {
    if (await action("alert", { key: alert.key, action: value })) back();
  }
  return (
    <div className="content scroll">
      <Title title="On your radar" back={back} />
      <div className="detail">
        <span className={`priority ${alert.priority}`}>{label(alert)}</span>
        <Heading level="2">{alert.title}</Heading>
        <Text>{alert.summary}</Text>
        <div className="evidence">
          <span>
            {alert.kind} · {alert.project}
          </span>
          <Source source={alert.source} open={open} />
        </div>
        <Heading level="4" asChild>
          <h3>Why it matters</h3>
        </Heading>
        <Text>{alert.why}</Text>
        <Heading level="4" asChild>
          <h3>A small next step</h3>
        </Heading>
        <Text>{alert.nextStep}</Text>
        <Button
          className="discuss"
          appearance="primary"
          icon={<IconArrowUpRightFromSquare />}
          iconPosition="end"
          onClick={discuss}
        >
          Talk it through
        </Button>
        <div className="alert-actions">
          <Button
            icon={<IconClockRotateLeft filled />}
            onClick={() => act("snooze")}
          >
            In an hour
          </Button>
          <Button
            icon={<IconCircleCheck filled />}
            onClick={() => act("resolve")}
          >
            Resolve
          </Button>
        </div>
      </div>
    </div>
  );
}
export function Settings({ data, action, setView }) {
  return (
    <div className="content scroll">
      <Title title="Make room for focus" back={() => setView("main")} />
      <Text color="fg.secondary">A quiet companion, on your terms.</Text>
      <div className="setting-row">
        <Switch
          description="Delivered by the menu-bar app. Browser mode keeps the inbox up to date."
          checked={data.settings.notifications}
          onCheckedChange={(v) => action("settings", { notifications: v })}
        >
          Desktop notifications
        </Switch>
      </div>
      <div className="setting-row">
        <Switch
          description="Off keeps the content out of your lock screen."
          checked={data.settings.showPreview}
          onCheckedChange={(v) => action("settings", { showPreview: v })}
        >
          Show a title in notifications
        </Switch>
      </div>
      <div className="setting-row">
        <Heading level="4" asChild>
          <h3>Quiet hours</h3>
        </Heading>
        <Text color="fg.secondary">
          Local time. Pending alerts arrive as one batch afterward.
        </Text>
      </div>
      <div className="hours">
        {[
          ["quietStart", "From"],
          ["quietEnd", "Until"],
        ].map(([key, name]) => (
          <div key={key}>
            <span id={`${key}-label`}>{name}</span>
            <Select
              value={String(data.settings[key])}
              onValueChange={(v) => action("settings", { [key]: Number(v) })}
              options={Array.from({ length: 24 }, (_, h) => ({
                value: String(h),
                label: `${String(h).padStart(2, "0")}:00`,
              }))}
            >
              <SelectTrigger aria-labelledby={`${key}-label`} />
              <SelectContent />
            </Select>
          </div>
        ))}
      </div>
      <Text color="fg.secondary">
        Choose the same start and end to disable quiet hours.
      </Text>
      <div className="config-box">
        <div className="eyebrow">YOUR CLAUDE CONNECTION</div>
        <Heading level="3">
          {data.demo
            ? "A safe place to explore"
            : data.agent === "ready"
              ? "Ready for your first question"
              : "Connect when you’re ready"}
        </Heading>
        <Text>
          {data.demo
            ? "Sample replies are clearly labeled. No model or company account is used."
            : "Start the app with ANTHROPIC_API_KEY to enable chat. Selected reports and attached text are sent to Anthropic when you ask a question."}
        </Text>
        <Text>
          These are Second Chair’s own conversations. Existing Claude and Cowork
          chats are not imported.
        </Text>
      </div>
    </div>
  );
}
export function Health({ data, action, setView }) {
  const sources = Object.entries(data.sources);
  return (
    <div className="content scroll">
      <Title title="What I can see" back={() => setView("main")} />
      <Text color="fg.secondary">
        A folder check is different from a fresh source scan.
      </Text>
      <div className="config-box">
        <Heading level="4" asChild>
          <h3>Report folder</h3>
        </Heading>
        <code>{data.inbox}</code>
        <Text color="fg.secondary">
          Checked {time(data.lastPoll)} · every 30 seconds while running
        </Text>
        <Button
          icon={<IconClockRotateLeft filled />}
          onClick={() => action("check", {})}
        >
          Check folder now
        </Button>
      </div>
      {data.problems.map((p) => (
        <p className="error" key={p}>
          {p}
        </p>
      ))}
      {!sources.length && (
        <Text>
          No producer has written a report yet. Use the companion command in
          your Second Chair workspace to connect this folder.
        </Text>
      )}
      {sources.map(([name, s]) => (
        <div className="source-row" key={name}>
          <div>
            <Heading level="4" asChild>
              <h3>{name}</h3>
            </Heading>
            <span className="source-status">
              {s.status === "ok" ? "Report received" : s.status} ·{" "}
              {new Date(s.checkedAt).toLocaleString()}
            </span>
            <Text>{s.coverage}</Text>
            {Date.now() - Date.parse(s.checkedAt) > 86400000 && (
              <span className="warning">
                This report is more than a day old.
              </span>
            )}
          </div>
          {s.status === "ok" ? <IconCircleCheck /> : <IconCircleExclamation />}
        </div>
      ))}
      <Text className="health-note" color="fg.secondary">
        The companion watches reports. It does not independently connect to
        Teams, mail, or calendars.
      </Text>
    </div>
  );
}
export function History({ data, setView, openChat, newChat }) {
  return (
    <div className="content scroll">
      <Title title="Recent chats" back={() => setView("main")} />
      <Button className="new-chat" icon={<IconPlus filled />} onClick={newChat}>
        Start a conversation
      </Button>
      {!data.chats.length && (
        <Text color="fg.secondary">Your conversations will appear here.</Text>
      )}
      {data.chats.map((c) => (
        <div className="history-row" key={c.id}>
          <Button
            appearance="subtle"
            icon={<IconChevronRight />}
            iconPosition="end"
            onClick={() => openChat(c.id)}
          >
            {c.title}
          </Button>
          <span>
            {new Date(c.updatedAt).toLocaleDateString()} · {c.messages.length}{" "}
            messages{c.busy ? " · Replying" : ""}
          </span>
        </div>
      ))}
    </div>
  );
}
